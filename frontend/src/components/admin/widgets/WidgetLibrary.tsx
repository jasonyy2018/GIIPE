'use client';

import React, { useState } from 'react';
import { DashboardWidget, WidgetTemplate, WIDGET_SIZES } from '@/types/dashboard-widgets';

interface WidgetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: DashboardWidget) => void;
}

export function WidgetLibrary({ isOpen, onClose, onAddWidget }: WidgetLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const widgetTemplates: WidgetTemplate[] = [
    // Analytics Category
    {
      id: 'user-metrics',
      name: 'User Metrics',
      description: 'Display total users, active users, and growth trends',
      category: 'analytics',
      defaultConfig: {
        type: 'metric',
        title: 'User Metrics',
        size: 'medium',
        config: {
          showTrend: true,
          colorScheme: 'blue',
          dataSource: '/api/admin/analytics/users'
        }
      }
    },
    {
      id: 'event-analytics',
      name: 'Event Analytics',
      description: 'Track event registrations and attendance',
      category: 'analytics',
      defaultConfig: {
        type: 'chart',
        title: 'Event Analytics',
        size: 'large',
        config: {
          chartType: 'line',
          colorScheme: 'green',
          dataSource: '/api/admin/analytics/events'
        }
      }
    },
    {
      id: 'registration-trends',
      name: 'Registration Trends',
      description: 'Monitor registration patterns over time',
      category: 'analytics',
      defaultConfig: {
        type: 'chart',
        title: 'Registration Trends',
        size: 'large',
        config: {
          chartType: 'area',
          colorScheme: 'purple',
          dataSource: '/api/admin/analytics/registrations'
        }
      }
    },
    {
      id: 'content-breakdown',
      name: 'Content Breakdown',
      description: 'Pie chart showing content distribution',
      category: 'analytics',
      defaultConfig: {
        type: 'chart',
        title: 'Content Breakdown',
        size: 'medium',
        config: {
          chartType: 'pie',
          colorScheme: 'primary',
          dataSource: '/api/admin/analytics/content'
        }
      }
    },

    // Monitoring Category
    {
      id: 'system-health',
      name: 'System Health',
      description: 'Monitor system status and service health',
      category: 'monitoring',
      defaultConfig: {
        type: 'status',
        title: 'System Health',
        size: 'medium',
        config: {
          colorScheme: 'green',
          dataSource: '/api/admin/system/health'
        }
      }
    },
    {
      id: 'performance-metrics',
      name: 'Performance Metrics',
      description: 'Track response times and system performance',
      category: 'monitoring',
      defaultConfig: {
        type: 'metric',
        title: 'Performance',
        size: 'small',
        config: {
          showTrend: true,
          colorScheme: 'yellow',
          thresholds: { warning: 500, critical: 1000 },
          dataSource: '/api/admin/system/performance'
        }
      }
    },
    {
      id: 'error-rates',
      name: 'Error Rates',
      description: 'Monitor application error rates',
      category: 'monitoring',
      defaultConfig: {
        type: 'chart',
        title: 'Error Rates',
        size: 'medium',
        config: {
          chartType: 'line',
          colorScheme: 'red',
          dataSource: '/api/admin/system/errors'
        }
      }
    },

    // Content Category
    {
      id: 'moderation-queue',
      name: 'Moderation Queue',
      description: 'List of content awaiting moderation',
      category: 'content',
      defaultConfig: {
        type: 'list',
        title: 'Moderation Queue',
        size: 'large',
        config: {
          maxItems: 10,
          dataSource: '/api/admin/content/moderation-queue'
        }
      }
    },
    {
      id: 'content-stats',
      name: 'Content Statistics',
      description: 'Overview of content creation and moderation',
      category: 'content',
      defaultConfig: {
        type: 'metric',
        title: 'Content Stats',
        size: 'medium',
        config: {
          showTrend: true,
          colorScheme: 'purple',
          dataSource: '/api/admin/content/stats'
        }
      }
    },
    {
      id: 'flagged-content',
      name: 'Flagged Content',
      description: 'Content flagged by automated systems',
      category: 'content',
      defaultConfig: {
        type: 'list',
        title: 'Flagged Content',
        size: 'medium',
        config: {
          maxItems: 5,
          dataSource: '/api/admin/content/flagged'
        }
      }
    },

    // Users Category
    {
      id: 'recent-users',
      name: 'Recent Users',
      description: 'List of recently registered users',
      category: 'users',
      defaultConfig: {
        type: 'list',
        title: 'Recent Users',
        size: 'medium',
        config: {
          maxItems: 8,
          dataSource: '/api/admin/users/recent'
        }
      }
    },
    {
      id: 'user-growth',
      name: 'User Growth',
      description: 'Track user registration growth over time',
      category: 'users',
      defaultConfig: {
        type: 'chart',
        title: 'User Growth',
        size: 'large',
        config: {
          chartType: 'area',
          colorScheme: 'blue',
          dataSource: '/api/admin/users/growth'
        }
      }
    },
    {
      id: 'user-activity',
      name: 'User Activity',
      description: 'Recent user actions and activities',
      category: 'users',
      defaultConfig: {
        type: 'activity',
        title: 'User Activity',
        size: 'large',
        config: {
          maxItems: 15,
          dataSource: '/api/admin/users/activity'
        }
      }
    },

    // Events Category
    {
      id: 'upcoming-events',
      name: 'Upcoming Events',
      description: 'List of upcoming events and their status',
      category: 'events',
      defaultConfig: {
        type: 'list',
        title: 'Upcoming Events',
        size: 'medium',
        config: {
          maxItems: 6,
          dataSource: '/api/admin/events/upcoming'
        }
      }
    },
    {
      id: 'event-progress',
      name: 'Event Progress',
      description: 'Track progress of event planning and execution',
      category: 'events',
      defaultConfig: {
        type: 'progress',
        title: 'Event Progress',
        size: 'large',
        config: {
          dataSource: '/api/admin/events/progress'
        }
      }
    },
    {
      id: 'registration-status',
      name: 'Registration Status',
      description: 'Current registration numbers for active events',
      category: 'events',
      defaultConfig: {
        type: 'metric',
        title: 'Registrations',
        size: 'small',
        config: {
          showTrend: true,
          colorScheme: 'green',
          dataSource: '/api/admin/events/registrations'
        }
      }
    }
  ];

  const categories = [
    { id: 'all', name: 'All Widgets', icon: 'fas fa-th' },
    { id: 'analytics', name: 'Analytics', icon: 'fas fa-chart-bar' },
    { id: 'monitoring', name: 'Monitoring', icon: 'fas fa-heartbeat' },
    { id: 'content', name: 'Content', icon: 'fas fa-file-alt' },
    { id: 'users', name: 'Users', icon: 'fas fa-users' },
    { id: 'events', name: 'Events', icon: 'fas fa-calendar' }
  ];

  const filteredTemplates = widgetTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddWidget = (template: WidgetTemplate) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: template.defaultConfig.title || template.name,
      type: template.defaultConfig.type || 'metric',
      size: template.defaultConfig.size || 'medium',
      position: {
        x: 0,
        y: 0,
        ...WIDGET_SIZES[template.defaultConfig.size || 'medium']
      },
      refreshInterval: 30,
      data: null,
      config: template.defaultConfig.config || {},
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onAddWidget(newWidget);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Widget Library</h2>
            <p className="text-sm text-gray-600 mt-1">Choose a widget to add to your dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Search and Categories */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-search text-gray-400"></i>
              </div>
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Categories */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <i className={`${category.icon} mr-2`}></i>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Widget Grid */}
        <div className="p-6 overflow-y-auto max-h-96">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-search text-3xl mb-4"></i>
              <p>No widgets found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleAddWidget(template)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <div className="ml-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        template.category === 'analytics' ? 'bg-light text-primary-dark' :
                        template.category === 'monitoring' ? 'bg-green-100 text-green-800' :
                        template.category === 'content' ? 'bg-purple-100 text-purple-800' :
                        template.category === 'users' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {template.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className="capitalize">{template.defaultConfig.type}</span>
                      <span></span>
                      <span className="capitalize">{template.defaultConfig.size}</span>
                    </div>
                    <button className="text-primary hover:text-primary-dark text-sm font-medium">
                      Add Widget
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
