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
    const format = searchParams.get('format') || 'csv';

    const response = await backendProxyFetch(`${BACKEND_URL}/sensitive-words/export`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export words');
    }

    const words = await response.json();

    if (format === 'json') {
      return NextResponse.json(words, {
        headers: {
          'Content-Disposition': 'attachment; filename="sensitive-words.json"',
          'Content-Type': 'application/json',
        },
      });
    } else {
      // Convert to CSV
      const csvHeader = 'word,level,category,isActive,createdAt\n';
      const csvRows = words.map((word: any) => 
        `"${word.word}",${word.level},"${word.category}",${word.isActive},"${word.createdAt}"`
      ).join('\n');
      const csvContent = csvHeader + csvRows;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Disposition': 'attachment; filename="sensitive-words.csv"',
          'Content-Type': 'text/csv',
        },
      });
    }
  } catch (error) {
    console.error('Error exporting words:', error);
    return NextResponse.json(
      { error: 'Failed to export words' },
      { status: 500 }
    );
  }
}