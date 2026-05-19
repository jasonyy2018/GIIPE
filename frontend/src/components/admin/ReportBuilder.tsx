'use client';

import React, { useState, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface ReportMetric {
  id: string;
  name: string;
  type: 'number' | 'percentage' | 'currency' | 'duration';
  category: string;
  description?: string;
}

interface ReportDimension {
  id: string;
  name: string;
  type: 'date' | 'category' | 'text' | 'boolean';
  category: string;
  description?: string;
}

interface ReportFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  label: string;
}

interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  metrics: string[];
  dimensions: string[];
  filters: ReportFilter[];
  groupBy: string[];
  sortBy: Array<{ field: string; direction: 'asc' | 'desc' }>;
  dateRange: {
    startDate: Date;
    endDate: Date;
    preset?: string;
  };
  format: 'table' | 'chart' | 'summary';
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}

interface ReportBuilderProps {
  availableMetrics: ReportMetric[];
  availableDimensions: ReportDimension[];
  initialConfig?: Partial<ReportConfig>;
  onSave: (config: ReportConfig) => Promise<void>;
  onPreview: (config: ReportConfig) => Promise<any>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ReportBuilder({
  availableMetrics,
  availableDimensions,
  initialConfig,
  onSave,
  onPreview,
  onCancel,
  isLoading = false
}: ReportBuilderProps) {
  const [config, setConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    metrics: [],
    dimensions: [],
    filters: [],
    groupBy: [],
    sortBy: [],
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    format: 'table',
    ...initialConfig
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'filters' | 'formatting' | 'schedule'>('basic');
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Drag and drop handlers
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === 'available-metrics' && destination.droppableId === 'selected-metrics') {
      setConfig(prev => ({
        ...prev,
        metrics: [...prev.metrics, draggableId]
      }));
    } else if (source.droppableId === 'selected-metrics' && destination.droppableId === 'available-metrics') {
      setConfig(prev => ({
        ...prev,
        metrics: prev.metrics.filter(id => id !== draggableId)
      }));
    } else if (source.droppableId === 'available-dimensions' && destination.droppableId === 'selected-dimensions') {
      setConfig(prev => ({
        ...prev,
        dimensions: [...prev.dimensions, draggableId]
      }));
    } else if (source.droppableId === 'selected-dimensions' && destination.droppableId === 'available-dimensions') {
      setConfig(prev => ({
        ...prev,
        dimensions: prev.dimensions.filter(id => id !== draggableId)
      }));
    }
  }, []);

  // Add filter
  const addFilter = useCallback(() => {
    const newFilter: ReportFilter = {
      id: `filter_${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      label: 'New Filter'
    };

    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  }, []);

  // Update filter
  const updateFilter = useCallback((filterId: string, updates: Partial<ReportFilter>) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map(filter =>
        filter.id === filterId ? { ...filter, ...updates } : filter
      )
    }));
  }, []);

  // Remove filter
  const removeFilter = useCallback((filterId: string) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(filter => filter.id !== filterId)
    }));
  }, []);

  // Validate configuration
  const validateConfig = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.name.trim()) {
      newErrors.name = 'Report name is required';
    }

    if (config.metrics.length === 0) {
      newErrors.metrics = 'At least one metric is required';
    }

    if (config.dateRange.startDate >= config.dateRange.endDate) {
      newErrors.dateRange = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [config]);

  // Preview report
  const handlePreview = useCallback(async () => {
    if (!validateConfig()) return;

    setIsPreviewLoading(true);
    try {
      const data = await onPreview(config);
      setPreviewData(data);
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [config, onPreview, validateConfig]);

  // Save report
  const handleSave = useCallback(async () => {
    if (!validateConfig()) return;

    try {
      await onSave(config);
    } catch (error) {
      console.error('Save failed:', error);
    }
  }, [config, onSave, validateConfig]);

  // Get available items (not selected)
  const getAvailableMetrics = () => 
    availableMetrics.filter(metric => !config.metrics.includes(metric.id));

  const getAvailableDimensions = () => 
    availableDimensions.filter(dimension => !config.dimensions.includes(dimension.id));

  // Get selected items
  const getSelectedMetrics = () => 
    config.metrics.map(id => availableMetrics.find(m => m.id === id)).filter(Boolean) as ReportMetric[];

  const getSelectedDimensions = () => 
    config.dimensions.map(id => availableDimensions.find(d => d.id === id)).filter(Boolean) as ReportDimension[];

  return (
    <div className="report-builder bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Report Builder</h2>
            <p className="text-gray-600 mt-1">Create custom reports with drag-and-drop interface</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handlePreview}
              disabled={isPreviewLoading || isLoading}
              className="px-4 py-2 text-sm font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPreviewLoading ? 'Previewing...' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Report'}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'basic', label: 'Basic Settings' },
            { id: 'filters', label: 'Filters' },
            { id: 'formatting', label: 'Formatting' },
            { id: 'schedule', label: 'Schedule' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'basic' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="space-y-6">
              {/* Report Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Name *
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter report name"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={config.description || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* Metrics Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Metrics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Available Metrics */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Available Metrics</h4>
                    <Droppable droppableId="available-metrics">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-48 p-4 border-2 border-dashed rounded-lg transition-colors ${
                            snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                          }`}
                        >
                          {getAvailableMetrics().map((metric, index) => (
                            <Draggable key={metric.id} draggableId={metric.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 mb-2 bg-white border border-gray-200 rounded-lg cursor-move transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="font-medium text-gray-900">{metric.name}</div>
                                  <div className="text-sm text-gray-600">{metric.category}</div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  {/* Selected Metrics */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Metrics</h4>
                    <Droppable droppableId="selected-metrics">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-48 p-4 border-2 border-dashed rounded-lg transition-colors ${
                            snapshot.isDraggingOver ? 'border-green-400 bg-green-50' : 'border-gray-300'
                          }`}
                        >
                          {getSelectedMetrics().map((metric, index) => (
                            <Draggable key={metric.id} draggableId={metric.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 mb-2 bg-green-50 border border-green-200 rounded-lg cursor-move transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="font-medium text-gray-900">{metric.name}</div>
                                  <div className="text-sm text-gray-600">{metric.category}</div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {config.metrics.length === 0 && (
                            <div className="text-gray-500 text-center py-8">
                              Drag metrics here to include in your report
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                    {errors.metrics && (
                      <p className="text-red-600 text-sm mt-1">{errors.metrics}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dimensions Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Dimensions</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Available Dimensions */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Available Dimensions</h4>
                    <Droppable droppableId="available-dimensions">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-32 p-4 border-2 border-dashed rounded-lg transition-colors ${
                            snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                          }`}
                        >
                          {getAvailableDimensions().map((dimension, index) => (
                            <Draggable key={dimension.id} draggableId={dimension.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 mb-2 bg-white border border-gray-200 rounded-lg cursor-move transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="font-medium text-gray-900">{dimension.name}</div>
                                  <div className="text-sm text-gray-600">{dimension.category}</div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  {/* Selected Dimensions */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Dimensions</h4>
                    <Droppable droppableId="selected-dimensions">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-32 p-4 border-2 border-dashed rounded-lg transition-colors ${
                            snapshot.isDraggingOver ? 'border-green-400 bg-green-50' : 'border-gray-300'
                          }`}
                        >
                          {getSelectedDimensions().map((dimension, index) => (
                            <Draggable key={dimension.id} draggableId={dimension.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 mb-2 bg-green-50 border border-green-200 rounded-lg cursor-move transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="font-medium text-gray-900">{dimension.name}</div>
                                  <div className="text-sm text-gray-600">{dimension.category}</div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {config.dimensions.length === 0 && (
                            <div className="text-gray-500 text-center py-4">
                              Drag dimensions here to group your data
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              </div>
            </div>
          </DragDropContext>
        )}

        {activeTab === 'filters' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Report Filters</h3>
              <button
                onClick={addFilter}
                className="px-4 py-2 text-sm font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-light transition-colors"
              >
                Add Filter
              </button>
            </div>

            {config.filters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No filters added. Click "Add Filter" to create your first filter.
              </div>
            ) : (
              <div className="space-y-4">
                {config.filters.map((filter) => (
                  <div key={filter.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
                        <select
                          value={filter.field}
                          onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select field</option>
                          {[...availableMetrics, ...availableDimensions].map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                        <select
                          value={filter.operator}
                          onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="equals">Equals</option>
                          <option value="not_equals">Not Equals</option>
                          <option value="contains">Contains</option>
                          <option value="greater_than">Greater Than</option>
                          <option value="less_than">Less Than</option>
                          <option value="between">Between</option>
                          <option value="in">In</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter value"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() => removeFilter(filter.id)}
                          className="w-full px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'formatting' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Format</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'table', label: 'Table', description: 'Tabular data display' },
                  { id: 'chart', label: 'Chart', description: 'Visual chart representation' },
                  { id: 'summary', label: 'Summary', description: 'Key metrics summary' }
                ].map((format) => (
                  <div
                    key={format.id}
                    onClick={() => setConfig(prev => ({ ...prev, format: format.id as any }))}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      config.format === format.id
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{format.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{format.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {config.format === 'chart' && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Chart Type</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'line', label: 'Line Chart' },
                    { id: 'bar', label: 'Bar Chart' },
                    { id: 'pie', label: 'Pie Chart' },
                    { id: 'area', label: 'Area Chart' }
                  ].map((chart) => (
                    <button
                      key={chart.id}
                      onClick={() => setConfig(prev => ({ ...prev, chartType: chart.id as any }))}
                      className={`p-3 text-sm font-medium border rounded-lg transition-colors ${
                        config.chartType === chart.id
                          ? 'border-primary bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {chart.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Scheduling</h3>
              <div className="flex items-center space-x-3 mb-6">
                <input
                  type="checkbox"
                  id="enable-schedule"
                  checked={config.schedule?.enabled || false}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      enabled: e.target.checked,
                      frequency: 'weekly',
                      time: '09:00',
                      recipients: []
                    }
                  }))}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="enable-schedule" className="text-sm font-medium text-gray-700">
                  Enable automatic report generation
                </label>
              </div>

              {config.schedule?.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select
                      value={config.schedule.frequency}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule!,
                          frequency: e.target.value as any
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={config.schedule.time}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule!,
                          time: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                    <textarea
                      value={config.schedule.recipients.join(', ')}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule!,
                          recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      placeholder="Enter email addresses separated by commas"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="border-t border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Preview</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}