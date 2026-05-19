import { NextRequest, NextResponse } from 'next/server';

import { getBackendUrl } from '@/lib/api-config';
import { backendProxyFetch } from '@/lib/proxy-fetch';

const BACKEND_URL = getBackendUrl();

const VALID_EVENT_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']);

/** Sanitize query params so backend never receives invalid status (e.g. status=P_offset=0). */
function sanitizeEventsQuery(searchParams: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of searchParams) {
    if (value == null || value === '') continue;
    if (key === 'status') {
      const s = String(value).toUpperCase();
      out.set(key, VALID_EVENT_STATUSES.has(s) ? s : 'PUBLISHED');
      continue;
    }
    out.set(key, value);
  }
  return out;
}

export async function GET(request: NextRequest) {
  let backendUrl: string = BACKEND_URL;
  let queryString: string = '';
  
  try {
    const { searchParams } = new URL(request.url);
    const sanitized = sanitizeEventsQuery(searchParams);
    queryString = sanitized.toString();
    
    // Resolve backend URL for server-to-server communication.
    // IMPORTANT: Never use NEXT_PUBLIC_API_URL here to avoid proxying back to the frontend.
    // Prefer SERVER_API_URL (e.g. http://backend:3001 inside Docker), otherwise fall back to BACKEND_URL.
    const serverApiUrl = process.env.SERVER_API_URL;
    backendUrl = serverApiUrl || BACKEND_URL;
    
    console.log('[Events API] Backend URL:', backendUrl);
    console.log('[Events API] Query string:', queryString);
    
    const response = await backendProxyFetch(
      `${backendUrl}/api/events?${queryString}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
      },
      { label: 'GET /api/events' },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch events' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Events API] Error fetching events:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      backendUrl: backendUrl || 'unknown',
      serverApiUrl: process.env.SERVER_API_URL,
      queryString: queryString || 'unknown',
    });
    return NextResponse.json(
      { message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Resolve backend URL for server-to-server communication.
    // IMPORTANT: Never use NEXT_PUBLIC_API_URL here to avoid proxying back to the frontend.
    // Prefer SERVER_API_URL (e.g. http://backend:3001 inside Docker), otherwise fall back to BACKEND_URL.
    const serverApiUrl = process.env.SERVER_API_URL;
    const backendUrl = serverApiUrl || BACKEND_URL;
    
    const response = await backendProxyFetch(
      `${backendUrl}/api/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
        body: JSON.stringify(body),
      },
      { label: 'POST /api/events' },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to create event' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}