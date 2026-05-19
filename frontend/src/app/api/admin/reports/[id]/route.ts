import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';

// This would be replaced with actual database operations
let reportSchedules: any[] = [];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getAdminSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedule = reportSchedules.find(s => s.id === id);
    
    if (!schedule) {
      return NextResponse.json({ error: 'Report schedule not found' }, { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching report schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getAdminSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const scheduleIndex = reportSchedules.findIndex(s => s.id === id);
    
    if (scheduleIndex === -1) {
      return NextResponse.json({ error: 'Report schedule not found' }, { status: 404 });
    }

    const updatedSchedule = {
      ...reportSchedules[scheduleIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };

    reportSchedules[scheduleIndex] = updatedSchedule;

    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating report schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getAdminSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const scheduleIndex = reportSchedules.findIndex(s => s.id === id);
    
    if (scheduleIndex === -1) {
      return NextResponse.json({ error: 'Report schedule not found' }, { status: 404 });
    }

    reportSchedules.splice(scheduleIndex, 1);

    return NextResponse.json({ message: 'Report schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting report schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}