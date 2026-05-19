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
    const format = searchParams.get('format') || 'csv';
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Use getBackendUrl() to ensure correct URL in Docker
    const backendUrl = getBackendUrl();
    const response = await backendProxyFetch(`${backendUrl}/api/admin/events/${id}/registrations/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to export event registrations' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    
    // Convert base64 back to buffer for download
    if (data.data) {
      const buffer = Buffer.from(data.data, 'base64');
      const headers = new Headers();
      headers.set('Content-Type', data.contentType || 'application/octet-stream');
      headers.set('Content-Disposition', `attachment; filename="${data.filename}"`);
      
      return new NextResponse(buffer, { headers });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error exporting event registrations:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}