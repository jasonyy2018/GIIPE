import { Notification } from '@/types/notification';

export interface WebSocketMessage {
  type: 'notification' | 'update' | 'ping' | 'pong' | 'error';
  data?: any;
  timestamp?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isManuallyDisconnected = false;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: config.url || this.getWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000
    };
  }

  private getWebSocketUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return baseUrl.replace('http', 'ws') + '/ws';
  }

  // Connect to WebSocket
  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for current connection attempt
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
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
        const wsUrl = `${this.config.url}/notifications/${userId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (!this.isManuallyDisconnected && this.shouldReconnect()) {
            this.scheduleReconnect(userId);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            this.ws?.close();
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
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  // Subscribe to message type
  subscribe(messageType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }
    
    this.listeners.get(messageType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(messageType);
      if (typeListeners) {
        typeListeners.delete(callback);
        if (typeListeners.size === 0) {
          this.listeners.delete(messageType);
        }
      }
    };
  }

  // Send message
  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  // Get connection status
  getStatus(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (this.isConnecting) return 'connecting';
    
    switch (this.ws?.readyState) {
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'closed';
    }
  }

  // Private methods
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle heartbeat
      if (message.type === 'ping') {
        this.send({ type: 'pong' });
        return;
      }

      // Notify listeners
      const typeListeners = this.listeners.get(message.type);
      if (typeListeners) {
        typeListeners.forEach(callback => {
          try {
            callback(message.data);
          } catch (error) {
            console.error('Error in WebSocket message callback:', error);
          }
        });
      }

      // Notify all listeners
      const allListeners = this.listeners.get('*');
      if (allListeners) {
        allListeners.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in WebSocket wildcard callback:', error);
          }
        });
      }

    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.config.maxReconnectAttempts;
  }

  private scheduleReconnect(userId: string): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      
      this.connect(userId).catch(error => {
        console.error('Reconnect failed:', error);
        
        if (this.shouldReconnect()) {
          this.scheduleReconnect(userId);
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
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
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
export const webSocketService = new WebSocketService();
export default webSocketService;