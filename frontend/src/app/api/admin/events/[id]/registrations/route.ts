import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api-config';
import { backendProxyFetch } from '@/lib/proxy-fetch';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const backendUrl = getBackendUrl();
    const response = await backendProxyFetch(`${backendUrl}/api/admin/events/${id}/registrations?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch event registrations' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}