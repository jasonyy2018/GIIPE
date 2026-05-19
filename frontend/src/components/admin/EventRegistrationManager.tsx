'use client';

import { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from './DataTable';
import { Download, Users, Filter, RefreshCw } from 'lucide-react';

interface Registration {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED';
  registeredAt: string;
  additionalInfo?: any;
  user: {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    createdAt: string;
  };
}

interface EventRegistrationManagerProps {
  eventId: string;
  eventTitle: string;
}

export default function EventRegistrationManager({ eventId, eventTitle }: EventRegistrationManagerProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedStatus) {
        params.append('status', selectedStatus);
      }
      
      const response = await fetch(`/api/admin/events/${eventId}/registrations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }

      const data = await response.json();
      setRegistrations(data.registrations);
      setTotalRegistrations(data.total);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, [eventId, selectedStatus]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/events/${eventId}/registrations/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export registrations');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_registrations.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting registrations:', error);
      setError('Failed to export registrations');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CONFIRMED: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      WAITLISTED: { color: 'bg-gray-100 text-gray-800', label: 'Waitlisted' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const columns: Column<Registration>[] = [
    {
      key: 'user.username',
      title: 'Username',
      sortable: true,
      filterable: true,
      render: (_, row) => row.user.username,
    },
    {
      key: 'user.email',
      title: 'Email',
      sortable: true,
      filterable: true,
      render: (_, row) => row.user.email,
    },
    {
      key: 'user.firstName',
      title: 'Name',
      sortable: true,
      render: (_, row) => {
        const firstName = row.user.firstName || '';
        const lastName = row.user.lastName || '';
        return firstName || lastName ? `${firstName} ${lastName}`.trim() : '-';
      },
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      filterable: true,
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'registeredAt',
      title: 'Registration Date',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <i className="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Registrations</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={fetchRegistrations}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Registration Management: {eventTitle}
            </h2>
            <p className="text-gray-600">
              Manage event registrations and attendee information
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-1" />
              {totalRegistrations} Total Registrations
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="WAITLISTED">Waitlisted</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchRegistrations}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Export Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting || registrations.length === 0}
              className="flex items-center space-x-2 px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            
            <button
              onClick={() => handleExport('excel')}
              disabled={exporting || registrations.length === 0}
              className="flex items-center space-x-2 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Registration Table */}
      <DataTable
        data={registrations}
        columns={columns}
        loading={loading}
        emptyMessage="No registrations found for this event"
        searchable={true}
        filterable={true}
        pagination={true}
        pageSize={20}
      />

      {/* Registration Statistics */}
      {registrations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['CONFIRMED', 'PENDING', 'CANCELLED', 'WAITLISTED'].map(status => {
              const count = registrations.filter(reg => reg.status === status).length;
              const percentage = registrations.length > 0 ? (count / registrations.length * 100).toFixed(1) : '0';
              
              return (
                <div key={status} className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{count}</div>
                  <div className="text-sm text-gray-600 mb-2">{status.toLowerCase()}</div>
                  <div className="text-xs text-gray-500">{percentage}% of total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}