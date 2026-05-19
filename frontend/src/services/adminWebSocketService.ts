import { io, Socket } from 'socket.io-client';

export interface AdminWebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  namespace: string;
}

export interface SystemMetrics {
  timestamp: Date;
  activeUsers: number;
  systemLoad: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'security';
  message: string;
  timestamp: Date;
  resolved: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
}

export interface ActivityUpdate {
  id: string;
  action: string;
  resource: string;
  user: string;
  timestamp: Date;
  details?: any;
}

export interface SecurityAlertNotification {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  acknowledged: boolean;
  resolved: boolean;
  escalated: boolean;
  escalationLevel: number;
  createdAt: Date;
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    id: string;
    label: string;
    action: string;
  }>;
}

class AdminWebSocketService {
  private socket: Socket | null = null;
  private config: AdminWebSocketConfig;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isManuallyDisconnected = false;
  private subscriptions = new Set<string>();

  constructor(config: Partial<AdminWebSocketConfig> = {}) {
    this.config = {
      url: config.url || this.getWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      namespace: config.namespace || '/admin'
    };
  }

  private getWebSocketUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return baseUrl;
  }

  // Connect to WebSocket with authentication
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for current connection attempt
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
        return;
      }

      this.isConnecting = true;
      this.isManuallyDisconnected = false;

      try {
        this.socket = io(`${this.config.url}${this.config.namespace}`, {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'], // Fallback support
          reconnection: false, // We handle reconnection manually
          timeout: 10000,
        });

        this.socket.on('connect', () => {
          console.log('Admin WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        });

        this.socket.on('connected', (data) => {
          console.log('Admin WebSocket authenticated:', data);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Admin WebSocket disconnected:', reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (!this.isManuallyDisconnected && this.shouldReconnect()) {
            this.scheduleReconnect(token);
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('Admin WebSocket connection error:', error);
          this.isConnecting = false;
          reject(error);
        });

        this.socket.on('error', (error) => {
          console.error('Admin WebSocket error:', error);
          this.notifyListeners('error', error);
        });

        this.socket.on('timeout', (data) => {
          console.warn('Admin WebSocket timeout:', data);
          this.disconnect();
        });

        this.socket.on('server-shutdown', (data) => {
          console.warn('Server shutting down:', data);
          this.disconnect();
        });

        // Set up event listeners for real-time updates
        this.setupEventListeners();

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            this.socket?.disconnect();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Disconnect WebSocket
  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.subscriptions.clear();
  }

  // Subscribe to a room/topic
  subscribe(room: string, filters?: any): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(false);
        return;
      }

      this.socket.emit('subscribe', { room, filters }, (response: any) => {
        if (response.status === 'subscribed') {
          this.subscriptions.add(room);
          console.log(`Subscribed to room: ${room}`);
          resolve(true);
        } else {
          console.error(`Failed to subscribe to room ${room}:`, response.message);
          resolve(false);
        }
      });
    });
  }

  // Unsubscribe from a room/topic
  unsubscribe(room: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(false);
        return;
      }

      this.socket.emit('unsubscribe', { room }, (response: any) => {
        if (response.status === 'unsubscribed') {
          this.subscriptions.delete(room);
          console.log(`Unsubscribed from room: ${room}`);
          resolve(true);
        } else {
          console.error(`Failed to unsubscribe from room ${room}:`, response.message);
          resolve(false);
        }
      });
    });
  }

  // Subscribe to event type
  on(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(eventType);
      if (typeListeners) {
        typeListeners.delete(callback);
        if (typeListeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  // Get connection status
  getStatus(): 'connecting' | 'connected' | 'disconnected' {
    if (this.isConnecting) return 'connecting';
    return this.socket?.connected ? 'connected' : 'disconnected';
  }

  // Get current subscriptions
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  // Private methods
  private setupEventListeners(): void {
    if (!this.socket) return;

    // System metrics
    this.socket.on('metrics-update', (data: SystemMetrics) => {
      this.notifyListeners('metrics-update', data);
    });

    // System alerts
    this.socket.on('system-alert', (data: SystemAlert) => {
      this.notifyListeners('system-alert', data);
    });

    // Activity updates
    this.socket.on('activity-update', (data: ActivityUpdate) => {
      this.notifyListeners('activity-update', data);
    });

    // Security alerts
    this.socket.on('security-alert', (data: SecurityAlertNotification) => {
      this.notifyListeners('security-alert', data);
    });

    this.socket.on('security-alert-update', (data: any) => {
      this.notifyListeners('security-alert-update', data);
    });

    // Notifications
    this.socket.on('notification', (data: NotificationData) => {
      this.notifyListeners('notification', data);
    });

    // System status
    this.socket.on('system-status', (data: any) => {
      this.notifyListeners('system-status', data);
    });

    // Heartbeat
    this.socket.on('heartbeat-ack', (data: any) => {
      // Handle heartbeat acknowledgment
    });
  }

  private notifyListeners(eventType: string, data: any): void {
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      typeListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event callback for ${eventType}:`, error);
        }
      });
    }

    // Notify wildcard listeners
    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach(callback => {
        try {
          callback({ type: eventType, data });
        } catch (error) {
          console.error('Error in WebSocket wildcard callback:', error);
        }
      });
    }
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.config.maxReconnectAttempts;
  }

  private scheduleReconnect(token: string): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      
      this.connect(token).catch(error => {
        console.error('Reconnect failed:', error);
        
        if (this.shouldReconnect()) {
          this.scheduleReconnect(token);
        } else {
          console.error('Max reconnect attempts reached');
        }
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// Singleton instance
export const adminWebSocketService = new AdminWebSocketService();
export default adminWebSocketService;