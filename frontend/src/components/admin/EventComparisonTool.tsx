'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Users, FileText, TrendingUp, MapPin, CheckCircle } from 'lucide-react';

interface EventComparisonData {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  totalRegistrations: number;
  totalSubmissions: number;
  maxAttendees?: number;
  capacityUtilization?: number;
  location?: string;
}

interface EventComparisonToolProps {
  selectedEventIds: string[];
  onEventSelect?: (eventIds: string[]) => void;
}

export default function EventComparisonTool({ selectedEventIds, onEventSelect }: EventComparisonToolProps) {
  const [comparisonData, setComparisonData] = useState<EventComparisonData[]>([]);
  const [availableEvents, setAvailableEvents] = useState<EventComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  useEffect(() => {
    fetchAvailableEvents();
  }, []);

  useEffect(() => {
    if (selectedEventIds.length > 0) {
      fetchComparisonData();
    } else {
      setComparisonData([]);
    }
  }, [selectedEventIds]);

  const fetchAvailableEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/events?limit=100&status=PUBLISHED', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setAvailableEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching available events:', error);
      setError('Failed to load available events');
    }
  };

  const fetchComparisonData = async () => {
    if (selectedEventIds.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/events/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ eventIds: selectedEventIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comparison data');
      }

      const data = await response.json();
      setComparisonData(data.events || []);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      setError('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleEventToggle = (eventId: string) => {
    const newSelection = selectedEventIds.includes(eventId)
      ? selectedEventIds.filter(id => id !== eventId)
      : [...selectedEventIds, eventId];
    
    if (onEventSelect) {
      onEventSelect(newSelection);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'text-green-600 bg-green-100';
      case 'DRAFT': return 'text-yellow-600 bg-yellow-100';
      case 'CANCELLED': return 'text-red-600 bg-red-100';
      case 'COMPLETED': return 'text-primary bg-light';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const chartData = comparisonData.map(event => ({
    name: event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title,
    registrations: event.totalRegistrations,
    submissions: event.totalSubmissions,
    capacity: event.maxAttendees || 0,
    utilization: event.capacityUtilization || 0,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <i className="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Comparison</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={fetchComparisonData}
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
              Event Comparison Tool
            </h2>
            <p className="text-gray-600">
              Compare performance metrics across multiple events
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-4 py-2 text-sm rounded-md ${
                viewMode === 'chart'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Chart View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 text-sm rounded-md ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Event Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Events to Compare</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
          {availableEvents.map(event => (
            <div
              key={event.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedEventIds.includes(event.id)
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleEventToggle(event.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(event.startDate)} - {formatDate(event.endDate)}
                  </p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-xs text-gray-600">
                      <Users className="h-3 w-3 inline mr-1" />
                      {event.totalRegistrations}
                    </span>
                    <span className="text-xs text-gray-600">
                      <FileText className="h-3 w-3 inline mr-1" />
                      {event.totalSubmissions}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  {selectedEventIds.includes(event.id) && (
                    <CheckCircle className="h-5 w-5 text-primary mb-2" />
                  )}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {selectedEventIds.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-primary-dark text-sm">
              {selectedEventIds.length} event{selectedEventIds.length > 1 ? 's' : ''} selected for comparison
            </p>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {comparisonData.length > 0 && (
        <>
          {viewMode === 'chart' ? (
            <div className="space-y-6">
              {/* Registration and Submission Comparison */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Registrations vs Submissions
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="registrations" fill="#3b82f6" name="Registrations" />
                      <Bar dataKey="submissions" fill="#10b981" name="Submissions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Capacity Utilization */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Capacity Utilization
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.filter(d => d.capacity > 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [`${value}%`, 'Utilization']} />
                      <Bar dataKey="utilization" fill="#f59e0b" name="Capacity Utilization %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Registration Distribution */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Registration Distribution
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="registrations"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Event Comparison Table
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registrations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {comparisonData.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{event.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(event.startDate)} - {formatDate(event.endDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{event.totalRegistrations}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{event.totalSubmissions}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {event.maxAttendees || 'Unlimited'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1">
                              {event.capacityUtilization !== null && event.capacityUtilization !== undefined ? (
                                <>
                                  <div className="text-sm text-gray-900 mb-1">
                                    {Math.round(event.capacityUtilization)}%
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-primary h-2 rounded-full"
                                      style={{ width: `${Math.min(event.capacityUtilization, 100)}%` }}
                                    ></div>
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm text-gray-500">N/A</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{event.location || 'Not specified'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {comparisonData.reduce((sum, event) => sum + event.totalRegistrations, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Registrations</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {comparisonData.reduce((sum, event) => sum + event.totalSubmissions, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Submissions</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {Math.round(
                    comparisonData.reduce((sum, event) => sum + event.totalRegistrations, 0) / 
                    comparisonData.length
                  )}
                </div>
                <div className="text-sm text-gray-600">Avg Registrations</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {Math.round(
                    comparisonData?.filter(event => event.capacityUtilization !== null)
                      .reduce((sum, event) => sum + (event.capacityUtilization || 0), 0) / 
                    Math.max(1, comparisonData.filter(event => event.capacityUtilization !== null).length)
                  )}%
                </div>
                <div className="text-sm text-gray-600">Avg Capacity Utilization</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Empty State */}
      {selectedEventIds.length === 0 && !loading && (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Selected</h3>
          <p className="text-gray-600">
            Select events from the list above to start comparing their performance metrics.
          </p>
        </div>
      )}
    </div>
  );
}