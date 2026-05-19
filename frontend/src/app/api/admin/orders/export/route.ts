import { NextRequest, NextResponse } from 'next/server';
import { backendProxyFetch } from '@/lib/proxy-fetch';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await backendProxyFetch(`${BACKEND_URL}/admin/orders/export?${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to export orders');
      return new NextResponse(errorText, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': response.headers.get('Content-Disposition') || `attachment; filename="payment-ledger.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting orders:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
