import { NextRequest, NextResponse } from 'next/server';

// Mock data generators for different widget types
const generateMockData = (dataSource: string, widgetType: string) => {
  switch (dataSource) {
    case '/api/admin/analytics/users':
      return {
        value: Math.floor(Math.random() * 1000) + 500,
        previousValue: Math.floor(Math.random() * 900) + 400,
        trend: Math.random() > 0.5 ? 'up' : 'down',
        trendPercentage: Math.random() * 20,
        unit: '',
        status: 'normal'
      };

    case '/api/admin/analytics/events':
      return Array.from({ length: 12 }, (_, i) => ({
        name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        value: Math.floor(Math.random() * 100) + 20
      }));

    case '/api/admin/analytics/registrations':
      return Array.from({ length: 30 }, (_, i) => ({
        name: `Day ${i + 1}`,
        value: Math.floor(Math.random() * 50) + 10
      }));

    case '/api/admin/analytics/content':
      return [
        { name: 'Events', value: Math.floor(Math.random() * 100) + 50 },
        { name: 'Comments', value: Math.floor(Math.random() * 200) + 100 },
        { name: 'News', value: Math.floor(Math.random() * 80) + 30 },
        { name: 'Submissions', value: Math.floor(Math.random() * 60) + 20 }
      ];

    case '/api/admin/system/health':
      return {
        overall: Math.random() > 0.8 ? 'warning' : 'healthy',
        services: [
          {
            name: 'Database',
            status: Math.random() > 0.9 ? 'degraded' : 'online',
            responseTime: Math.floor(Math.random() * 100) + 20,
            lastCheck: new Date().toISOString()
          },
          {
            name: 'Redis Cache',
            status: 'online',
            responseTime: Math.floor(Math.random() * 30) + 5,
            lastCheck: new Date().toISOString()
          },
          {
            name: 'Email Service',
            status: Math.random() > 0.95 ? 'offline' : 'online',
            responseTime: Math.floor(Math.random() * 500) + 100,
            lastCheck: new Date().toISOString()
          },
          {
            name: 'File Storage',
            status: 'online',
            responseTime: Math.floor(Math.random() * 200) + 50,
            lastCheck: new Date().toISOString()
          }
        ],
        uptime: Math.floor(Math.random() * 2592000) + 86400,
        lastCheck: new Date().toISOString()
      };

    case '/api/admin/system/performance':
      return {
        value: Math.floor(Math.random() * 1000) + 200,
        previousValue: Math.floor(Math.random() * 900) + 150,
        trend: Math.random() > 0.6 ? 'down' : 'up',
        trendPercentage: Math.random() * 15,
        unit: 'ms',
        status: Math.random() > 0.8 ? 'warning' : 'normal'
      };

    case '/api/admin/system/errors':
      return Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        value: Math.floor(Math.random() * 10)
      }));

    case '/api/admin/content/moderation-queue':
      return Array.from({ length: Math.floor(Math.random() * 15) + 5 }, (_, i) => ({
        id: `item-${i}`,
        title: `Content Item ${i + 1}`,
        subtitle: `Flagged for review • User: user${i + 1}`,
        status: ['pending', 'flagged'][Math.floor(Math.random() * 2)],
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
      }));

    case '/api/admin/content/stats':
      return {
        value: Math.floor(Math.random() * 500) + 100,
        previousValue: Math.floor(Math.random() * 450) + 80,
        trend: 'up',
        trendPercentage: Math.random() * 10,
        unit: '',
        status: 'normal'
      };

    case '/api/admin/content/flagged':
      return Array.from({ length: Math.floor(Math.random() * 8) + 2 }, (_, i) => ({
        id: `flagged-${i}`,
        title: `Flagged Content ${i + 1}`,
        subtitle: `Contains sensitive words`,
        status: 'warning',
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
      }));

    case '/api/users/recent':
      return Array.from({ length: 8 }, (_, i) => ({
        id: `user-${i}`,
        title: `User ${i + 1}`,
        subtitle: `user${i + 1}@example.com`,
        status: 'success',
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
      }));

    case '/api/users/growth':
      return Array.from({ length: 12 }, (_, i) => ({
        name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        value: Math.floor(Math.random() * 200) + 50
      }));

    case '/api/users/activity':
      return Array.from({ length: 15 }, (_, i) => ({
        id: `activity-${i}`,
        type: ['user', 'event', 'content', 'system'][Math.floor(Math.random() * 4)],
        action: ['logged in', 'registered', 'updated profile', 'created event', 'posted comment'][Math.floor(Math.random() * 5)],
        user: `user${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        severity: ['low', 'medium'][Math.floor(Math.random() * 2)]
      }));

    case '/api/events/upcoming':
      return Array.from({ length: 6 }, (_, i) => ({
        id: `event-${i}`,
        title: `Event ${i + 1}`,
        subtitle: `${Math.floor(Math.random() * 100) + 20} registrations`,
        status: ['success', 'info', 'warning'][Math.floor(Math.random() * 3)],
        timestamp: new Date(Date.now() + Math.random() * 2592000000).toISOString()
      }));

    case '/api/events/progress':
      return {
        items: Array.from({ length: Math.floor(Math.random() * 5) + 3 }, (_, i) => ({
          id: `progress-${i}`,
          label: `Event ${i + 1} Planning`,
          current: Math.floor(Math.random() * 100),
          target: 100,
          percentage: Math.floor(Math.random() * 100),
          status: ['on-track', 'behind', 'ahead', 'completed'][Math.floor(Math.random() * 4)],
          unit: '%'
        })),
        overall: {
          completed: Math.floor(Math.random() * 10) + 5,
          total: 15,
          percentage: Math.floor(Math.random() * 100)
        }
      };

    case '/api/events/registrations':
      return {
        value: Math.floor(Math.random() * 300) + 100,
        previousValue: Math.floor(Math.random() * 250) + 80,
        trend: 'up',
        trendPercentage: Math.random() * 25,
        unit: '',
        status: 'normal'
      };

    default:
      // Generic data based on widget type
      if (widgetType === 'metric') {
        return {
          value: Math.floor(Math.random() * 1000),
          previousValue: Math.floor(Math.random() * 900),
          trend: Math.random() > 0.5 ? 'up' : 'down',
          trendPercentage: Math.random() * 20,
          unit: '',
          status: 'normal'
        };
      } else if (widgetType === 'chart') {
        return Array.from({ length: 10 }, (_, i) => ({
          name: `Item ${i + 1}`,
          value: Math.floor(Math.random() * 100)
        }));
      } else if (widgetType === 'list') {
        return Array.from({ length: 5 }, (_, i) => ({
          id: `item-${i}`,
          title: `List Item ${i + 1}`,
          subtitle: 'Sample subtitle',
          status: 'info',
          timestamp: new Date().toISOString()
        }));
      }
      
      return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataSource = searchParams.get('dataSource');
    const widgetType = searchParams.get('widgetType') || 'metric';

    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source is required' },
        { status: 400 }
      );
    }

    const data = generateMockData(dataSource, widgetType);

    return NextResponse.json({
      data,
      timestamp: new Date().toISOString(),
      source: dataSource
    });
  } catch (error) {
    console.error('Error fetching widget data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch widget data' },
      { status: 500 }
    );
  }
}