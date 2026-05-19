/**
 * Data Synchronization Service
 * Handles efficient data synchronization with conflict resolution and offline support
 */

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  data: any;
  timestamp: Date;
  userId: string;
  version?: number;
  dependencies?: string[];
}

export interface SyncConflict {
  operation: SyncOperation;
  serverData: any;
  clientData: any;
  conflictType: 'version' | 'concurrent' | 'dependency';
}

export interface SyncResult {
  success: boolean;
  conflicts: SyncConflict[];
  appliedOperations: SyncOperation[];
  failedOperations: SyncOperation[];
}

export interface SyncStrategy {
  conflictResolution: 'client-wins' | 'server-wins' | 'merge' | 'manual';
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
}

class DataSynchronizationService {
  private pendingOperations: SyncOperation[] = [];
  private syncInProgress = false;
  private lastSyncTimestamp: Date | null = null;
  private syncStrategy: SyncStrategy = {
    conflictResolution: 'server-wins',
    batchSize: 10,
    retryAttempts: 3,
    retryDelay: 1000
  };
  private subscribers: ((result: SyncResult) => void)[] = [];
  private conflictResolvers = new Map<string, (conflict: SyncConflict) => Promise<any>>();

  private loadPendingOperations(): void {
    try {
      const stored = localStorage.getItem('pendingOperations');
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load pending operations:', error);
      this.pendingOperations = [];
    }
  }

  private initializeAutoSync(): void {
    // Load persisted operations
    this.loadPendingOperations();

    // Auto-sync every 30 seconds when online
    setInterval(() => {
      if (navigator.onLine && this.pendingOperations.length > 0) {
        this.sync();
      }
    }, 30000);
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      // Sync when coming back online
      if (this.pendingOperations.length > 0) {
        this.sync();
      }
    });
  }

  constructor() {
    this.initializeAutoSync();
    this.setupOnlineListener();
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private isCriticalOperation(operation: SyncOperation): boolean {
    // Define critical operations that need immediate sync
    const criticalEntities = ['user', 'security', 'payment'];
    return criticalEntities.includes(operation.entity);
  }

  private persistPendingOperations(): void {
    try {
      localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Failed to persist pending operations:', error);
    }
  }

  private notifySubscribers(result: SyncResult): void {
    this.subscribers.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Sync subscriber error:', error);
      }
    });
  }

  private async fetchServerChanges(): Promise<any[]> {
    const since = this.lastSyncTimestamp?.toISOString() || new Date(0).toISOString();
    
    const response = await fetch('', { // TODO: Add endpoint URL
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch server changes: ${response.statusText}`);
    }

    return response.json();
  }

  private detectConflict(serverChange: any): SyncConflict | null {
    // Check if any pending operation conflicts with server change
    const conflictingOp = this.pendingOperations.find(
      op => op.entity === serverChange.entity && op.entityId === serverChange.entityId
    );

    if (!conflictingOp) return null;

    return {
      operation: conflictingOp,
      serverData: serverChange.data,
      clientData: conflictingOp.data,
      conflictType: this.determineConflictType(conflictingOp, serverChange)
    };
  }

  private determineConflictType(clientOp: SyncOperation, serverChange: any): 'version' | 'concurrent' | 'dependency' {
    // Check for version conflicts
    if (clientOp.version && serverChange.version && clientOp.version !== serverChange.version) {
      return 'version';
    }

    // Check for dependency conflicts
    if (clientOp.dependencies?.some(dep => !this.hasDependency(dep))) {
      return 'dependency';
    }

    // Default to concurrent modification
    return 'concurrent';
  }

  private async resolveConflict(conflict: SyncConflict): Promise<any> {
    const { operation } = conflict;
    
    // Try custom resolver first
    const resolver = this.conflictResolvers.get(operation.entity);
    if (resolver) {
      return await resolver(conflict);
    }

    // Fall back to strategy-based resolution
    switch (this.syncStrategy.conflictResolution) {
      case 'client-wins':
        return conflict.clientData;
      
      case 'server-wins':
        return conflict.serverData;
      
      case 'merge':
        return this.mergeData(conflict.clientData, conflict.serverData);
      
      case 'manual':
        // Queue for manual resolution
        return null;
      
      default:
        return conflict.serverData;
    }
  }

  private mergeData(clientData: any, serverData: any): any {
    // Simple merge strategy - can be enhanced based on data structure
    if (typeof clientData === 'object' && typeof serverData === 'object') {
      return { ...serverData, ...clientData };
    }
    
    // For non-objects, prefer server data
    return serverData;
  }

  private async applyChange(change: any): Promise<void> {
    // Apply change to local data store
    // This would integrate with your local state management
    console.log('Applying change:', change);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private hasDependency(dependencyId: string): boolean {
    // Check if dependency exists in local store
    // This would integrate with your data store
    return true; // Placeholder
  }

  private async applyServerChanges(changes: any[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      conflicts: [],
      appliedOperations: [],
      failedOperations: []
    };

    for (const change of changes) {
      try {
        // Check for conflicts with pending operations
        const conflict = this.detectConflict(change);
        
        if (conflict) {
          result.conflicts.push(conflict);
          
          // Try to resolve conflict
          const resolved = await this.resolveConflict(conflict);
          if (resolved) {
            await this.applyChange(resolved);
            result.appliedOperations.push(change);
          } else {
            result.failedOperations.push(change);
          }
        } else {
          await this.applyChange(change);
          result.appliedOperations.push(change);
        }
      } catch (error) {
        console.error('Failed to apply server change:', error);
        result.failedOperations.push(change);
      }
    }

    return result;
  }

  private async sendPendingOperations(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      conflicts: [],
      appliedOperations: [],
      failedOperations: []
    };

    if (this.pendingOperations.length === 0) {
      return result;
    }

    // Send in batches
    const batches = this.createBatches(this.pendingOperations, this.syncStrategy.batchSize);

    for (const batch of batches) {
      try {
        const response = await fetch('', { // TODO: Add endpoint URL
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch)
        });

        if (!response.ok) {
          throw new Error(`Failed to send operations: ${response.statusText}`);
        }

        const serverResult = await response.json();
        result.appliedOperations.push(...batch);
        this.pendingOperations = this.pendingOperations.filter(
          op => !batch.some(b => b.id === op.id)
        );
      } catch (error) {
        console.error('Failed to send batch:', error);
        result.failedOperations.push(...batch);
      }
    }

    this.persistPendingOperations();
    return result;
  }

  /**
   * Queue a sync operation
   */
  queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp'>): string {
    const syncOperation: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: new Date()
    };

    this.pendingOperations.push(syncOperation);
    this.persistPendingOperations();

    // Trigger immediate sync for critical operations
    if (this.isCriticalOperation(syncOperation)) {
      this.sync();
    }

    return syncOperation.id;
  }

  /**
   * Perform synchronization
   */
  async sync(force = false): Promise<SyncResult> {
    if (this.syncInProgress && !force) {
      return { success: false, conflicts: [], appliedOperations: [], failedOperations: [] };
    }

    this.syncInProgress = true;

    try {
      // Get server changes since last sync
      const serverChanges = await this.fetchServerChanges();
      
      // Apply server changes first
      const serverResult = await this.applyServerChanges(serverChanges);
      
      // Send pending operations to server
      const clientResult = await this.sendPendingOperations();

      const result: SyncResult = {
        success: serverResult.success && clientResult.success,
        conflicts: [...serverResult.conflicts, ...clientResult.conflicts],
        appliedOperations: [...serverResult.appliedOperations, ...clientResult.appliedOperations],
        failedOperations: [...serverResult.failedOperations, ...clientResult.failedOperations]
      };

      this.lastSyncTimestamp = new Date();
      this.notifySubscribers(result);

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      return { 
        success: false, 
        conflicts: [], 
        appliedOperations: [], 
        failedOperations: this.pendingOperations 
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Register conflict resolver for specific entity type
   */
  registerConflictResolver(
    entityType: string, 
    resolver: (conflict: SyncConflict) => Promise<any>
  ): void {
    this.conflictResolvers.set(entityType, resolver);
  }

  /**
   * Subscribe to sync results
   */
  subscribe(callback: (result: SyncResult) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      inProgress: this.syncInProgress,
      pendingOperations: this.pendingOperations.length,
      lastSync: this.lastSyncTimestamp,
      isOnline: navigator.onLine
    };
  }

  /**
   * Update sync strategy
   */
  updateStrategy(strategy: Partial<SyncStrategy>): void {
    this.syncStrategy = { ...this.syncStrategy, ...strategy };
  }

  /**
   * Clear pending operations (use with caution)
   */
  clearPendingOperations(): void {
    this.pendingOperations = [];
    this.persistPendingOperations();
  }
}

export const dataSynchronizationService = new DataSynchronizationService();