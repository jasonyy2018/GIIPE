export interface Notification {
  id: string;
  type: 'system' | 'event' | 'social' | 'security';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'normal' | 'high';
  actionUrl?: string;
  actionText?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface NotificationCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  categories: {
    system: boolean;
    event: boolean;
    social: boolean;
    security: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone?: string;
  };
  frequency: 'immediate' | 'hourly' | 'daily';
  scheduling: {
    enabled: boolean;
    workDays: boolean[];  // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    workHours: {
      start: string;
      end: string;
    };
  };
  digest: {
    enabled: boolean;
    time: string; // HH:mm format
    includeRead: boolean;
  };
  autoArchive: {
    enabled: boolean;
    afterDays: number;
  };
}

export interface NotificationFilter {
  type?: 'all' | 'unread' | 'system' | 'event' | 'social' | 'security';
  priority?: 'low' | 'normal' | 'high';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface NotificationBatch {
  notifications: Notification[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface NotificationArchive {
  id: string;
  originalNotificationId: string;
  archivedAt: Date;
  reason: 'auto' | 'manual' | 'bulk';
  notification: Notification;
}

export interface NotificationSchedule {
  id: string;
  userId: string;
  type: 'digest' | 'reminder' | 'summary';
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:mm format
  timezone: string;
  enabled: boolean;
  lastSent?: Date;
  nextScheduled?: Date;
}

export interface NotificationDigest {
  id: string;
  userId: string;
  type: 'daily' | 'weekly';
  period: {
    start: Date;
    end: Date;
  };
  notifications: Notification[];
  summary: {
    total: number;
    unread: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  };
  generatedAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  settings: NotificationSettings;
  customCategories: {
    id: string;
    name: string;
    keywords: string[];
    enabled: boolean;
  }[];
  blockedSenders: string[];
  priorityRules: {
    id: string;
    condition: {
      type?: string;
      keywords?: string[];
      sender?: string;
    };
    priority: 'low' | 'normal' | 'high';
    enabled: boolean;
  }[];
}