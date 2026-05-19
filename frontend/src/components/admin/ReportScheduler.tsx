'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ReportSchedule {
  id?: string;
  name: string;
  description?: string;
  config: {
    metrics: string[];
    dimensions: string[];
    filters: any[];
    dateRange: {
      startDate: string;
      endDate: string;
      preset?: string;
    };
    format: 'table' | 'chart' | 'summary';
    chartType?: 'line' | 'bar' | 'pie' | 'area';
  };
  schedule: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
    timezone?: string;
  };
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  lastRun?: string;
  nextRun?: string;
  status?: 'active' | 'paused' | 'error';
}

interface ReportSchedulerProps {
  schedules: ReportSchedule[];
  onScheduleCreate: (schedule: ReportSchedule) => Promise<void>;
  onScheduleUpdate: (id: string, schedule: Partial<ReportSchedule>) => Promise<void>;
  onScheduleDelete: (id: string) => Promise<void>;
  onScheduleToggle: (id: string, enabled: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function ReportScheduler({
  schedules,
  onScheduleCreate,
  onScheduleUpdate,
  onScheduleDelete,
  onScheduleToggle,
  isLoading = false
}: ReportSchedulerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ReportSchedule | null>(null);
  const [formData, setFormData] = useState<ReportSchedule>({
    name: '',
    description: '',
    config: {
      metrics: [],
      dimensions: [],
      filters: [],
      dateRange: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
      format: 'table'
    },
    schedule: {
      enabled: true,
      frequency: 'weekly',
      time: '09:00',
      recipients: [],
      timezone: 'UTC'
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when create/edit mode changes
  useEffect(() => {
    if (editingSchedule) {
      setFormData(editingSchedule);
    } else if (showCreateForm) {
      setFormData({
        name: '',
        description: '',
        config: {
          metrics: [],
          dimensions: [],
          filters: [],
          dateRange: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          },
          format: 'table'
        },
        schedule: {
          enabled: true,
          frequency: 'weekly',
          time: '09:00',
          recipients: [],
          timezone: 'UTC'
        }
      });
    }
    setErrors({});
  }, [showCreateForm, editingSchedule]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Schedule name is required';
    }

    if (formData.schedule.recipients.length === 0) {
      newErrors.recipients = 'At least one recipient is required';
    }

    if (formData.config.metrics.length === 0) {
      newErrors.metrics = 'At least one metric is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (editingSchedule) {
        await onScheduleUpdate(editingSchedule.id!, formData);
        setEditingSchedule(null);
      } else {
        await onScheduleCreate(formData);
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  }, [formData, editingSchedule, validateForm, onScheduleCreate, onScheduleUpdate]);

  // Handle delete
  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await onScheduleDelete(id);
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  }, [onScheduleDelete]);

  // Handle toggle
  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      await onScheduleToggle(id, enabled);
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  }, [onScheduleToggle]);

  // Format next run time
  const formatNextRun = (nextRun?: string) => {
    if (!nextRun) return 'Not scheduled';
    return new Date(nextRun).toLocaleString();
  };

  // Get status badge color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="report-scheduler">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Report Scheduling</h2>
          <p className="text-gray-600 mt-1">Automate report generation and delivery</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Schedule
        </button>
      </div>

      {/* Schedules List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {schedules.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Reports</h3>
            <p className="text-gray-600 mb-4">Create your first automated report schedule</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 text-sm font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-light transition-colors"
            >
              Create Schedule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{schedule.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(schedule.status)}`}>
                        {schedule.status || 'unknown'}
                      </span>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={schedule.schedule.enabled}
                          onChange={(e) => handleToggle(schedule.id!, e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-600">Enabled</span>
                      </label>
                    </div>
                    
                    {schedule.description && (
                      <p className="text-gray-600 mb-3">{schedule.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Frequency:</span>
                        <span className="ml-2 text-gray-600 capitalize">{schedule.schedule.frequency}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Time:</span>
                        <span className="ml-2 text-gray-600">{schedule.schedule.time}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Next Run:</span>
                        <span className="ml-2 text-gray-600">{formatNextRun(schedule.nextRun)}</span>
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      <span className="font-medium text-gray-700">Recipients:</span>
                      <span className="ml-2 text-gray-600">
                        {schedule.schedule.recipients.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setEditingSchedule(schedule)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit schedule"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id!)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete schedule"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingSchedule) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter schedule name"
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
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* Schedule Settings */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Schedule Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select
                      value={formData.schedule.frequency}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
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
                      value={formData.schedule.time}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          time: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={formData.schedule.timezone}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          timezone: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Recipients *
                </label>
                <textarea
                  value={formData.schedule.recipients.join(', ')}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                    }
                  }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.recipients ? 'border-red-300' : 'border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Enter email addresses separated by commas"
                />
                {errors.recipients && (
                  <p className="text-red-600 text-sm mt-1">{errors.recipients}</p>
                )}
              </div>

              {/* Enable/Disable */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="schedule-enabled"
                  checked={formData.schedule.enabled}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      enabled: e.target.checked
                    }
                  }))}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="schedule-enabled" className="text-sm font-medium text-gray-700">
                  Enable this schedule
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingSchedule(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Saving...' : (editingSchedule ? 'Update Schedule' : 'Create Schedule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}