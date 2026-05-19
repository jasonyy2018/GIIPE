import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';
import { backendProxyFetch } from '@/lib/proxy-fetch';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const response = await backendProxyFetch(`${BACKEND_URL}/sensitive-words?${queryString}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sensitive words');
    }

    const data = await response.json();
    return NextResponse.json(data.words || data);
  } catch (error) {
    console.error('Error fetching sensitive words:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sensitive words' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const response = await backendProxyFetch(`${BACKEND_URL}/sensitive-words`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const word = await response.json();
    return NextResponse.json(word, { status: 201 });
  } catch (error) {
    console.error('Error creating sensitive word:', error);
    return NextResponse.json(
      { error: 'Failed to create sensitive word' },
      { status: 500 }
    );
  }
}