'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: 'today' | '7d' | '30d' | '90d' | 'custom';
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: Array<{
    id: string;
    label: string;
    getValue: () => DateRange;
  }>;
  maxDate?: Date;
  minDate?: Date;
  className?: string;
}

const defaultPresets = [
  {
    id: 'today',
    label: 'Today',
    getValue: () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      return { startDate: startOfDay, endDate: endOfDay, preset: 'today' as const };
    }
  },
  {
    id: '7d',
    label: 'Last 7 days',
    getValue: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: end, preset: '7d' as const };
    }
  },
  {
    id: '30d',
    label: 'Last 30 days',
    getValue: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: end, preset: '30d' as const };
    }
  },
  {
    id: '90d',
    label: 'Last 90 days',
    getValue: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: end, preset: '90d' as const };
    }
  }
];

export function DateRangeSelector({
  value,
  onChange,
  presets = defaultPresets,
  maxDate = new Date(),
  minDate,
  className = ''
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(
    value.startDate.toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    value.endDate.toISOString().split('T')[0]
  );
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>(
    value.preset && value.preset !== 'custom' ? 'presets' : 'custom'
  );
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update custom dates when value changes
  useEffect(() => {
    setCustomStartDate(value.startDate.toISOString().split('T')[0]);
    setCustomEndDate(value.endDate.toISOString().split('T')[0]);
  }, [value]);

  const handlePresetClick = (preset: { id: string; label: string; getValue: () => DateRange }) => {
    const newRange = preset.getValue();
    onChange(newRange);
    setIsOpen(false);
  };

  const handleCustomDateChange = () => {
    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);
    
    // Validate dates
    if (startDate > endDate) {
      return; // Invalid range
    }
    
    if (minDate && startDate < minDate) {
      return; // Before minimum date
    }
    
    if (maxDate && endDate > maxDate) {
      return; // After maximum date
    }

    onChange({
      startDate,
      endDate,
      preset: 'custom'
    });
    setIsOpen(false);
  };

  const formatDateRange = (range: DateRange) => {
    const { startDate, endDate, preset } = range;
    
    if (preset && preset !== 'custom') {
      const presetConfig = presets.find(p => p.id === preset);
      return presetConfig?.label || 'Custom Range';
    }
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined
      });
    };
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(startDate);
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const isPresetActive = (presetId: string) => {
    return value.preset === presetId;
  };

  const getMaxDateString = () => {
    return maxDate.toISOString().split('T')[0];
  };

  const getMinDateString = () => {
    return minDate?.toISOString().split('T')[0];
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
      >
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-900">
            {formatDateRange(value)}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-80 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'presets'
                  ? 'text-primary border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quick Select
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'custom'
                  ? 'text-primary border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'presets' ? (
              <div className="space-y-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors ${
                      isPresetActive(preset.id)
                        ? 'bg-light text-blue-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    max={customEndDate}
                    min={getMinDateString()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    max={getMaxDateString()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCustomDateChange}
                    disabled={!customStartDate || !customEndDate || new Date(customStartDate) > new Date(customEndDate)}
                    className="flex-1 px-3 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}