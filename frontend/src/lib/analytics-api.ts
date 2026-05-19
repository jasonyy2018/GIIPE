import {
  DashboardMetrics,
  UserActivityMetrics,
  EventMetrics,
  RegistrationMetrics,
  SystemMetrics,
  AnalyticsQuery,
} from '@/types/analytics';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class AnalyticsAPI {
  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private buildQueryString(params: AnalyticsQuery): string {
    const searchParams = new URLSearchParams();
    
    if (params.dateRange) {
      searchParams.append('dateRange', params.dateRange);
    }
    if (params.startDate) {
      searchParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      searchParams.append('endDate', params.endDate);
    }

    return searchParams.toString();
  }

  async getDashboardMetrics(query: AnalyticsQuery = {}): Promise<DashboardMetrics> {
    const queryString = this.buildQueryString(query);
    return this.fetchWithAuth(`/api/analytics/dashboard?${queryString}`);
  }

  async getUserActivityMetrics(query: AnalyticsQuery = {}): Promise<UserActivityMetrics> {
    const queryString = this.buildQueryString(query);
    return this.fetchWithAuth(`/api/analytics/user-activity?${queryString}`);
  }

  async getEventMetrics(query: AnalyticsQuery = {}): Promise<EventMetrics> {
    const queryString = this.buildQueryString(query);
    return this.fetchWithAuth(`/api/analytics/events?${queryString}`);
  }

  async getRegistrationMetrics(query: AnalyticsQuery = {}): Promise<RegistrationMetrics> {
    const queryString = this.buildQueryString(query);
    return this.fetchWithAuth(`/api/analytics/registrations?${queryString}`);
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.fetchWithAuth('/api/analytics/system');
  }

  async exportAnalyticsData(query: AnalyticsQuery = {}): Promise<any> {
    const queryString = this.buildQueryString(query);
    return this.fetchWithAuth(`/api/analytics/export?${queryString}`);
  }

  async trackActivity(activityData: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.fetchWithAuth('/api/analytics/track-activity', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  }
}

export const analyticsAPI = new AnalyticsAPI();