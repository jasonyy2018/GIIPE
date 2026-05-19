import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendUrl = process.env.SERVER_API_URL || 'http://backend:3001';
    const targetUrl = `${backendUrl}/api/payment/query/${id}`;

    console.log('[Payment Proxy] GET', targetUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Payment Proxy] Backend error:', response.status, responseText.substring(0, 500));
      let errorData: any;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText || 'Failed to query order' };
      }
      return NextResponse.json(errorData, { status: response.status });
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ message: 'Invalid response from payment service' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Payment Proxy] Query error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { message: 'Payment service unavailable', error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
