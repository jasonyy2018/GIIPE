'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { dashboardCustomizationService } from '@/services/dashboardCustomizationService';
import DashboardWidget from './DashboardWidget';
import type { DashboardLayout, DashboardPreferences, DashboardWidget as WidgetType } from '@/types/dashboard';

// Import all widget components
import StatsOverview from './StatsOverview';
import ActivityFeed from './ActivityFeed';
import PersonalAnalytics from './PersonalAnalytics';
import UpcomingEvents from './UpcomingEvents';
import SavedContent from './SavedContent';
import ContentRecommendations from './ContentRecommendations';
import SocialInteractions from './SocialInteractions';
import NetworkActivity from './NetworkActivity';
import ConnectionRecommendations from './ConnectionRecommendations';
import QuickActionsPanel from './QuickActionsPanel';
import ContentDiscovery from './ContentDiscovery';

interface CustomizableDashboardGridProps {
  userId: string;
  layout?: DashboardLayout;
  preferences?: DashboardPreferences;
  onLayoutChange?: (layout: DashboardLayout) => void;
  editMode?: boolean;
}

// Widget component mapping
const WIDGET_COMPONENTS = {
  StatsOverview,
  ActivityFeed,
  PersonalAnalytics,
  UpcomingEvents,
  SavedContent,
  ContentRecommendations,
  SocialInteractions,
  NetworkActivity,
  ConnectionRecommendations,
  QuickActionsPanel,
  ContentDiscovery
};

export default function CustomizableDashboardGrid({
  userId,
  layout: propLayout,
  preferences: propPreferences,
  onLayoutChange,
  editMode = false
}: CustomizableDashboardGridProps) {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [preferences, setPreferences] = useState<DashboardPreferences | null>(null);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (propLayout && propPreferences) {
      setLayout(propLayout);
      setPreferences(propPreferences);
    } else {
      loadDashboardData();
    }

    // Subscribe to customization changes
    const unsubscribe = dashboardCustomizationService.subscribe(() => {
      if (!propLayout || !propPreferences) {
        loadDashboardData();
      }
    });

    return unsubscribe;
  }, [userId, propLayout, propPreferences]);

  const loadDashboardData = useCallback(() => {
    const currentLayout = dashboardCustomizationService.getCurrentLayout(userId);
    const currentPreferences = dashboardCustomizationService.getPreferences(userId);
    
    setLayout(currentLayout);
    setPreferences(currentPreferences);
  }, [userId]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !layout || !editMode) return;

    const { source, destination } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return; // No change
    }

    // Reorder widgets
    const newWidgets = Array.from(layout.widgets);
    const [reorderedWidget] = newWidgets.splice(source.index, 1);
    newWidgets.splice(destination.index, 0, reorderedWidget);

    const updatedLayout = {
      ...layout,
      widgets: newWidgets
    };

    setLayout(updatedLayout);
    
    if (onLayoutChange) {
      onLayoutChange(updatedLayout);
    } else {
      dashboardCustomizationService.saveLayout(userId, updatedLayout);
    }
  };

  const refreshWidget = async (widgetId: string) => {
    setRefreshing(prev => ({ ...prev, [widgetId]: true }));
    try {
      // Simulate widget refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      // In real app, this would refresh specific widget data
    } catch (error) {
      console.error(`Error refreshing widget ${widgetId}:`, error);
    } finally {
      setRefreshing(prev => ({ ...prev, [widgetId]: false }));
    }
  };

  const renderWidget = (widget: WidgetType) => {
    const WidgetComponent = WIDGET_COMPONENTS[widget.component as keyof typeof WIDGET_COMPONENTS];
    
    if (!WidgetComponent) {
      return (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
          <p className="text-sm">Widget not found: {widget.component}</p>
        </div>
      );
    }

    // Common props for all widgets
    const commonProps = {
      userId,
      limit: 5, // Default limit, can be overridden by widget settings
      ...widget.settings
    };

    return <WidgetComponent {...commonProps} />;
  };

  if (!layout || !preferences) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter out hidden widgets
  const visibleWidgets = layout.widgets.filter(widget => 
    widget.enabled && !preferences.hiddenWidgets.includes(widget.id)
  );

  // Apply theme styles
  const currentTheme = dashboardCustomizationService.getTheme(preferences.currentTheme);
  const themeStyles = currentTheme ? {
    '--primary-color': currentTheme.colors.primary,
    '--secondary-color': currentTheme.colors.secondary,
    '--background-color': currentTheme.colors.background,
    '--surface-color': currentTheme.colors.surface,
    '--text-color': currentTheme.colors.text,
    '--accent-color': currentTheme.colors.accent
  } as React.CSSProperties : {};

  const spacingClass = {
    compact: 'gap-3',
    normal: 'gap-6',
    spacious: 'gap-8'
  }[currentTheme?.spacing || 'normal'];

  const borderRadiusClass = {
    none: 'rounded-none',
    small: 'rounded',
    medium: 'rounded-lg',
    large: 'rounded-xl'
  }[currentTheme?.borderRadius || 'medium'];

  return (
    <div 
      className={`space-y-6 ${preferences.compactMode ? 'space-y-4' : ''}`}
      style={themeStyles}
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-widgets" direction="vertical">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-${layout.gridColumns} ${spacingClass} ${
                editMode && snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300 p-4 rounded-lg' : ''
              }`}
            >
              {visibleWidgets.map((widget, index) => (
                <Draggable
                  key={widget.id}
                  draggableId={widget.id}
                  index={index}
                  isDragDisabled={!editMode}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${
                        widget.position.width === 2 ? 'lg:col-span-2' :
                        widget.position.width === 3 ? 'xl:col-span-3' :
                        widget.position.width === 4 ? 'xl:col-span-4' :
                        'col-span-1'
                      } ${
                        snapshot.isDragging ? 'z-50 rotate-2 scale-105' : ''
                      } ${
                        preferences.enableAnimations ? 'transition-all duration-200' : ''
                      }`}
                      style={provided.draggableProps.style}
                    >
                      <DashboardWidget
                        id={widget.id}
                        title={preferences.showWidgetTitles ? widget.title : ''}
                        onRefresh={() => refreshWidget(widget.id)}
                        loading={refreshing[widget.id]}
                        className={`${borderRadiusClass} ${
                          editMode ? 'ring-2 ring-blue-200 ring-opacity-50' : ''
                        }`}
                      >
                        {editMode && (
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-2 right-2 p-2 bg-white rounded-lg shadow-sm border border-gray-200 cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <i className="fas fa-grip-vertical text-gray-400"></i>
                          </div>
                        )}
                        {renderWidget(widget)}
                      </DashboardWidget>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              
              {/* Empty state for edit mode */}
              {editMode && visibleWidgets.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <i className="fas fa-puzzle-piece text-4xl mb-4"></i>
                  <h3 className="text-lg font-medium mb-2">No widgets added yet</h3>
                  <p className="text-sm">
                    Drag widgets from the sidebar to customize your dashboard
                  </p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Edit mode overlay */}
      {editMode && (
        <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">Edit Mode Active</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Drag widgets to reorder them
          </p>
        </div>
      )}
    </div>
  );
}