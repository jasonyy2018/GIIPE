'use client';

import React from 'react';
import { DashboardWidget } from '@/types/dashboard-widgets';
import { MetricWidget } from './MetricWidget';
import { ChartWidget } from './ChartWidget';
import { ListWidget } from './ListWidget';
import { StatusWidget } from './StatusWidget';
import { ActivityWidget } from './ActivityWidget';
import { ProgressWidget } from './ProgressWidget';

interface WidgetFactoryProps {
  widget: DashboardWidget;
  isEditing?: boolean;
  onUpdate?: (widget: DashboardWidget) => void;
  onDelete?: (widgetId: string) => void;
  onDuplicate?: (widget: DashboardWidget) => void;
}

export function WidgetFactory({
  widget,
  isEditing,
  onUpdate,
  onDelete,
  onDuplicate
}: WidgetFactoryProps) {
  const commonProps = {
    widget,
    isEditing,
    onUpdate,
    onDelete,
    onDuplicate
  };

  switch (widget.type) {
    case 'metric':
      return <MetricWidget {...commonProps} />;
    case 'chart':
      return <ChartWidget {...commonProps} />;
    case 'list':
      return <ListWidget {...commonProps} />;
    case 'status':
      return <StatusWidget {...commonProps} />;
    case 'activity':
      return <ActivityWidget {...commonProps} />;
    case 'progress':
      return <ProgressWidget {...commonProps} />;
    default:
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center text-gray-500">
            <i className="fas fa-question-circle text-2xl mb-2"></i>
            <p>Unknown widget type: {widget.type}</p>
          </div>
        </div>
      );
  }
}