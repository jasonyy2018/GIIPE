'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

interface SystemHealth {
  database: string;
  redis: string;
  services: string;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  userGrowthRate: number;
}

interface EventMetrics {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  totalRegistrations: number;
}

interface ContentMetrics {
  pendingComments: number;
  flaggedContent: number;
  moderationQueue: number;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

interface ActivityUpdate {
  id: string;
  action: string;
  resource: string;
  user: string;
  timestamp: Date;
}

interface DashboardMetrics {
  systemHealth: SystemHealth;
  userMetrics: UserMetrics;
  eventMetrics: EventMetrics;
  contentMetrics: ContentMetrics;
  systemAlerts: SystemAlert[];
  recentActivity: ActivityUpdate[];
}

interface SystemInfo {
  version: string;
  nodeVersion: string;
  databaseStatus: string;
  redisStatus: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  totalUsers: number;
  totalEvents: number;
  totalRegistrations: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'MEMBER';
  isActive: boolean;
  createdAt: string;
  firstName?: string;
  lastName?: string;
}

interface Event {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  startDate: string;
  registrations: number;
  creator: {
    username: string;
  };
}

interface Comment {
  id: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';
  targetType: 'EVENT' | 'NEWS' | 'SUBMISSION';
  user: {
    username: string;
  };
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  user?: {
    username: string;
    email: string;
  };
  createdAt: string;
  details?: any;
}

interface AdminData {
  systemInfo: SystemInfo | null;
  dashboardMetrics: DashboardMetrics | null;
  users: User[];
  events: Event[];
  comments: Comment[];
  auditLogs: AuditLog[];
}

export function useAdminData(autoRefresh = true, refreshInterval = 30000) {
  const [data, setData] = useState<AdminData>({
    systemInfo: null,
    dashboardMetrics: null,
    users: [],
    events: [],
    comments: [],
    auditLogs: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityUpdate[]>([]);

  // WebSocket connection for real-time updates
  const { state: wsState, on, emit } = useWebSocket(
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    { namespace: '/admin', autoConnect: true }
  );

  const fetchAdminData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch dashboard metrics from the new API endpoint
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [dashboardResponse, systemInfoResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/dashboard-metrics`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/system-info`, { headers })
      ]);

      let dashboardMetrics: DashboardMetrics | null = null;
      let systemInfo: SystemInfo | null = null;

      if (dashboardResponse.ok) {
        dashboardMetrics = await dashboardResponse.json();
      } else {
        // Fallback to mock data if API is not available
        dashboardMetrics = generateMockDashboardMetrics();
      }

      if (systemInfoResponse.ok) {
        systemInfo = await systemInfoResponse.json();
      } else {
        // Fallback to mock data if API is not available
        systemInfo = generateMockSystemInfo();
      }

      // Generate mock data for other sections (users, comments, audit logs) and fetch real events
      const mockUsers = generateMockUsers();
      const realEvents = await fetchRealEvents();
      const mockComments = generateMockComments();
      const mockAuditLogs = generateMockAuditLogs();

      setData({
        systemInfo,
        dashboardMetrics,
        users: mockUsers,
        events: realEvents,
        comments: mockComments,
        auditLogs: mockAuditLogs
      });

      setLastUpdated(new Date());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
      setLoading(false);
    }
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    if (!wsState.connected) return;

    // Subscribe to real-time updates
    emit('subscribe-metrics');
    emit('subscribe-alerts');
    emit('subscribe-activity');

    // Handle real-time metrics updates
    const unsubscribeMetrics = on('metrics-update', (metrics: any) => {
      setRealTimeMetrics(metrics);
    });

    // Handle system alerts
    const unsubscribeAlerts = on('system-alert', (alert: SystemAlert) => {
      setSystemAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    });

    // Handle activity updates
    const unsubscribeActivity = on('activity-update', (activity: ActivityUpdate) => {
      setRecentActivity(prev => [activity, ...prev.slice(0, 9)]); // Keep last 10 activities
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeAlerts();
      unsubscribeActivity();
    };
  }, [wsState.connected, on, emit]);

  const refreshData = useCallback(() => {
    setLoading(true);
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAdminData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAdminData]);

  return {
    ...data,
    loading,
    error,
    lastUpdated,
    refreshData,
    realTimeMetrics,
    systemAlerts,
    recentActivity,
    wsState,
  };
}

// Mock data generation functions
function generateMockDashboardMetrics(): DashboardMetrics {
  return {
    systemHealth: {
      database: Math.random() > 0.1 ? 'connected' : 'disconnected',
      redis: Math.random() > 0.2 ? 'connected' : 'disconnected',
      services: 'healthy',
      uptime: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
      memoryUsage: Math.random() * 100,
      cpuUsage: Math.random() * 100,
    },
    userMetrics: {
      totalUsers: 1284 + Math.floor(Math.random() * 20),
      activeUsers: 856 + Math.floor(Math.random() * 50),
      newUsersToday: Math.floor(Math.random() * 10),
      userGrowthRate: Math.random() * 20 - 5, // -5% to +15%
    },
    eventMetrics: {
      totalEvents: 45 + Math.floor(Math.random() * 5),
      publishedEvents: 32 + Math.floor(Math.random() * 3),
      draftEvents: 8 + Math.floor(Math.random() * 3),
      totalRegistrations: 892 + Math.floor(Math.random() * 50),
    },
    contentMetrics: {
      pendingComments: Math.floor(Math.random() * 15),
      flaggedContent: Math.floor(Math.random() * 5),
      moderationQueue: Math.floor(Math.random() * 20),
    },
    systemAlerts: [],
    recentActivity: [],
  };
}

function generateMockSystemInfo(): SystemInfo {
  return {
    version: '1.0.0',
    nodeVersion: 'v18.17.0',
    databaseStatus: Math.random() > 0.1 ? 'connected' : 'disconnected',
    redisStatus: Math.random() > 0.2 ? 'connected' : 'disconnected',
    uptime: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
    memoryUsage: {
      rss: 134217728 + Math.floor(Math.random() * 67108864),
      heapTotal: 67108864 + Math.floor(Math.random() * 33554432),
      heapUsed: 33554432 + Math.floor(Math.random() * 16777216),
      external: 8388608 + Math.floor(Math.random() * 4194304)
    },
    totalUsers: 1284 + Math.floor(Math.random() * 20),
    totalEvents: 45 + Math.floor(Math.random() * 5),
    totalRegistrations: 892 + Math.floor(Math.random() * 50)
  };
}

function generateMockUsers(): User[] {
  return [
    { id: '1', username: 'john_doe', email: 'john@example.com', role: 'MEMBER', isActive: true, createdAt: '2024-01-15T10:00:00Z', firstName: 'John', lastName: 'Doe' },
    { id: '2', username: 'jane_smith', email: 'jane@example.com', role: 'EDITOR', isActive: true, createdAt: '2024-02-20T10:00:00Z', firstName: 'Jane', lastName: 'Smith' },
    { id: '3', username: 'bob_wilson', email: 'bob@example.com', role: 'MEMBER', isActive: Math.random() > 0.3, createdAt: '2024-03-10T10:00:00Z', firstName: 'Bob', lastName: 'Wilson' }
  ];
}

async function fetchRealEvents(): Promise<Event[]> {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/events', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const events = data.events || data;
      
      return events.slice(0, 3).map((event: any) => ({
        id: event.id,
        title: event.title,
        status: event.status,
        startDate: event.startDate,
        registrations: event.registrationCount || 0,
        creator: { username: event.creator?.username || 'Unknown' }
      }));
    }
  } catch (error) {
    console.error('Error fetching real events:', error);
  }
  
  return [];
}

function generateMockComments(): Comment[] {
  return [
    { id: '1', content: 'Great event! Looking forward to attending.', status: Math.random() > 0.5 ? 'PENDING' : 'APPROVED', targetType: 'EVENT', user: { username: 'john_doe' }, createdAt: '2024-11-02T10:30:00Z' },
    { id: '2', content: 'This is spam content that should be rejected.', status: 'FLAGGED', targetType: 'NEWS', user: { username: 'spammer' }, createdAt: '2024-11-02T09:15:00Z' },
    { id: '3', content: 'Very informative article, thank you!', status: 'APPROVED', targetType: 'NEWS', user: { username: 'jane_smith' }, createdAt: '2024-11-02T08:45:00Z' }
  ];
}

function generateMockAuditLogs(): AuditLog[] {
  return [
    { id: '1', action: 'USER_CREATED', resource: 'User', resourceId: '123', user: { username: 'admin', email: 'admin@giip.com' }, createdAt: new Date(Date.now() - Math.random() * 3600000).toISOString() },
    { id: '2', action: 'EVENT_PUBLISHED', resource: 'Event', resourceId: '456', user: { username: 'editor1', email: 'editor@giip.com' }, createdAt: new Date(Date.now() - Math.random() * 7200000).toISOString() },
    { id: '3', action: 'COMMENT_MODERATED', resource: 'Comment', resourceId: '789', user: { username: 'admin', email: 'admin@giip.com' }, createdAt: new Date(Date.now() - Math.random() * 10800000).toISOString() }
  ];
}