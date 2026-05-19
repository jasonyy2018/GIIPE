import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-auth';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: {
    metrics: string[];
    dimensions: string[];
    filters: any[];
    format: 'table' | 'chart' | 'summary';
    chartType?: 'line' | 'bar' | 'pie' | 'area';
  };
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

// Mock report templates
const reportTemplates: ReportTemplate[] = [
  {
    id: '1',
    name: 'User Activity Summary',
    description: 'Overview of user registrations, logins, and engagement metrics',
    category: 'User Analytics',
    config: {
      metrics: ['user_registrations', 'active_users', 'login_count', 'session_duration'],
      dimensions: ['date', 'user_type', 'registration_source'],
      filters: [],
      format: 'table'
    },
    isDefault: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    usageCount: 45
  },
  {
    id: '2',
    name: 'Event Performance Report',
    description: 'Detailed analysis of event registrations, attendance, and feedback',
    category: 'Event Analytics',
    config: {
      metrics: ['event_registrations', 'attendance_rate', 'feedback_score', 'revenue'],
      dimensions: ['event_type', 'date', 'location'],
      filters: [],
      format: 'chart',
      chartType: 'bar'
    },
    isDefault: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    usageCount: 32
  },
  {
    id: '3',
    name: 'Content Moderation Summary',
    description: 'Overview of content moderation activities and sensitive word detection',
    category: 'Moderation',
    config: {
      metrics: ['flagged_content', 'approved_content', 'rejected_content', 'moderation_time'],
      dimensions: ['content_type', 'moderator', 'date'],
      filters: [],
      format: 'summary'
    },
    isDefault: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    usageCount: 18
  },
  {
    id: '4',
    name: 'System Performance Dashboard',
    description: 'Real-time system metrics including response times and error rates',
    category: 'System',
    config: {
      metrics: ['response_time', 'error_rate', 'uptime', 'active_sessions'],
      dimensions: ['service', 'endpoint', 'time'],
      filters: [],
      format: 'chart',
      chartType: 'line'
    },
    isDefault: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    usageCount: 67
  },
  {
    id: '5',
    name: 'Revenue and Financial Summary',
    description: 'Financial overview including event revenue, payment processing, and trends',
    category: 'Financial',
    config: {
      metrics: ['total_revenue', 'payment_count', 'refund_amount', 'processing_fees'],
      dimensions: ['payment_method', 'event_type', 'date'],
      filters: [],
      format: 'table'
    },
    isDefault: true,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    usageCount: 23
  }
];

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isDefault = searchParams.get('isDefault');

    let filteredTemplates = reportTemplates;

    if (category) {
      filteredTemplates = filteredTemplates.filter(template => 
        template.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (isDefault !== null) {
      const defaultFilter = isDefault === 'true';
      filteredTemplates = filteredTemplates.filter(template => 
        template.isDefault === defaultFilter
      );
    }

    // Sort by usage count (most used first)
    filteredTemplates.sort((a, b) => b.usageCount - a.usageCount);

    return NextResponse.json({
      templates: filteredTemplates,
      categories: Array.from(new Set(reportTemplates.map(t => t.category))),
      total: filteredTemplates.length
    });
  } catch (error) {
    console.error('Error fetching report templates:', error);
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

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, config } = body;

    if (!name || !description || !category || !config) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newTemplate: ReportTemplate = {
      id: Date.now().toString(),
      name,
      description,
      category,
      config,
      isDefault: false,
      createdBy: session.user.email || 'unknown',
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    reportTemplates.push(newTemplate);

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('Error creating report template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}