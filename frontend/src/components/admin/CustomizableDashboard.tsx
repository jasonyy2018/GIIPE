'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { DashboardWidget, DashboardLayout, WIDGET_SIZES } from '@/types/dashboard-widgets';
import { WidgetFactory } from './widgets/WidgetFactory';
import { WidgetLibrary } from './widgets/WidgetLibrary';
import { WidgetConfigModal } from './widgets/WidgetConfigModal';

// Import CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface CustomizableDashboardProps {
  initialLayout?: DashboardLayout;
  onLayoutChange?: (layout: DashboardLayout) => void;
  enableEditing?: boolean;
}

export default function CustomizableDashboard({
  initialLayout,
  onLayoutChange,
  enableEditing = true
}: CustomizableDashboardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [configWidget, setConfigWidget] = useState<DashboardWidget | null>(null);
  const [dashboardName, setDashboardName] = useState('My Dashboard');

  // Grid settings
  const gridSettings = {
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    rowHeight: 60,
    margin: [16, 16] as [number, number],
    containerPadding: [16, 16] as [number, number],
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
  };

  // Load initial layout
  useEffect(() => {
    if (initialLayout) {
      setWidgets(initialLayout.widgets);
      setDashboardName(initialLayout.name);
      
      // Convert widgets to grid layout format
      const gridLayout = initialLayout.widgets.map(widget => ({
        i: widget.id,
        x: widget.position.x,
        y: widget.position.y,
        w: widget.position.w,
        h: widget.position.h,
        minW: 2,
        minH: 2
      }));
      
      setLayouts({ lg: gridLayout });
    } else {
      // Load default widgets for demo
      loadDefaultWidgets();
    }
  }, [initialLayout]);

  const loadDefaultWidgets = () => {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'widget-1',
        title: 'Total Users',
        type: 'metric',
        size: 'medium',
        position: { x: 0, y: 0, w: 3, h: 3 },
        refreshInterval: 30,
        data: {
          value: 1247,
          previousValue: 1180,
          trend: 'up',
          trendPercentage: 5.7,
          unit: '',
          status: 'normal'
        },
        config: {
          showTrend: true,
          colorScheme: 'blue'
        },
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'widget-2',
        title: 'User Growth',
        type: 'chart',
        size: 'large',
        position: { x: 3, y: 0, w: 6, h: 4 },
        refreshInterval: 60,
        data: [
          { name: 'Jan', value: 400 },
          { name: 'Feb', value: 300 },
          { name: 'Mar', value: 600 },
          { name: 'Apr', value: 800 },
          { name: 'May', value: 700 },
          { name: 'Jun', value: 900 }
        ],
        config: {
          chartType: 'area',
          colorScheme: 'green'
        },
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'widget-3',
        title: 'System Health',
        type: 'status',
        size: 'medium',
        position: { x: 9, y: 0, w: 3, h: 3 },
        refreshInterval: 15,
        data: {
          overall: 'healthy',
          services: [
            { name: 'Database', status: 'online', responseTime: 45 },
            { name: 'Redis', status: 'online', responseTime: 12 },
            { name: 'Email Service', status: 'online', responseTime: 230 }
          ],
          uptime: 2592000,
          lastCheck: new Date().toISOString()
        },
        config: {
          colorScheme: 'green'
        },
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'widget-4',
        title: 'Recent Activity',
        type: 'activity',
        size: 'large',
        position: { x: 0, y: 4, w: 6, h: 4 },
        refreshInterval: 30,
        data: [
          {
            id: '1',
            type: 'user',
            action: 'registered',
            user: 'john.doe',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            severity: 'low'
          },
          {
            id: '2',
            type: 'event',
            action: 'created event',
            user: 'admin',
            target: 'Tech Conference 2024',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            severity: 'medium'
          }
        ],
        config: {
          maxItems: 10
        },
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'widget-5',
        title: 'Event Progress',
        type: 'progress',
        size: 'large',
        position: { x: 6, y: 4, w: 6, h: 4 },
        refreshInterval: 300,
        data: {
          items: [
            {
              id: '1',
              label: 'Tech Conference 2024',
              current: 75,
              target: 100,
              percentage: 75,
              status: 'on-track',
              unit: '%'
            },
            {
              id: '2',
              label: 'Workshop Series',
              current: 45,
              target: 60,
              percentage: 75,
              status: 'ahead',
              unit: 'sessions'
            }
          ]
        },
        config: {},
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    setWidgets(defaultWidgets);
    
    const gridLayout = defaultWidgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: 2,
      minH: 2
    }));
    
    setLayouts({ lg: gridLayout });
  };

  const handleLayoutChange = useCallback((layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
    
    // Update widget positions
    const updatedWidgets = widgets.map(widget => {
      const layoutItem = layout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          position: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          },
          updatedAt: new Date()
        };
      }
      return widget;
    });
    
    setWidgets(updatedWidgets);
    
    // Notify parent component
    if (onLayoutChange) {
      const dashboardLayout: DashboardLayout = {
        id: 'current',
        name: dashboardName,
        isDefault: false,
        widgets: updatedWidgets,
        gridSettings: {
          cols: gridSettings.cols.lg,
          rowHeight: gridSettings.rowHeight,
          margin: gridSettings.margin
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      onLayoutChange(dashboardLayout);
    }
  }, [widgets, dashboardName, onLayoutChange]);

  const handleAddWidget = (newWidget: DashboardWidget) => {
    // Find a good position for the new widget
    const existingPositions = widgets.map(w => w.position);
    let x = 0;
    let y = 0;
    
    // Simple positioning logic - place at the end of the last row
    if (existingPositions.length > 0) {
      const maxY = Math.max(...existingPositions.map(p => p.y + p.h));
      y = maxY;
    }
    
    const widgetWithPosition = {
      ...newWidget,
      position: {
        x,
        y,
        w: WIDGET_SIZES[newWidget.size].w,
        h: WIDGET_SIZES[newWidget.size].h
      }
    };
    
    setWidgets(prev => [...prev, widgetWithPosition]);
    
    // Update layouts
    const newLayoutItem = {
      i: newWidget.id,
      x,
      y,
      w: WIDGET_SIZES[newWidget.size].w,
      h: WIDGET_SIZES[newWidget.size].h,
      minW: 2,
      minH: 2
    };
    
    setLayouts(prev => ({
      ...prev,
      lg: [...(prev.lg || []), newLayoutItem]
    }));
  };

  const handleUpdateWidget = (updatedWidget: DashboardWidget) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === updatedWidget.id ? updatedWidget : widget
    ));
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
    setLayouts(prev => ({
      ...prev,
      lg: (prev.lg || []).filter(item => item.i !== widgetId)
    }));
  };

  const handleDuplicateWidget = (widget: DashboardWidget) => {
    const duplicatedWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${widget.title} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    handleAddWidget(duplicatedWidget);
  };

  const handleSaveLayout = async () => {
    // In a real implementation, this would save to the backend
    console.log('Saving layout:', { widgets, layouts });
    setIsEditing(false);
  };

  const handleResetLayout = () => {
    if (window.confirm('Are you sure you want to reset the dashboard to default layout?')) {
      loadDefaultWidgets();
      setIsEditing(false);
    }
  };

  return (
    <div className="customizable-dashboard">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dashboardName}</h1>
            <p className="text-sm text-gray-600">
              {widgets.length} widgets • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        {enableEditing && (
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setShowWidgetLibrary(true)}
                  className="px-3 py-2 text-sm font-medium text-primary bg-blue-50 rounded-md hover:bg-light transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Widget
                </button>
                <button
                  onClick={handleResetLayout}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <i className="fas fa-undo mr-2"></i>
                  Reset
                </button>
                <button
                  onClick={handleSaveLayout}
                  className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                  <i className="fas fa-save mr-2"></i>
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
              >
                <i className="fas fa-edit mr-2"></i>
                Customize
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editing Instructions */}
      {isEditing && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <i className="fas fa-info-circle text-primary mt-0.5"></i>
            <div>
              <h3 className="text-sm font-medium text-blue-900">Dashboard Editing Mode</h3>
              <p className="text-sm text-blue-700 mt-1">
                Drag widgets to rearrange them, resize by dragging corners, or use widget controls to configure, duplicate, or delete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          breakpoints={gridSettings.breakpoints}
          cols={gridSettings.cols}
          rowHeight={gridSettings.rowHeight}
          margin={gridSettings.margin}
          containerPadding={gridSettings.containerPadding}
          isDraggable={isEditing}
          isResizable={isEditing}
          compactType="vertical"
          preventCollision={false}
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="widget-container">
              <WidgetFactory
                widget={widget}
                isEditing={isEditing}
                onUpdate={handleUpdateWidget}
                onDelete={handleDeleteWidget}
                onDuplicate={handleDuplicateWidget}
              />
              
              {/* Edit Overlay */}
              {isEditing && (
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setConfigWidget(widget)}
                    className="p-1 bg-white rounded shadow-sm border border-gray-200 text-gray-600 hover:text-primary transition-colors"
                    title="Configure Widget"
                  >
                    <i className="fas fa-cog text-xs"></i>
                  </button>
                </div>
              )}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="text-center py-12">
          <i className="fas fa-th-large text-4xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No widgets added yet</h3>
          <p className="text-gray-600 mb-4">
            Start building your dashboard by adding widgets from the library.
          </p>
          {enableEditing && (
            <button
              onClick={() => {
                setIsEditing(true);
                setShowWidgetLibrary(true);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Your First Widget
            </button>
          )}
        </div>
      )}

      {/* Widget Library Modal */}
      <WidgetLibrary
        isOpen={showWidgetLibrary}
        onClose={() => setShowWidgetLibrary(false)}
        onAddWidget={handleAddWidget}
      />

      {/* Widget Configuration Modal */}
      <WidgetConfigModal
        widget={configWidget}
        isOpen={!!configWidget}
        onClose={() => setConfigWidget(null)}
        onSave={handleUpdateWidget}
      />

      {/* Custom Styles */}
      <style jsx>{`
        .widget-container {
          position: relative;
        }
        
        .widget-container:hover .group-hover\\:opacity-100 {
          opacity: 1;
        }
        
        .react-grid-item.react-grid-placeholder {
          background: rgb(59 130 246 / 0.1);
          border: 2px dashed rgb(59 130 246 / 0.3);
          border-radius: 8px;
        }
        
        .react-grid-item.cssTransforms {
          transition-property: transform;
          transition-duration: 200ms;
          transition-timing-function: ease;
        }
        
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZG90cyBmaWxsPSIjOTk5IiBkPSJtMTUgMTJjMCAuNTUyLS40NDggMS0xIDFzLTEtLjQ0OC0xLTEgLjQ0OC0xIDEtMSAxIC40NDggMSAxem0wIDRjMCAuNTUyLS40NDggMS0xIDFzLTEtLjQ0OC0xLTEgLjQ0OC0xIDEtMSAxIC40NDggMSAxem0wIDRjMCAuNTUyLS40NDggMS0xIDFzLTEtLjQ0OC0xLTEgLjQ0OC0xIDEtMSAxIC40NDggMSAxem0tNS00YzAtLjU1Mi40NDgtMSAxLTFzMSAuNDQ4IDEgMS0uNDQ4IDEtMSAxLTEtLjQ0OC0xLTF6bTAgNGMwLS41NTIuNDQ4LTEgMS0xczEgLjQ0OCAxIDEtLjQ0OCAxLTEgMS0xLS40NDgtMS0xem0wLThjMC0uNTUyLjQ0OC0xIDEtMXMxIC40NDggMSAxLS40NDggMS0xIDEtMS0uNDQ4LTEtMXptNC00YzAtLjU1Mi40NDgtMSAxLTFzMSAuNDQ4IDEgMS0uNDQ4IDEtMSAxLTEtLjQ0OC0xLTF6bTAgNGMwLS41NTIuNDQ4LTEgMS0xczEgLjQ0OCAxIDEtLjQ0OCAxLTEgMS0xLS40NDgtMS0xeiIvPgo8L3N2Zz4K');
          background-position: bottom right;
          padding: 0 3px 3px 0;
          background-repeat: no-repeat;
          background-origin: content-box;
          box-sizing: border-box;
          cursor: se-resize;
        }
      `}</style>
    </div>
  );
}

