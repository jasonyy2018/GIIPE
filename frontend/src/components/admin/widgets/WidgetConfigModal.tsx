'use client';

import React, { useState, useEffect } from 'react';
import { DashboardWidget, WIDGET_SIZES } from '@/types/dashboard-widgets';

interface WidgetConfigModalProps {
  widget: DashboardWidget | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (widget: DashboardWidget) => void;
}

export function WidgetConfigModal({ widget, isOpen, onClose, onSave }: WidgetConfigModalProps) {
  const [formData, setFormData] = useState<DashboardWidget | null>(null);

  useEffect(() => {
    if (widget) {
      setFormData({ ...widget });
    }
  }, [widget]);

  if (!isOpen || !widget || !formData) return null;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleConfigChange = (field: string, value: any) => {
    setFormData(prev => prev ? {
      ...prev,
      config: { ...prev.config, [field]: value }
    } : null);
  };

  const handleSave = () => {
    if (formData) {
      const updatedWidget = {
        ...formData,
        updatedAt: new Date()
      };
      onSave(updatedWidget);
      onClose();
    }
  };

  const renderBasicSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Widget Title
        </label>
        <input
          type="text"
          value={formData.config.customTitle || formData.title}
          onChange={(e) => handleConfigChange('customTitle', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Size
        </label>
        <select
          value={formData.size}
          onChange={(e) => handleInputChange('size', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="small">Small (2x2)</option>
          <option value="medium">Medium (3x3)</option>
          <option value="large">Large (4x4)</option>
          <option value="extra-large">Extra Large (6x4)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Refresh Interval (seconds)
        </label>
        <select
          value={formData.refreshInterval}
          onChange={(e) => handleInputChange('refreshInterval', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={0}>Manual</option>
          <option value={10}>10 seconds</option>
          <option value={30}>30 seconds</option>
          <option value={60}>1 minute</option>
          <option value={300}>5 minutes</option>
          <option value={900}>15 minutes</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color Scheme
        </label>
        <select
          value={formData.config.colorScheme || 'primary'}
          onChange={(e) => handleConfigChange('colorScheme', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="primary">Primary Blue</option>
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
          <option value="purple">Purple</option>
        </select>
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.config.showHeader !== false}
            onChange={(e) => handleConfigChange('showHeader', e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="ml-2 text-sm text-gray-700">Show Header</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.config.showFooter || false}
            onChange={(e) => handleConfigChange('showFooter', e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="ml-2 text-sm text-gray-700">Show Footer</span>
        </label>
      </div>
    </div>
  );

  const renderChartSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chart Type
        </label>
        <select
          value={formData.config.chartType || 'line'}
          onChange={(e) => handleConfigChange('chartType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="line">Line Chart</option>
          <option value="area">Area Chart</option>
          <option value="bar">Bar Chart</option>
          <option value="pie">Pie Chart</option>
          <option value="donut">Donut Chart</option>
        </select>
      </div>
    </div>
  );

  const renderMetricSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.config.showTrend || false}
            onChange={(e) => handleConfigChange('showTrend', e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="ml-2 text-sm text-gray-700">Show Trend Indicator</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Warning Threshold
          </label>
          <input
            type="number"
            value={formData.config.thresholds?.warning || ''}
            onChange={(e) => handleConfigChange('thresholds', {
              ...formData.config.thresholds,
              warning: e.target.value ? parseFloat(e.target.value) : undefined
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Critical Threshold
          </label>
          <input
            type="number"
            value={formData.config.thresholds?.critical || ''}
            onChange={(e) => handleConfigChange('thresholds', {
              ...formData.config.thresholds,
              critical: e.target.value ? parseFloat(e.target.value) : undefined
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Optional"
          />
        </div>
      </div>
    </div>
  );

  const renderListSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Maximum Items
        </label>
        <select
          value={formData.config.maxItems || 5}
          onChange={(e) => handleConfigChange('maxItems', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={3}>3 items</option>
          <option value={5}>5 items</option>
          <option value={10}>10 items</option>
          <option value={15}>15 items</option>
          <option value={20}>20 items</option>
        </select>
      </div>
    </div>
  );

  const renderDataSourceSettings = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data Source URL
        </label>
        <input
          type="text"
          value={formData.config.dataSource || ''}
          onChange={(e) => handleConfigChange('dataSource', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="/api/admin/..."
        />
        <p className="text-xs text-gray-500 mt-1">
          API endpoint to fetch widget data
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Configure Widget</h2>
            <p className="text-sm text-gray-600 mt-1">
              Customize the appearance and behavior of your widget
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="space-y-6">
            {/* Basic Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
              {renderBasicSettings()}
            </div>

            {/* Type-specific Settings */}
            {formData.type === 'chart' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Chart Settings</h3>
                {renderChartSettings()}
              </div>
            )}

            {formData.type === 'metric' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Metric Settings</h3>
                {renderMetricSettings()}
              </div>
            )}

            {(formData.type === 'list' || formData.type === 'activity') && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">List Settings</h3>
                {renderListSettings()}
              </div>
            )}

            {/* Data Source Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Data Source</h3>
              {renderDataSourceSettings()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}