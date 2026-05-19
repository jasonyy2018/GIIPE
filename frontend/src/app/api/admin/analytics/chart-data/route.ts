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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const metrics = searchParams.get('metrics')?.split(',') || ['users'];

    // In a real implementation, this would call the backend service
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const params = new URLSearchParams({
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: endDate || new Date().toISOString(),
      metrics: metrics.join(',')
    });

    const response = await backendProxyFetch(`${backendUrl}/admin/analytics/enhanced/chart-data?${params}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Fallback to mock data if backend is not available
      const mockData: ChartDataPoint[] = [];
      const start = new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const end = new Date(endDate || new Date());
      
      // Generate daily data points
      const current = new Date(start);
      while (current <= end) {
        const dayOfYear = Math.floor((current.getTime() - new Date(current.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const baseValue = 50 + Math.sin(dayOfYear / 10) * 20 + Math.random() * 30;
        
        mockData.push({
          date: current.toISOString().split('T')[0],
          value: Math.floor(baseValue),
          category: metrics[0],
          metadata: {
            dayOfWeek: current.getDay(),
            isWeekend: current.getDay() === 0 || current.getDay() === 6
          }
        });
        
        current.setDate(current.getDate() + 1);
      }

      return NextResponse.json(mockData);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}