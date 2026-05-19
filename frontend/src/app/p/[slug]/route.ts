import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const backendUrl =
    process.env.SERVER_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://backend:3001';

  try {
    const res = await fetch(
      `${backendUrl}/api/payment/short/qr/${encodeURIComponent(slug)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to resolve short link: ${res.status}`);
    }

    const data = await res.json();
    const target = (data.cashierUrl as string | undefined) || (data.redirectUrl as string | undefined);

    if (!target) {
      throw new Error('cashierUrl missing in short-link response');
    }

    return NextResponse.redirect(target, { status: 302 });
  } catch (error) {
    console.error('[ShortLink] Failed to resolve slug:', slug, error);
    const fallback =
      process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giip.info';
    return NextResponse.redirect(fallback, { status: 302 });
  }
}

