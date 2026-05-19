import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api-config';
import { backendProxyFetch } from '@/lib/proxy-fetch';

const BACKEND_URL = getBackendUrl();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Use SERVER_API_URL for Docker container networking
    const serverApiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = serverApiUrl && !serverApiUrl.includes('localhost') ? serverApiUrl : BACKEND_URL;
    
    const response = await backendProxyFetch(
      `${backendUrl}/api/events/${id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
      },
      { label: `GET /api/events/${id}` },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch event' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { message: 'Authorization header required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Use SERVER_API_URL for Docker container networking
    // In Docker, SERVER_API_URL should be set to container name (e.g., http://conference_backend:3001)
    const serverApiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Use SERVER_API_URL if it's a container name (not localhost), otherwise use BACKEND_URL
    const backendUrl = serverApiUrl && !serverApiUrl.includes('localhost') ? serverApiUrl : BACKEND_URL;
    
    const response = await backendProxyFetch(
      `${backendUrl}/api/events/${id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(body),
      },
      { label: `PATCH /api/events/${id}` },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update event' }));
      console.error('Backend update error:', response.status, errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Use SERVER_API_URL for Docker container networking
    const serverApiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = serverApiUrl && !serverApiUrl.includes('localhost') ? serverApiUrl : BACKEND_URL;
    
    const response = await backendProxyFetch(
      `${backendUrl}/api/events/${id}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
      },
      { label: `DELETE /api/events/${id}` },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to delete event' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}