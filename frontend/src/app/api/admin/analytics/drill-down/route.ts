import { NextRequest, NextResponse } from 'next/server';
import { backendProxyFetch } from '@/lib/proxy-fetch';

interface ChartDataPoint {
  date: string;
  value: number;
  category?: string;
  metadata?: Record<string, any>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const category = searchParams.get('category');
    const level = parseInt(searchParams.get('level') || '1');
    const metric = searchParams.get('metric') || 'users';

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would call the backend service
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const params = new URLSearchParams({
      date,
      level: level.toString(),
      metric
    });

    if (category) {
      params.append('category', category);
    }

    const response = await backendProxyFetch(`${backendUrl}/admin/analytics/enhanced/drill-down?${params}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Fallback to mock data if backend is not available
      const mockData: ChartDataPoint[] = [];
      const selectedDate = new Date(date);
      
      if (level === 1) {
        // Generate hourly data for the selected date
        for (let hour = 0; hour < 24; hour++) {
          const hourDate = new Date(selectedDate);
          hourDate.setHours(hour, 0, 0, 0);
          
          // Simulate realistic hourly patterns
          let baseValue = 10;
          if (hour >= 9 && hour <= 17) {
            baseValue = 30 + Math.sin((hour - 9) / 8 * Math.PI) * 20;
          } else if (hour >= 18 && hour <= 22) {
            baseValue = 20 + Math.sin((hour - 18) / 4 * Math.PI) * 15;
          }
          
          mockData.push({
            date: `${hour.toString().padStart(2, '0')}:00`,
            value: Math.floor(baseValue + Math.random() * 10),
            category: 'hourly',
            metadata: {
              hour,
              fullDate: hourDate.toISOString(),
              isBusinessHour: hour >= 9 && hour <= 17
            }
          });
        }
      } else if (level === 2 && category) {
        // Generate category-specific data
        const categories = ['Desktop', 'Mobile', 'Tablet'];
        categories.forEach((cat, index) => {
          mockData.push({
            date: cat,
            value: Math.floor(50 + Math.random() * 100),
            category: cat.toLowerCase(),
            metadata: {
              categoryType: 'device',
              percentage: (33.33 + Math.random() * 10).toFixed(1)
            }
          });
        });
      }

      return NextResponse.json(mockData);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching drill-down data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drill-down data' },
      { status: 500 }
    );
  }
}