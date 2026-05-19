'use client';

import { useState } from 'react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface AdminDataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export default function AdminDataTable({
  columns,
  data,
  loading = false,
  onRowClick,
  actions,
  searchable = false,
  searchPlaceholder = "Search...",
  emptyMessage = "No data available"
}: AdminDataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const filteredData = searchable 
    ? data.filter(row => 
        columns.some(column => {
          const value = row[column.key];
          return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
        })
      )
    : data;

  const sortedData = sortColumn 
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredData;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {searchable && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <i className={`fas fa-chevron-up text-xs ${
                          sortColumn === column.key && sortDirection === 'asc' 
                            ? 'text-primary' 
                            : 'text-gray-300'
                        }`}></i>
                        <i className={`fas fa-chevron-down text-xs -mt-1 ${
                          sortColumn === column.key && sortDirection === 'desc' 
                            ? 'text-primary' 
                            : 'text-gray-300'
                        }`}></i>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.length > 0 ? (
              sortedData.map((row, index) => (
                <tr 
                  key={index} 
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                      {column.render 
                        ? column.render(row[column.key], row)
                        : <span className="text-sm text-gray-900">{row[column.key]}</span>
                      }
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={columns.length + (actions ? 1 : 0)} 
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <i className="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                    <p className="text-lg font-medium text-gray-400">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sortedData.length > 0 && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{sortedData.length}</span> of{' '}
              <span className="font-medium">{data.length}</span> results
            </p>
            {searchable && searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}