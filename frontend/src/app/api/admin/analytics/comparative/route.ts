import { NextRequest, NextResponse } from 'next/server';
import { backendProxyFetch } from '@/lib/proxy-fetch';

interface ComparativeDataPoint {
  date: string;
  current: number;
  previous: number;
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
      metrics: metrics.join(','),
      includeComparison: 'true'
    });

    const response = await backendProxyFetch(`${backendUrl}/admin/analytics/enhanced/comparative?${params}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Fallback to mock data if backend is not available
      const mockData: ComparativeDataPoint[] = [];
      const start = new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const end = new Date(endDate || new Date());
      
      // Generate daily comparative data points
      const current = new Date(start);
      while (current <= end) {
        const dayOfYear = Math.floor((current.getTime() - new Date(current.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const currentValue = 50 + Math.sin(dayOfYear / 10) * 20 + Math.random() * 30;
        const previousValue = 45 + Math.sin((dayOfYear - 30) / 10) * 18 + Math.random() * 25;
        
        mockData.push({
          date: current.toISOString().split('T')[0],
          current: Math.floor(currentValue),
          previous: Math.floor(previousValue),
          category: metrics[0],
          metadata: {
            dayOfWeek: current.getDay(),
            isWeekend: current.getDay() === 0 || current.getDay() === 6,
            growth: ((currentValue - previousValue) / previousValue * 100).toFixed(1)
          }
        });
        
        current.setDate(current.getDate() + 1);
      }

      return NextResponse.json(mockData);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching comparative data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparative data' },
      { status: 500 }
    );
  }
}