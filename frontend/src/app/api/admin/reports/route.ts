import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';

interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  config: {
    metrics: string[];
    dimensions: string[];
    filters: any[];
    dateRange: {
      startDate: string;
      endDate: string;
      preset?: string;
    };
    format: 'table' | 'chart' | 'summary';
    chartType?: 'line' | 'bar' | 'pie' | 'area';
  };
  schedule: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
    timezone?: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'error';
}

// Mock data - in real implementation, this would come from database
let reportSchedules: ReportSchedule[] = [
  {
    id: '1',
    name: 'Weekly User Activity Report',
    description: 'Weekly summary of user registrations and activity',
    config: {
      metrics: ['user_registrations', 'active_users', 'event_participation'],
      dimensions: ['date', 'user_type'],
      filters: [],
      dateRange: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        preset: 'last_7_days'
      },
      format: 'table'
    },
    schedule: {
      enabled: true,
      frequency: 'weekly',
      time: '09:00',
      recipients: ['admin@example.com'],
      timezone: 'UTC'
    },
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'active'
  }
];

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const frequency = searchParams.get('frequency');

    let filteredSchedules = reportSchedules;

    if (status) {
      filteredSchedules = filteredSchedules.filter(schedule => schedule.status === status);
    }

    if (frequency) {
      filteredSchedules = filteredSchedules.filter(schedule => schedule.schedule.frequency === frequency);
    }

    return NextResponse.json({
      schedules: filteredSchedules,
      total: filteredSchedules.length
    });
  } catch (error) {
    console.error('Error fetching report schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, config, schedule } = body;

    // Validate required fields
    if (!name || !config || !schedule) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate next run time
    const nextRun = calculateNextRun(schedule.frequency, schedule.time);

    const newSchedule: ReportSchedule = {
      id: Date.now().toString(),
      name,
      description,
      config,
      schedule: {
        ...schedule,
        timezone: schedule.timezone || 'UTC'
      },
      createdBy: session.user.email || 'unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextRun: nextRun.toISOString(),
      status: schedule.enabled ? 'active' : 'paused'
    };

    reportSchedules.push(newSchedule);

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating report schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateNextRun(frequency: string, time: string): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  const nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case 'weekly':
      // Set to next Monday at specified time
      const daysUntilMonday = (8 - nextRun.getDay()) % 7 || 7;
      nextRun.setDate(nextRun.getDate() + daysUntilMonday);
      break;
    case 'monthly':
      // Set to first day of next month at specified time
      nextRun.setMonth(nextRun.getMonth() + 1, 1);
      break;
  }

  return nextRun;
}