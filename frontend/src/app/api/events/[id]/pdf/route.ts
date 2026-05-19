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
    
    const response = await backendProxyFetch(`${backendUrl}/api/events/${id}/pdf`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/pdf',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { message: 'PDF file not found' },
          { status: 404 }
        );
      }
      const errorData = await response.json().catch(() => ({ message: 'Failed to download PDF' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    // Get the PDF blob
    const blob = await response.blob();
    
    // Return the PDF with appropriate headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': response.headers.get('Content-Disposition') || `attachment; filename="event-${id}.pdf"`,
        // Same URL for all versions of the event PDF — must not cache aggressively or users see the old file after admin replaces it.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Error downloading PDF:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

