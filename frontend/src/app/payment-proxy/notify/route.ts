import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = process.env.SERVER_API_URL || 'http://backend:3001';
    const targetUrl = `${backendUrl}/api/payment/notify`;

    console.log('[Payment Proxy] POST notify');

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Payment Proxy] Notify error:', response.status, responseText.substring(0, 500));
      let errorData: any;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText || 'Payment notification failed' };
      }
      return NextResponse.json(errorData, { status: response.status });
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      return new NextResponse(responseText, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Payment Proxy] Notify error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { message: 'Payment service unavailable' },
      { status: 502 }
    );
  }
}
