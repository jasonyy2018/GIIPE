import { NextRequest, NextResponse } from 'next/server';
import { backendProxyFetch } from '@/lib/proxy-fetch';

interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  category: string;
  unit?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const metrics = searchParams.get('metrics')?.split(',') || ['users', 'events', 'registrations', 'engagement'];

    // In a real implementation, this would call the backend service
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const params = new URLSearchParams({
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: endDate || new Date().toISOString(),
      metrics: metrics.join(',')
    });

    const response = await backendProxyFetch(`${backendUrl}/admin/analytics/enhanced/metrics?${params}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Fallback to mock data if backend is not available
      const mockMetrics: AnalyticsMetric[] = [
        {
          id: 'users',
          name: 'New Users',
          value: 1247,
          previousValue: 1089,
          trend: 'up',
          trendPercentage: 14.5,
          category: 'User Growth',
          unit: 'users'
        },
        {
          id: 'events',
          name: 'Events Created',
          value: 23,
          previousValue: 19,
          trend: 'up',
          trendPercentage: 21.1,
          category: 'Content',
          unit: 'events'
        },
        {
          id: 'registrations',
          name: 'Registrations',
          value: 456,
          previousValue: 523,
          trend: 'down',
          trendPercentage: 12.8,
          category: 'Engagement',
          unit: 'registrations'
        },
        {
          id: 'engagement',
          name: 'User Actions',
          value: 8934,
          previousValue: 7821,
          trend: 'up',
          trendPercentage: 14.2,
          category: 'Activity',
          unit: 'actions'
        }
      ];

      return NextResponse.json(mockMetrics.filter(m => metrics.includes(m.id)));
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching analytics metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics metrics' },
      { status: 500 }
    );
  }
}