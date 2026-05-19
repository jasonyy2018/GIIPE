import { Notification } from '@/types/notification';

export interface QueuedNotification extends Notification {
  queuedAt: Date;
  attempts: number;
  nextRetry?: Date;
}

export interface NotificationBatch {
  id: string;
  notifications: QueuedNotification[];
  createdAt: Date;
  scheduledFor?: Date;
}

export interface QueueConfig {
  batchSize: number;
  batchTimeout: number; // ms
  maxRetries: number;
  retryDelay: number; // ms
  priorityThreshold: number; // high priority notifications bypass batching
}

class NotificationQueueService {
  private queue: QueuedNotification[] = [];
  private batches: Map<string, NotificationBatch> = new Map();
  private config: QueueConfig;
  private batchTimer: NodeJS.Timeout | null = null;
  private processingTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(notifications: QueuedNotification[]) => void> = new Set();
  private batchListeners: Set<(batch: NotificationBatch) => void> = new Set();

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      batchSize: config.batchSize || 5,
      batchTimeout: config.batchTimeout || 2000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,
      priorityThreshold: config.priorityThreshold || 1 // 0=low, 1=normal, 2=high
    };

    this.startProcessing();
  }

  // Add notification to queue
  enqueue(notification: Notification): void {
    const queuedNotification: QueuedNotification = {
      ...notification,
      queuedAt: new Date(),
      attempts: 0
    };

    // High priority notifications bypass batching
    if (this.getPriorityLevel(notification.priority) >= this.config.priorityThreshold) {
      this.processImmediately(queuedNotification);
      return;
    }

    this.queue.push(queuedNotification);
    this.notifyListeners();
    this.scheduleBatch();
  }

  // Add multiple notifications
  enqueueBatch(notifications: Notification[]): void {
    notifications.forEach(notification => this.enqueue(notification));
  }

  // Get current queue status
  getQueueStatus(): {
    queueLength: number;
    batchCount: number;
    oldestNotification?: Date;
  } {
    return {
      queueLength: this.queue.length,
      batchCount: this.batches.size,
      oldestNotification: this.queue.length > 0 ? this.queue[0].queuedAt : undefined
    };
  }

  // Subscribe to queue changes
  subscribe(callback: (notifications: QueuedNotification[]) => void): () => void {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Subscribe to batch processing
  subscribeToBatches(callback: (batch: NotificationBatch) => void): () => void {
    this.batchListeners.add(callback);
    
    return () => {
      this.batchListeners.delete(callback);
    };
  }

  // Clear queue
  clear(): void {
    this.queue = [];
    this.batches.clear();
    this.clearBatchTimer();
    this.notifyListeners();
  }

  // Retry failed notifications
  retryFailed(): void {
    const now = new Date();
    const retryableNotifications = Array.from(this.batches.values())
      .flatMap(batch => batch.notifications)
      .filter(notification => 
        notification.attempts > 0 && 
        notification.attempts < this.config.maxRetries &&
        (!notification.nextRetry || notification.nextRetry <= now)
      );

    retryableNotifications.forEach(notification => {
      // Remove from current batch
      for (const [batchId, batch] of Array.from(this.batches.entries())) {
        const index = batch.notifications.findIndex(n => n.id === notification.id);
        if (index !== -1) {
          batch.notifications.splice(index, 1);
          if (batch.notifications.length === 0) {
            this.batches.delete(batchId);
          }
          break;
        }
      }

      // Reset and re-queue
      notification.attempts = 0;
      delete notification.nextRetry;
      this.queue.push(notification);
    });

    if (retryableNotifications.length > 0) {
      this.notifyListeners();
      this.scheduleBatch();
    }
  }

  // Private methods
  private getPriorityLevel(priority: string): number {
    switch (priority) {
      case 'high': return 2;
      case 'normal': return 1;
      case 'low': return 0;
      default: return 1;
    }
  }

  private processImmediately(notification: QueuedNotification): void {
    const batch: NotificationBatch = {
      id: `immediate-${Date.now()}-${Math.random()}`,
      notifications: [notification],
      createdAt: new Date()
    };

    this.processBatch(batch);
  }

  private scheduleBatch(): void {
    if (this.batchTimer || this.queue.length === 0) return;

    // Check if we should create a batch immediately
    if (this.queue.length >= this.config.batchSize) {
      this.createBatch();
      return;
    }

    // Schedule batch creation
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      if (this.queue.length > 0) {
        this.createBatch();
      }
    }, this.config.batchTimeout);
  }

  private createBatch(): void {
    if (this.queue.length === 0) return;

    const batchNotifications = this.queue.splice(0, this.config.batchSize);
    const batch: NotificationBatch = {
      id: `batch-${Date.now()}-${Math.random()}`,
      notifications: batchNotifications,
      createdAt: new Date()
    };

    this.batches.set(batch.id, batch);
    this.processBatch(batch);
    this.notifyListeners();

    // Schedule next batch if queue is not empty
    if (this.queue.length > 0) {
      this.scheduleBatch();
    }
  }

  private processBatch(batch: NotificationBatch): void {
    // Notify batch listeners
    this.batchListeners.forEach(listener => {
      try {
        listener(batch);
      } catch (error) {
        console.error('Error in batch listener:', error);
      }
    });

    // Simulate processing (in real app, this would send to server/display)
    batch.notifications.forEach(notification => {
      notification.attempts++;
      
      // Simulate random failures for demonstration
      const success = Math.random() > 0.1; // 90% success rate
      
      if (!success && notification.attempts < this.config.maxRetries) {
        // Schedule retry
        notification.nextRetry = new Date(Date.now() + this.config.retryDelay);
        console.log(`Notification ${notification.id} failed, scheduling retry`);
      } else if (success) {
        // Remove from batch on success
        const batchIndex = batch.notifications.findIndex(n => n.id === notification.id);
        if (batchIndex !== -1) {
          batch.notifications.splice(batchIndex, 1);
        }
        
        console.log(`Notification ${notification.id} processed successfully`);
      } else {
        // Max retries reached
        console.error(`Notification ${notification.id} failed permanently after ${notification.attempts} attempts`);
      }
    });

    // Clean up empty batches
    if (batch.notifications.length === 0) {
      this.batches.delete(batch.id);
    }
  }

  private startProcessing(): void {
    // Process retries every 10 seconds
    this.processingTimer = setInterval(() => {
      this.retryFailed();
    }, 10000);
  }

  private clearBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.queue]);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  // Cleanup
  destroy(): void {
    this.clearBatchTimer();
    
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    
    this.listeners.clear();
    this.batchListeners.clear();
    this.queue = [];
    this.batches.clear();
  }
}

// Singleton instance
export const notificationQueueService = new NotificationQueueService();
export default notificationQueueService;