'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface EventAnalyticsProps {
  eventId: string;
}

interface AnalyticsData {
  eventId: string;
  eventTitle: string;
  totalRegistrations: number;
  totalSubmissions: number;
  maxAttendees?: number;
  capacityUtilization?: number;
  registrationTrends: Array<{ date: string; count: number }>;
  attendanceProjections: {
    projectedAttendance: number;
    confidence: string;
    daysUntilEvent: number;
    registrationRate: number;
  };
  registrationStatusBreakdown: Record<string, number>;
}

export default function EventAnalyticsDashboard({ eventId }: EventAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [eventId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/events/${eventId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <i className="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
          <div>
            <h3 className="text-red-800 font-medium">Error Loading Analytics</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  // Prepare chart data
  const registrationTrendData = analytics.registrationTrends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString(),
    count: trend.count,
  }));

  const statusBreakdownData = Object.entries(analytics.registrationStatusBreakdown).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
    value: count,
  }));

  const COLORS = {
    CONFIRMED: '#22c55e',   // green
    PENDING: '#fbbf24',     // yellow
    CANCELLED: '#ef4444',   // red
    WAITLISTED: '#9ca3af', // gray
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Event Analytics: {analytics.eventTitle}
        </h2>
        <p className="text-gray-600">
          Comprehensive analytics and performance metrics for this event
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-light rounded-lg">
              <i className="fas fa-users text-primary"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Registrations</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalRegistrations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <i className="fas fa-file-alt text-green-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Submissions</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalSubmissions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <i className="fas fa-chart-line text-purple-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Capacity Utilization</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.capacityUtilization 
                  ? `${Math.round(analytics.capacityUtilization)}%`
                  : 'Unlimited'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <i className="fas fa-calendar-day text-orange-600"></i>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Days Until Event</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.attendanceProjections.daysUntilEvent > 0 
                  ? analytics.attendanceProjections.daysUntilEvent: 'Started'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trends */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Registration Status Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name.toUpperCase() as keyof typeof COLORS] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Attendance Projections */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Projections</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {analytics.attendanceProjections.projectedAttendance}
            </div>
            <div className="text-sm text-gray-600">Projected Attendance</div>
          </div>
          
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(analytics.attendanceProjections.confidence)}`}>
              {analytics.attendanceProjections.confidence.toUpperCase()} CONFIDENCE
            </div>
            <div className="text-sm text-gray-600 mt-2">Prediction Confidence</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {analytics.attendanceProjections.registrationRate}
            </div>
            <div className="text-sm text-gray-600">Registrations/Day</div>
          </div>
        </div>

        {analytics.maxAttendees && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Capacity Progress</span>
              <span>
                {analytics.totalRegistrations} / {analytics.maxAttendees} 
                ({Math.round((analytics.totalRegistrations / analytics.maxAttendees) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((analytics.totalRegistrations / analytics.maxAttendees) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
        <div className="space-y-4">
          {analytics.capacityUtilization && analytics.capacityUtilization > 80 && (
            <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <i className="fas fa-exclamation-triangle text-yellow-600 mt-1 mr-3"></i>
              <div>
                <h4 className="font-medium text-yellow-800">High Capacity Utilization</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  This event is at {Math.round(analytics.capacityUtilization)}% capacity. Consider increasing the limit or creating a waitlist.
                </p>
              </div>
            </div>
          )}

          {analytics.attendanceProjections.daysUntilEvent > 0 && analytics.attendanceProjections.registrationRate < 1 && (
            <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <i className="fas fa-info-circle text-primary mt-1 mr-3"></i>
              <div>
                <h4 className="font-medium text-primary-dark">Low Registration Rate</h4>
                <p className="text-blue-700 text-sm mt-1">
                  Registration rate is below 1 per day. Consider increasing marketing efforts or extending the registration deadline.
                </p>
              </div>
            </div>
          )}

          {analytics.totalSubmissions === 0 && analytics.totalRegistrations > 10 && (
            <div className="flex items-start p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <i className="fas fa-file-alt text-orange-600 mt-1 mr-3"></i>
              <div>
                <h4 className="font-medium text-orange-800">No Submissions Yet</h4>
                <p className="text-orange-700 text-sm mt-1">
                  Despite having {analytics.totalRegistrations} registrations, there are no submissions yet. Consider sending reminders or clarifying submission requirements.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}