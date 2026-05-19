import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles the payment gateway's synchronous return (前台通知).
 * After payment, the gateway POSTs form data (partnerid, jsonData, sign)
 * to our returnurl. We forward to the backend for decryption/verification,
 * then redirect the browser to the payment result page.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let partnerid = '';
    let jsonData = '';
    let sign = '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      partnerid = (formData.get('partnerid') as string) || '';
      jsonData = (formData.get('jsonData') as string) || '';
      sign = (formData.get('sign') as string) || '';
    } else {
      const body = await request.json().catch(() => ({}));
      partnerid = body.partnerid || '';
      jsonData = body.jsonData || '';
      sign = body.sign || '';
    }

    if (partnerid && jsonData && sign) {
      const backendUrl = process.env.SERVER_API_URL || 'http://backend:3001';
      try {
        await fetch(`${backendUrl}/api/payment/return-callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partnerid, jsonData, sign }),
        });
      } catch {
        // Non-critical: the async notify webhook is the primary mechanism
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giip.info';
    return NextResponse.redirect(`${baseUrl}/payment/return`, { status: 303 });
  } catch {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giip.info';
    return NextResponse.redirect(`${baseUrl}/payment/return`, { status: 303 });
  }
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giip.info';
  return NextResponse.redirect(`${baseUrl}/payment/return`, { status: 303 });
}
