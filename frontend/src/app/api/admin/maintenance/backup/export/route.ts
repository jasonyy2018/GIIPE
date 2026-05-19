import { NextRequest } from 'next/server';
import { backendProxyFetch } from '@/lib/proxy-fetch';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeUploads = searchParams.get('includeUploads') ?? '1';
  const includeLogs = searchParams.get('includeLogs') ?? '0';

  const targetUrl = `${BACKEND_URL}/admin/maintenance/backup/export?includeUploads=${encodeURIComponent(includeUploads)}&includeLogs=${encodeURIComponent(includeLogs)}`;

  const auth = request.headers.get('authorization') || '';

  const upstream = await backendProxyFetch(targetUrl, {
    method: 'GET',
    headers: {
      ...(auth ? { Authorization: auth } : {}),
    },
    cache: 'no-store',
  });

  const headers = new Headers();
  // Preserve download headers
  const cd = upstream.headers.get('content-disposition');
  const ct = upstream.headers.get('content-type');
  if (cd) headers.set('content-disposition', cd);
  if (ct) headers.set('content-type', ct);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

