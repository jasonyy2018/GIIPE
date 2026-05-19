/**
 * Offline Service
 * Manages offline functionality, service worker registration, and offline-first data sync
 */

export interface OfflineConfig {
  enableServiceWorker: boolean;
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  maxOfflineActions: number;
}

export interface OfflineAction {
  id: string;
  type: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface OfflineStatus {
  isOnline: boolean;
  serviceWorkerReady: boolean;
  pendingActions: number;
  lastSync: Date | null;
  cacheSize: number;
}

class OfflineService {
  private config: OfflineConfig = {
    enableServiceWorker: true,
    enableBackgroundSync: true,
    enablePushNotifications: false,
    cacheStrategy: 'stale-while-revalidate',
    maxOfflineActions: 100
  };

  private isOnline = navigator.onLine;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private pendingActions: OfflineAction[] = [];
  private subscribers: ((status: OfflineStatus) => void)[] = [];
  private syncInProgress = false;

  constructor(config?: Partial<OfflineConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initialize();
  }

  /**
   * Initialize offline service
   */
  private async initialize(): Promise<void> {
    // Load pending actions from storage
    this.loadPendingActions();

    // Set up online/offline listeners
    this.setupNetworkListeners();

    // Register service worker
    if (this.config.enableServiceWorker && 'serviceWorker' in navigator) {
      await this.registerServiceWorker();
    }

    // Set up message listener for service worker
    this.setupServiceWorkerMessages();

    // Start periodic sync attempts
    this.startPeriodicSync();
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.serviceWorkerRegistration = registration;

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              this.notifyServiceWorkerUpdate();
            }
          });
        }
      });

      console.log('Service Worker registered successfully');
      this.notifyStatusChange();
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Queue action for offline execution
   */
  queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): string {
    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateActionId(),
      timestamp: Date.now(),
      retries: 0,
      maxRetries: action.maxRetries || 3
    };

    this.pendingActions.push(offlineAction);
    this.savePendingActions();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingActions();
    }

    this.notifyStatusChange();
    return offlineAction.id;
  }

  /**
   * Get offline status
   */
  getStatus(): OfflineStatus {
    return {
      isOnline: this.isOnline,
      serviceWorkerReady: !!this.serviceWorkerRegistration,
      pendingActions: this.pendingActions.length,
      lastSync: this.getLastSyncTime(),
      cacheSize: this.getCacheSize()
    };
  }

  /**
   * Subscribe to status changes
   */
  subscribe(callback: (status: OfflineStatus) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Manually trigger sync
   */
  async sync(): Promise<boolean> {
    if (!this.isOnline) {
      return false;
    }

    return this.syncPendingActions();
  }

  /**
   * Clear all pending actions
   */
  clearPendingActions(): void {
    this.pendingActions = [];
    this.savePendingActions();
    this.notifyStatusChange();
  }

  /**
   * Get cached data for offline use
   */
  async getCachedData(key: string): Promise<any> {
    if (!this.serviceWorkerRegistration) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.serviceWorkerRegistration!.active?.postMessage(
        { type: 'GET_CACHED_DATA', key },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Cache data for offline use
   */
  async cacheData(key: string, data: any): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      return;
    }

    this.serviceWorkerRegistration.active?.postMessage({
      type: 'CACHE_DATA',
      key,
      data
    });
  }

  /**
   * Enable/disable background sync
   */
  setBackgroundSync(enabled: boolean): void {
    this.config.enableBackgroundSync = enabled;
    
    if (enabled && this.serviceWorkerRegistration) {
      this.registerBackgroundSync();
    }
  }

  /**
   * Update service worker
   */
  async updateServiceWorker(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      return;
    }

    const registration = await this.serviceWorkerRegistration.update();
    
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Network: Online');
      this.syncPendingActions();
      this.notifyStatusChange();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Network: Offline');
      this.notifyStatusChange();
    });
  }

  private setupServiceWorkerMessages(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;

        switch (type) {
          case 'SYNC_COMPLETE':
            this.handleSyncComplete(data);
            break;
          
          case 'CACHE_UPDATED':
            this.handleCacheUpdate(data);
            break;
          
          case 'OFFLINE_FALLBACK':
            this.handleOfflineFallback(data);
            break;
        }
      });
    }
  }

  private async syncPendingActions(): Promise<boolean> {
    if (this.syncInProgress || !this.isOnline || this.pendingActions.length === 0) {
      return false;
    }

    this.syncInProgress = true;
    let allSuccessful = true;

    try {
      // Process actions in batches
      const batchSize = 5;
      const batches = this.createBatches(this.pendingActions, batchSize);

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(action => this.executeAction(action))
        );

        // Process results
        results.forEach((result, index) => {
          const action = batch[index];
          
          if (result.status === 'fulfilled') {
            // Remove successful action
            this.removePendingAction(action.id);
          } else {
            // Increment retry count
            action.retries++;
            
            if (action.retries >= action.maxRetries) {
              // Remove failed action after max retries
              this.removePendingAction(action.id);
              console.error(`Action ${action.id} failed after ${action.maxRetries} retries`);
            }
            
            allSuccessful = false;
          }
        });
      }

      this.savePendingActions();
      this.setLastSyncTime(new Date());
      
    } catch (error) {
      console.error('Sync failed:', error);
      allSuccessful = false;
    } finally {
      this.syncInProgress = false;
      this.notifyStatusChange();
    }

    return allSuccessful;
  }

  private async executeAction(action: OfflineAction): Promise<any> {
    const { endpoint, method, data } = action;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(endpoint, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private removePendingAction(actionId: string): void {
    const index = this.pendingActions.findIndex(action => action.id === actionId);
    if (index > -1) {
      this.pendingActions.splice(index, 1);
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadPendingActions(): void {
    try {
      const stored = localStorage.getItem('offline-pending-actions');
      if (stored) {
        this.pendingActions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error);
      this.pendingActions = [];
    }
  }

  private savePendingActions(): void {
    try {
      // Limit the number of stored actions
      const actionsToStore = this.pendingActions.slice(-this.config.maxOfflineActions);
      localStorage.setItem('offline-pending-actions', JSON.stringify(actionsToStore));
    } catch (error) {
      console.error('Failed to save pending actions:', error);
    }
  }

  private getLastSyncTime(): Date | null {
    try {
      const stored = localStorage.getItem('offline-last-sync');
      return stored ? new Date(stored) : null;
    } catch {
      return null;
    }
  }

  private setLastSyncTime(date: Date): void {
    try {
      localStorage.setItem('offline-last-sync', date.toISOString());
    } catch (error) {
      console.error('Failed to save last sync time:', error);
    }
  }

  private getCacheSize(): number {
    // This would need to be implemented based on your caching strategy
    // For now, return an estimate
    try {
      const estimate = JSON.stringify(localStorage).length;
      return estimate;
    } catch {
      return 0;
    }
  }

  private startPeriodicSync(): void {
    // Attempt sync every 30 seconds when online
    setInterval(() => {
      if (this.isOnline && this.pendingActions.length > 0) {
        this.syncPendingActions();
      }
    }, 30000);
  }

  private async registerBackgroundSync(): Promise<void> {
    if (!this.config.enableBackgroundSync || !this.serviceWorkerRegistration) {
      return;
    }

    try {
      const syncManager = (this.serviceWorkerRegistration as any).sync;
      if (syncManager) {
        await syncManager.register('background-sync');
      }
      console.log('Background sync registered');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.subscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Status subscriber error:', error);
      }
    });
  }

  private notifyServiceWorkerUpdate(): void {
    // Notify the application that a new service worker is available
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  private handleSyncComplete(data: any): void {
    console.log('Background sync completed:', data);
    this.notifyStatusChange();
  }

  private handleCacheUpdate(data: any): void {
    console.log('Cache updated:', data);
    // Could trigger UI updates here
  }

  private handleOfflineFallback(data: any): void {
    console.log('Offline fallback triggered:', data);
    // Could show offline indicators here
  }
}

export const offlineService = new OfflineService();