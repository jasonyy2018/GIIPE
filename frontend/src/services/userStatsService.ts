export interface UserStats {
  eventsAttended: number;
  upcomingEvents: number;
  savedArticles: number;
  networkConnections: number;
  totalEngagement: number;
  monthlyGrowth: {
    events: number;
    connections: number;
    content: number;
    engagement: number;
  };
  weeklyActivity: {
    date: string;
    events: number;
    content: number;
    connections: number;
  }[];
}

export interface UserAnalytics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  metrics: {
    pageViews: number;
    eventRegistrations: number;
    contentSaves: number;
    networkConnections: number;
    timeSpent: number;
  };
  trends: {
    engagement: TrendData;
    activity: TrendData;
    growth: TrendData;
  };
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export interface UserActivity {
  id: string;
  type: 'event_registration' | 'content_save' | 'connection_made' | 'comment_posted' | 'profile_update';
  title: string;
  description: string;
  timestamp: Date;
  relatedEntity: {
    type: 'event' | 'article' | 'user' | 'news';
    id: string;
    name: string;
  };
  icon: string;
}

class UserStatsService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const cacheKey = `user-stats-${userId}`;
    const cached = this.getCachedData<UserStats>(cacheKey);
    if (cached) return cached;

    try {
      // Simulate API call - in real app, this would fetch from backend
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const stats: UserStats = {
        eventsAttended: 12,
        upcomingEvents: 4,
        savedArticles: 8,
        networkConnections: 156,
        totalEngagement: 89,
        monthlyGrowth: {
          events: 15,
          connections: 8,
          content: 12,
          engagement: 23
        },
        weeklyActivity: [
          { date: '2024-05-13', events: 2, content: 3, connections: 1 },
          { date: '2024-05-14', events: 1, content: 2, connections: 2 },
          { date: '2024-05-15', events: 0, content: 4, connections: 0 },
          { date: '2024-05-16', events: 3, content: 1, connections: 3 },
          { date: '2024-05-17', events: 1, content: 2, connections: 1 },
          { date: '2024-05-18', events: 2, content: 3, connections: 2 },
          { date: '2024-05-19', events: 1, content: 1, connections: 1 }
        ]
      };

      this.setCachedData(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  async getUserAnalytics(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<UserAnalytics> {
    const cacheKey = `user-analytics-${userId}-${period}`;
    const cached = this.getCachedData<UserAnalytics>(cacheKey);
    if (cached) return cached;

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Generate more realistic data based on period
      const multiplier = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
      const basePageViews = Math.floor(8 + Math.random() * 12) * multiplier;
      const baseRegistrations = Math.floor(0.5 + Math.random() * 2) * (period === 'monthly' ? 4 : period === 'weekly' ? 1 : 0.2);
      const baseContentSaves = Math.floor(1 + Math.random() * 3) * multiplier;
      const baseConnections = Math.floor(0.3 + Math.random() * 1.5) * multiplier;
      const baseTimeSpent = Math.floor(30 + Math.random() * 60) * multiplier; // minutes
      
      const analytics: UserAnalytics = {
        userId,
        period,
        metrics: {
          pageViews: Math.floor(basePageViews),
          eventRegistrations: Math.floor(baseRegistrations),
          contentSaves: Math.floor(baseContentSaves),
          networkConnections: Math.floor(baseConnections),
          timeSpent: Math.floor(baseTimeSpent)
        },
        trends: {
          engagement: {
            current: Math.floor(70 + Math.random() * 25),
            previous: Math.floor(60 + Math.random() * 25),
            change: 0,
            changePercent: 0
          },
          activity: {
            current: Math.floor(25 + Math.random() * 15),
            previous: Math.floor(20 + Math.random() * 15),
            change: 0,
            changePercent: 0
          },
          growth: {
            current: Math.floor(140 + Math.random() * 30),
            previous: Math.floor(130 + Math.random() * 25),
            change: 0,
            changePercent: 0
          }
        }
      };

      // Calculate trend changes
      analytics.trends.engagement.change = analytics.trends.engagement.current - analytics.trends.engagement.previous;
      analytics.trends.engagement.changePercent = analytics.trends.engagement.previous > 0 
        ? Math.round((analytics.trends.engagement.change / analytics.trends.engagement.previous) * 100 * 10) / 10: 0;

      analytics.trends.activity.change = analytics.trends.activity.current - analytics.trends.activity.previous;
      analytics.trends.activity.changePercent = analytics.trends.activity.previous > 0 
        ? Math.round((analytics.trends.activity.change / analytics.trends.activity.previous) * 100 * 10) / 10: 0;

      analytics.trends.growth.change = analytics.trends.growth.current - analytics.trends.growth.previous;
      analytics.trends.growth.changePercent = analytics.trends.growth.previous > 0 
        ? Math.round((analytics.trends.growth.change / analytics.trends.growth.previous) * 100 * 10) / 10: 0;

      this.setCachedData(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      throw error;
    }
  }

  async getUserActivity(userId: string, limit: number = 10): Promise<UserActivity[]> {
    const cacheKey = `user-activity-${userId}-${limit}`;
    const cached = this.getCachedData<UserActivity[]>(cacheKey);
    if (cached) return cached;

    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const activities: UserActivity[] = [
        {
          id: '1',
          type: 'event_registration',
          title: 'Registered for IP Strategy Conference',
          description: 'Successfully registered for the upcoming conference on June 15, 2024',
          timestamp: new Date('2024-05-20T10:30:00Z'),
          relatedEntity: {
            type: 'event',
            id: '1',
            name: 'IP Strategy Conference 2024'
          },
          icon: 'fas fa-calendar-check'
        },
        {
          id: '2',
          type: 'content_save',
          title: 'Saved article',
          description: 'Bookmarked "The Future of AI Patents" for later reading',
          timestamp: new Date('2024-05-19T15:45:00Z'),
          relatedEntity: {
            type: 'article',
            id: '2',
            name: 'The Future of AI Patents'
          },
          icon: 'fas fa-bookmark'
        },
        {
          id: '3',
          type: 'connection_made',
          title: 'Connected with Dr. Sarah Chen',
          description: 'New professional connection established',
          timestamp: new Date('2024-05-18T09:20:00Z'),
          relatedEntity: {
            type: 'user',
            id: '3',
            name: 'Dr. Sarah Chen'
          },
          icon: 'fas fa-user-plus'
        },
        {
          id: '4',
          type: 'comment_posted',
          title: 'Commented on discussion',
          description: 'Participated in "Patent Filing Strategies" discussion',
          timestamp: new Date('2024-05-17T14:10:00Z'),
          relatedEntity: {
            type: 'article',
            id: '4',
            name: 'Patent Filing Strategies'
          },
          icon: 'fas fa-comment'
        },
        {
          id: '5',
          type: 'profile_update',
          title: 'Updated profile',
          description: 'Added new skills and interests to profile',
          timestamp: new Date('2024-05-16T11:30:00Z'),
          relatedEntity: {
            type: 'user',
            id: userId,
            name: 'Your Profile'
          },
          icon: 'fas fa-user-edit'
        }
      ];

      const limitedActivities = activities.slice(0, limit);
      this.setCachedData(cacheKey, limitedActivities);
      return limitedActivities;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }

  calculateTrend(current: number, previous: number): TrendData {
    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;
    
    return {
      current,
      previous,
      change,
      changePercent: Math.round(changePercent * 10) / 10
    };
  }

  formatEngagementScore(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Average';
    if (score >= 30) return 'Low';
    return 'Very Low';
  }

  getEngagementColor(score: number): string {
    if (score >= 90) return 'green';
    if (score >= 70) return 'blue';
    if (score >= 50) return 'yellow';
    if (score >= 30) return 'orange';
    return 'red';
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const userStatsService = new UserStatsService();