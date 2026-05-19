import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

interface SystemMetrics {
  timestamp: Date;
  activeUsers: number;
  systemLoad: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'security';
  message: string;
  timestamp: Date;
  resolved: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
}

interface SecurityAlertNotification {
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

interface ActivityUpdate {
  id: string;
  action: string;
  resource: string;
  user: string;
  timestamp: Date;
}

interface ConnectedClient {
  socket: Socket;
  userId: string;
  userRole: UserRole;
  connectedAt: Date;
  lastHeartbeat: Date;
  subscriptions: Set<string>;
}

interface RoomSubscription {
  room: string;
  clientId: string;
  subscribedAt: Date;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/admin',
  transports: ['websocket', 'polling'], // Fallback support
})
export class AdminRealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminRealtimeGateway.name);
  private connectedClients = new Map<string, ConnectedClient>();
  private roomSubscriptions = new Map<string, Set<string>>(); // room -> set of client IDs
  private metricsInterval: NodeJS.Timeout;
  private heartbeatInterval: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds

  constructor(
    private jwtService: JwtService,
    private prismaService: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Admin WebSocket Gateway initialized');
    this.startMetricsUpdates();
    this.startHeartbeatMonitoring();
  }

  async handleConnection(client: Socket) {
    try {
      // Authenticate the connection
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided for client ${client.id}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, email: true }
      });

      if (!user || user.role !== UserRole.ADMIN) {
        this.logger.warn(`Connection rejected: Invalid user or insufficient permissions for client ${client.id}`);
        client.emit('error', { message: 'Insufficient permissions' });
        client.disconnect();
        return;
      }

      // Store client connection info
      const connectedClient: ConnectedClient = {
        socket: client,
        userId: user.id,
        userRole: user.role,
        connectedAt: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: new Set(),
      };

      this.connectedClients.set(client.id, connectedClient);
      this.logger.log(`Admin client connected: ${client.id} (User: ${user.email})`);
      
      // Send initial system status
      await this.sendSystemStatus(client);
      
      // Send connection confirmation
      client.emit('connected', {
        clientId: client.id,
        userId: user.id,
        connectedAt: connectedClient.connectedAt,
      });

    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const connectedClient = this.connectedClients.get(client.id);
    if (connectedClient) {
      // Clean up room subscriptions
      connectedClient.subscriptions.forEach(room => {
        this.unsubscribeFromRoom(client.id, room);
      });
      
      this.connectedClients.delete(client.id);
      this.logger.log(`Admin client disconnected: ${client.id} (User: ${connectedClient.userId})`);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; filters?: any }
  ) {
    const { room, filters } = data;
    
    if (!this.isValidRoom(room)) {
      return { status: 'error', message: 'Invalid room name' };
    }

    const success = this.subscribeToRoom(client.id, room, filters);
    if (success) {
      this.logger.log(`Client ${client.id} subscribed to ${room}`);
      return { status: 'subscribed', room, timestamp: new Date() };
    } else {
      return { status: 'error', message: 'Subscription failed' };
    }
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string }
  ) {
    const { room } = data;
    const success = this.unsubscribeFromRoom(client.id, room);
    
    if (success) {
      this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
      return { status: 'unsubscribed', room, timestamp: new Date() };
    } else {
      return { status: 'error', message: 'Unsubscription failed' };
    }
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    const connectedClient = this.connectedClients.get(client.id);
    if (connectedClient) {
      connectedClient.lastHeartbeat = new Date();
      client.emit('heartbeat-ack', { timestamp: new Date() });
    }
  }

  @SubscribeMessage('get-subscriptions')
  handleGetSubscriptions(@ConnectedSocket() client: Socket) {
    const connectedClient = this.connectedClients.get(client.id);
    if (connectedClient) {
      return {
        subscriptions: Array.from(connectedClient.subscriptions),
        timestamp: new Date()
      };
    }
    return { subscriptions: [], timestamp: new Date() };
  }

  // Room management methods
  private isValidRoom(room: string): boolean {
    const validRooms = [
      'metrics',
      'alerts', 
      'activity',
      'security-alerts',
      'notifications',
      'user-activity',
      'system-health',
      'moderation-queue',
      'analytics'
    ];
    return validRooms.includes(room);
  }

  private subscribeToRoom(clientId: string, room: string, filters?: any): boolean {
    const connectedClient = this.connectedClients.get(clientId);
    if (!connectedClient) return false;

    try {
      // Join the socket.io room
      connectedClient.socket.join(room);
      
      // Track subscription
      connectedClient.subscriptions.add(room);
      
      // Track room subscriptions
      if (!this.roomSubscriptions.has(room)) {
        this.roomSubscriptions.set(room, new Set());
      }
      this.roomSubscriptions.get(room)!.add(clientId);

      // Send initial data for the room
      this.sendInitialRoomData(connectedClient.socket, room);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to subscribe client ${clientId} to room ${room}:`, error);
      return false;
    }
  }

  private unsubscribeFromRoom(clientId: string, room: string): boolean {
    const connectedClient = this.connectedClients.get(clientId);
    if (!connectedClient) return false;

    try {
      // Leave the socket.io room
      connectedClient.socket.leave(room);
      
      // Remove from tracking
      connectedClient.subscriptions.delete(room);
      
      // Remove from room subscriptions
      const roomClients = this.roomSubscriptions.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
        if (roomClients.size === 0) {
          this.roomSubscriptions.delete(room);
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe client ${clientId} from room ${room}:`, error);
      return false;
    }
  }

  private async sendInitialRoomData(socket: Socket, room: string) {
    try {
      switch (room) {
        case 'metrics':
          socket.emit('metrics-update', this.generateMockMetrics());
          break;
        case 'system-health':
          await this.sendSystemStatus(socket);
          break;
        case 'activity':
          // Send recent activity
          socket.emit('activity-initial', { activities: [] });
          break;
        // Add more cases as needed
      }
    } catch (error) {
      this.logger.error(`Failed to send initial data for room ${room}:`, error);
    }
  }

  // Enhanced broadcasting methods
  broadcastToRoom(room: string, event: string, data: any, filters?: any) {
    if (filters) {
      // Apply filters to determine which clients should receive the message
      const roomClients = this.roomSubscriptions.get(room);
      if (roomClients) {
        roomClients.forEach(clientId => {
          const client = this.connectedClients.get(clientId);
          if (client && this.shouldReceiveMessage(client, filters)) {
            client.socket.emit(event, data);
          }
        });
      }
    } else {
      this.server.to(room).emit(event, data);
    }
  }

  private shouldReceiveMessage(client: ConnectedClient, filters: any): boolean {
    // Implement filtering logic based on user role, preferences, etc.
    return true; // For now, send to all clients
  }

  // Public methods for broadcasting updates
  broadcastMetricsUpdate(metrics: SystemMetrics) {
    this.broadcastToRoom('metrics', 'metrics-update', metrics);
  }

  broadcastSystemAlert(alert: SystemAlert) {
    this.broadcastToRoom('alerts', 'system-alert', alert);
  }

  broadcastActivityUpdate(activity: ActivityUpdate) {
    this.broadcastToRoom('activity', 'activity-update', activity);
  }

  broadcastSystemStatus(status: any) {
    this.server.emit('system-status', status);
  }

  broadcastSecurityAlert(alert: SecurityAlertNotification) {
    this.broadcastToRoom('security-alerts', 'security-alert', alert);
    
    // Also broadcast as system alert for general awareness
    this.broadcastSystemAlert({
      id: alert.id,
      type: 'security',
      message: `${alert.title}: ${alert.description}`,
      timestamp: alert.createdAt,
      resolved: alert.resolved,
      severity: alert.severity,
      source: 'security-system',
    });
  }

  broadcastSecurityAlertUpdate(alertId: string, update: Partial<SecurityAlertNotification>) {
    this.broadcastToRoom('security-alerts', 'security-alert-update', { alertId, ...update });
  }

  broadcastNotification(notification: any) {
    this.broadcastToRoom('notifications', 'notification', notification);
  }

  private startMetricsUpdates() {
    // Send metrics updates every 5 seconds
    this.metricsInterval = setInterval(() => {
      const metrics: SystemMetrics = this.generateMockMetrics();
      this.broadcastMetricsUpdate(metrics);
    }, 5000);
  }

  private startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      this.checkClientHeartbeats();
    }, this.HEARTBEAT_INTERVAL);
  }

  private checkClientHeartbeats() {
    const now = new Date();
    const clientsToDisconnect: string[] = [];

    this.connectedClients.forEach((client, clientId) => {
      const timeSinceLastHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > this.CONNECTION_TIMEOUT) {
        this.logger.warn(`Client ${clientId} timed out, disconnecting`);
        clientsToDisconnect.push(clientId);
      }
    });

    // Disconnect timed out clients
    clientsToDisconnect.forEach(clientId => {
      const client = this.connectedClients.get(clientId);
      if (client) {
        client.socket.emit('timeout', { message: 'Connection timed out' });
        client.socket.disconnect();
      }
    });
  }

  private async sendSystemStatus(client: Socket) {
    try {
      // Get real system status
      const status = await this.getSystemHealth();
      client.emit('system-status', status);
    } catch (error) {
      this.logger.error('Failed to get system status:', error);
      client.emit('system-status', {
        database: 'unknown',
        redis: 'unknown',
        services: 'unknown',
        timestamp: new Date(),
        error: 'Failed to retrieve system status'
      });
    }
  }

  private async getSystemHealth() {
    try {
      // Check database connection
      await this.prismaService.$queryRaw`SELECT 1`;
      const dbStatus = 'connected';

      // TODO: Add Redis health check when Redis is properly configured
      const redisStatus = 'connected';

      return {
        database: dbStatus,
        redis: redisStatus,
        services: 'healthy',
        connectedClients: this.connectedClients.size,
        activeRooms: this.roomSubscriptions.size,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('System health check failed:', error);
      return {
        database: 'error',
        redis: 'unknown',
        services: 'degraded',
        connectedClients: this.connectedClients.size,
        activeRooms: this.roomSubscriptions.size,
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  private generateMockMetrics(): SystemMetrics {
    return {
      timestamp: new Date(),
      activeUsers: Math.floor(Math.random() * 100) + 50,
      systemLoad: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      responseTime: Math.random() * 500 + 100,
      errorRate: Math.random() * 5,
    };
  }

  // Public methods for external services
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getActiveRooms(): string[] {
    return Array.from(this.roomSubscriptions.keys());
  }

  getRoomSubscriberCount(room: string): number {
    return this.roomSubscriptions.get(room)?.size || 0;
  }

  onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Disconnect all clients gracefully
    this.connectedClients.forEach((client) => {
      client.socket.emit('server-shutdown', { message: 'Server is shutting down' });
      client.socket.disconnect();
    });
  }
}