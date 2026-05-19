'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { analyticsAPI } from '@/lib/analytics-api';
import { AnalyticsQuery } from '@/types/analytics';

interface ExportButtonProps {
  query: AnalyticsQuery;
  className?: string;
}

export function ExportButton({ query, className = '' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const data = await analyticsAPI.exportAnalyticsData(query);
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      alert('Failed to export analytics data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Download className="w-4 h-4 mr-2" />
      {isExporting ? 'Exporting...' : 'Export Data'}
    </button>
  );
}