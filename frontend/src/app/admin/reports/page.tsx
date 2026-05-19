'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ReportBuilder } from '@/components/admin/ReportBuilder';
import { ReportExporter } from '@/components/admin/ReportExporter';
import { ReportScheduler } from '@/components/admin/ReportScheduler';
import { ReportTemplates } from '@/components/admin/ReportTemplates';

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

interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  metrics: string[];
  dimensions: string[];
  filters: any[];
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

// Mock data for available metrics and dimensions
const AVAILABLE_METRICS: ReportMetric[] = [
  { id: 'user_registrations', name: 'User Registrations', type: 'number', category: 'Users' },
  { id: 'active_users', name: 'Active Users', type: 'number', category: 'Users' },
  { id: 'event_registrations', name: 'Event Registrations', type: 'number', category: 'Events' },
  { id: 'attendance_rate', name: 'Attendance Rate', type: 'percentage', category: 'Events' },
  { id: 'revenue', name: 'Revenue', type: 'currency', category: 'Financial' },
  { id: 'session_duration', name: 'Session Duration', type: 'duration', category: 'Engagement' },
  { id: 'page_views', name: 'Page Views', type: 'number', category: 'Engagement' },
  { id: 'conversion_rate', name: 'Conversion Rate', type: 'percentage', category: 'Engagement' }
];

const AVAILABLE_DIMENSIONS: ReportDimension[] = [
  { id: 'date', name: 'Date', type: 'date', category: 'Time' },
  { id: 'user_type', name: 'User Type', type: 'category', category: 'Users' },
  { id: 'event_type', name: 'Event Type', type: 'category', category: 'Events' },
  { id: 'location', name: 'Location', type: 'category', category: 'Geography' },
  { id: 'device_type', name: 'Device Type', type: 'category', category: 'Technology' },
  { id: 'traffic_source', name: 'Traffic Source', type: 'category', category: 'Marketing' }
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'builder' | 'templates' | 'scheduler' | 'export'>('builder');
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadSchedules();
    loadTemplates();
  }, []);

  // Load report schedules
  const loadSchedules = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/reports');
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }, []);

  // Load report templates
  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/reports/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }, []);

  // Handle report save
  const handleReportSave = useCallback(async (config: ReportConfig) => {
    setIsLoading(true);
    try {
      // In a real implementation, this would save the report configuration
      console.log('Saving report config:', config);
      setReportConfig(config);
      
      // Generate mock data for preview
      const mockData = generateMockReportData(config);
      setReportData(mockData);
    } catch (error) {
      console.error('Error saving report:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle report preview
  const handleReportPreview = useCallback(async (config: ReportConfig) => {
    setIsLoading(true);
    try {
      // Generate mock data for preview
      const mockData = generateMockReportData(config);
      setReportData(mockData);
      setReportConfig(config);
      return mockData;
    } catch (error) {
      console.error('Error generating preview:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle schedule operations
  const handleScheduleCreate = useCallback(async (schedule: any) => {
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
      
      if (response.ok) {
        await loadSchedules();
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  }, [loadSchedules]);

  const handleScheduleUpdate = useCallback(async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/admin/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        await loadSchedules();
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  }, [loadSchedules]);

  const handleScheduleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reports/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadSchedules();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  }, [loadSchedules]);

  const handleScheduleToggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          schedule: { enabled }
        })
      });
      
      if (response.ok) {
        await loadSchedules();
      }
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  }, [loadSchedules]);

  // Handle template operations
  const handleTemplateSelect = useCallback((template: any) => {
    // Switch to builder tab and load template config
    setActiveTab('builder');
    // In a real implementation, this would populate the report builder with template config
    console.log('Selected template:', template);
  }, []);

  const handleTemplateCreate = useCallback(async (template: any) => {
    try {
      const response = await fetch('/api/admin/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      
      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  }, [loadTemplates]);

  const handleTemplateDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reports/templates/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  }, [loadTemplates]);

  // Generate mock report data
  const generateMockReportData = (config: ReportConfig) => {
    const data = [];
    const recordCount = Math.floor(Math.random() * 50) + 10;
    
    for (let i = 0; i < recordCount; i++) {
      const record: any = {};
      
      // Add dimension data
      config.dimensions.forEach(dimId => {
        const dimension = AVAILABLE_DIMENSIONS.find(d => d.id === dimId);
        if (dimension) {
          switch (dimension.type) {
            case 'date':
              record[dimId] = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
              break;
            case 'category':
              const categories = ['Category A', 'Category B', 'Category C'];
              record[dimId] = categories[Math.floor(Math.random() * categories.length)];
              break;
            default:
              record[dimId] = `${dimension.name} ${i + 1}`;
          }
        }
      });
      
      // Add metric data
      config.metrics.forEach(metricId => {
        const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
        if (metric) {
          switch (metric.type) {
            case 'number':
              record[metricId] = Math.floor(Math.random() * 1000) + 1;
              break;
            case 'percentage':
              record[metricId] = Math.random() * 100;
              break;
            case 'currency':
              record[metricId] = Math.random() * 10000;
              break;
            case 'duration':
              record[metricId] = Math.floor(Math.random() * 3600); // seconds
              break;
          }
        }
      });
      
      data.push(record);
    }
    
    return data;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">
            Create, schedule, and export comprehensive reports for your platform
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'builder', label: 'Report Builder', icon: '🔧' },
              { id: 'templates', label: 'Templates', icon: '📋' },
              { id: 'scheduler', label: 'Scheduling', icon: '📅' },
              { id: 'export', label: 'Export', icon: '📤' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {activeTab === 'builder' && (
            <ReportBuilder
              availableMetrics={AVAILABLE_METRICS}
              availableDimensions={AVAILABLE_DIMENSIONS}
              onSave={handleReportSave}
              onPreview={handleReportPreview}
              onCancel={() => {}}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'templates' && (
            <div className="p-6">
              <ReportTemplates
                templates={templates}
                categories={categories}
                onTemplateSelect={handleTemplateSelect}
                onTemplateCreate={handleTemplateCreate}
                onTemplateDelete={handleTemplateDelete}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeTab === 'scheduler' && (
            <div className="p-6">
              <ReportScheduler
                schedules={schedules}
                onScheduleCreate={handleScheduleCreate}
                onScheduleUpdate={handleScheduleUpdate}
                onScheduleDelete={handleScheduleDelete}
                onScheduleToggle={handleScheduleToggle}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeTab === 'export' && (
            <div className="p-6">
              {reportData.length > 0 && reportConfig ? (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Export Report: {reportConfig.name}
                    </h3>
                    <p className="text-gray-600">
                      {reportData.length} records ready for export
                    </p>
                  </div>
                  
                  <ReportExporter
                    data={reportData}
                    reportName={reportConfig.name}
                    reportMetadata={{
                      generatedAt: new Date(),
                      generatedBy: 'Admin User',
                      description: reportConfig.description,
                      totalRecords: reportData.length
                    }}
                    onExportStart={(format) => console.log('Export started:', format)}
                    onExportComplete={(format, success) => console.log('Export completed:', format, success)}
                    onExportError={(error) => console.error('Export error:', error)}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data</h3>
                  <p className="text-gray-600 mb-4">
                    Create and preview a report first to enable export functionality
                  </p>
                  <button
                    onClick={() => setActiveTab('builder')}
                    className="px-4 py-2 text-sm font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-light transition-colors"
                  >
                    Go to Report Builder
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}