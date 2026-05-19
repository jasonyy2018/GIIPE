'use client';

import { useState } from 'react';
import { Download, FileText, Calendar, Users, BarChart3, Filter, RefreshCw } from 'lucide-react';
import { SelectField, InputField } from './FormComponents';
import { cn } from '@/lib/utils';

interface ReportConfig {
  type: string;
  dateRange: string;
  format: string;
  filters: Record<string, any>;
}

interface ReportGeneratorProps {
  onGenerate: (config: ReportConfig) => Promise<void>;
  loading?: boolean;
  className?: string;
}

const reportTypes = [
  { value: 'users', label: 'User Analytics', icon: Users },
  { value: 'events', label: 'Event Performance', icon: Calendar },
  { value: 'registrations', label: 'Registration Report', icon: FileText },
  { value: 'engagement', label: 'Engagement Metrics', icon: BarChart3 }
];

const dateRanges = [
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last3months', label: 'Last 3 months' },
  { value: 'last6months', label: 'Last 6 months' },
  { value: 'lastyear', label: 'Last year' },
  { value: 'custom', label: 'Custom range' }
];

const exportFormats = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'excel', label: 'Excel Spreadsheet' },
  { value: 'csv', label: 'CSV File' },
  { value: 'json', label: 'JSON Data' }
];

export default function ReportGenerator({ onGenerate, loading = false, className }: ReportGeneratorProps) {
  const [config, setConfig] = useState<ReportConfig>({
    type: '',
    dateRange: 'last30days',
    format: 'pdf',
    filters: {}
  });
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const handleConfigChange = (key: keyof ReportConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    if (key === 'dateRange') {
      setShowCustomDate(value === 'custom');
    }
  };

  const handleGenerate = async () => {
    const finalConfig = { ...config };
    
    if (config.dateRange === 'custom') {
      finalConfig.filters = {
        ...finalConfig.filters,
        startDate: customStartDate,
        endDate: customEndDate
      };
    }
    
    await onGenerate(finalConfig);
  };

  const isValid = config.type && config.dateRange && config.format && 
    (!showCustomDate || (customStartDate && customEndDate));

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg p-6", className)}>
      <div className="flex items-center mb-6">
        <BarChart3 className="h-6 w-6 text-primary mr-2" />
        <h3 className="text-lg font-medium text-gray-900">Generate Report</h3>
      </div>

      <div className="space-y-6">
        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Report Type
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => handleConfigChange('type', type.value)}
                  className={cn(
                    "flex items-center p-3 border rounded-lg text-left transition-colors",
                    config.type === type.value
                      ? "border-primary bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range */}
        <SelectField
          label="Date Range"
          value={config.dateRange}
          onChange={(e) => handleConfigChange('dateRange', e.target.value)}
          options={dateRanges}
          required
        />

        {/* Custom Date Range */}
        {showCustomDate && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Start Date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              required
            />
            <InputField
              label="End Date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              required
            />
          </div>
        )}

        {/* Export Format */}
        <SelectField
          label="Export Format"
          value={config.format}
          onChange={(e) => handleConfigChange('format', e.target.value)}
          options={exportFormats}
          required
        />

        {/* Additional Filters */}
        {config.type && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center mb-3">
              <Filter className="h-4 w-4 text-gray-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-700">Additional Filters</h4>
            </div>
            
            {config.type === 'users' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="User Role"
                  value={config.filters.role || ''}
                  onChange={(e) => handleConfigChange('filters', { ...config.filters, role: e.target.value })}
                  options={[
                    { value: '', label: 'All Roles' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'editor', label: 'Editor' },
                    { value: 'member', label: 'Member' }
                  ]}
                />
                <SelectField
                  label="Status"
                  value={config.filters.status || ''}
                  onChange={(e) => handleConfigChange('filters', { ...config.filters, status: e.target.value })}
                  options={[
                    { value: '', label: 'All Users' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'inactive', label: 'Inactive Only' }
                  ]}
                />
              </div>
            )}

            {config.type === 'events' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="Event Status"
                  value={config.filters.status || ''}
                  onChange={(e) => handleConfigChange('filters', { ...config.filters, status: e.target.value })}
                  options={[
                    { value: '', label: 'All Events' },
                    { value: 'published', label: 'Published' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'completed', label: 'Completed' }
                  ]}
                />
                <InputField
                  label="Minimum Registrations"
                  type="number"
                  value={config.filters.minRegistrations || ''}
                  onChange={(e) => handleConfigChange('filters', { ...config.filters, minRegistrations: e.target.value })}
                  placeholder="0"
                />
              </div>
            )}
          </div>
        )}

        {/* Generate Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleGenerate}
            disabled={!isValid || loading}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
}