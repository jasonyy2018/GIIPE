import { NextRequest, NextResponse } from 'next/server';
import { DashboardWidget, DashboardLayout } from '@/types/dashboard-widgets';

// Mock data for demonstration
let mockLayouts: DashboardLayout[] = [
  {
    id: 'default',
    name: 'Default Dashboard',
    isDefault: true,
    widgets: [],
    gridSettings: {
      cols: 12,
      rowHeight: 60,
      margin: [16, 16]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const layoutId = searchParams.get('layoutId');

    if (layoutId) {
      const layout = mockLayouts.find(l => l.id === layoutId);
      if (!layout) {
        return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
      }
      return NextResponse.json(layout);
    }

    // Return all layouts
    return NextResponse.json(mockLayouts);
  } catch (error) {
    console.error('Error fetching dashboard layouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard layouts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const layout: DashboardLayout = await request.json();
    
    // Validate layout
    if (!layout.name || !layout.widgets) {
      return NextResponse.json(
        { error: 'Invalid layout data' },
        { status: 400 }
      );
    }

    // Create new layout
    const newLayout: DashboardLayout = {
      ...layout,
      id: `layout-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockLayouts.push(newLayout);

    return NextResponse.json(newLayout, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard layout:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard layout' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const layout: DashboardLayout = await request.json();
    
    if (!layout.id) {
      return NextResponse.json(
        { error: 'Layout ID is required' },
        { status: 400 }
      );
    }

    const index = mockLayouts.findIndex(l => l.id === layout.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    // Update layout
    mockLayouts[index] = {
      ...layout,
      updatedAt: new Date()
    };

    return NextResponse.json(mockLayouts[index]);
  } catch (error) {
    console.error('Error updating dashboard layout:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard layout' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const layoutId = searchParams.get('layoutId');

    if (!layoutId) {
      return NextResponse.json(
        { error: 'Layout ID is required' },
        { status: 400 }
      );
    }

    const index = mockLayouts.findIndex(l => l.id === layoutId);
    if (index === -1) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    // Don't allow deletion of default layout
    if (mockLayouts[index].isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default layout' },
        { status: 400 }
      );
    }

    mockLayouts.splice(index, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard layout:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard layout' },
      { status: 500 }
    );
  }
}