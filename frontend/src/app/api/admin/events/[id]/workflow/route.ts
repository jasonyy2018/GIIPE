import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api-config';
import { backendProxyFetch } from '@/lib/proxy-fetch';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    
    const backendUrl = getBackendUrl();
    const response = await backendProxyFetch(`${backendUrl}/api/admin/events/${id}/workflow`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update event workflow' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating event workflow:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}