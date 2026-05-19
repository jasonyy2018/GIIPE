'use client';

import { useState } from 'react';

enum DateRange {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom'
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange, startDate?: string, endDate?: string) => void;
  className?: string;
}

export function DateRangeSelector({ value, onChange, className = '' }: DateRangeSelectorProps) {
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const handleRangeChange = (range: DateRange) => {
    if (range === DateRange.CUSTOM) {
      onChange(range, customStartDate, customEndDate);
    } else {
      onChange(range);
    }
  };

  const handleCustomDateChange = () => {
    if (value === DateRange.CUSTOM && customStartDate && customEndDate) {
      onChange(DateRange.CUSTOM, customStartDate, customEndDate);
    }
  };

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <select
        value={value}
        onChange={(e) => handleRangeChange(e.target.value as DateRange)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value={DateRange.LAST_7_DAYS}>Last 7 days</option>
        <option value={DateRange.LAST_30_DAYS}>Last 30 days</option>
        <option value={DateRange.LAST_90_DAYS}>Last 90 days</option>
        <option value={DateRange.LAST_YEAR}>Last year</option>
        <option value={DateRange.CUSTOM}>Custom range</option>
      </select>

      {value === DateRange.CUSTOM && (
        <>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            onBlur={handleCustomDateChange}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            onBlur={handleCustomDateChange}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </>
      )}
    </div>
  );
}