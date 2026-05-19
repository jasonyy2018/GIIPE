'use client';

import { Plus, Users, Calendar, FileText, MessageSquare, Settings, BarChart3, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  color: string;
  badge?: string | number;
}

interface QuickActionsProps {
  onCreateEvent?: () => void;
  onManageUsers?: () => void;
  onReviewComments?: () => void;
  onViewAnalytics?: () => void;
  onSystemSettings?: () => void;
  pendingComments?: number;
  className?: string;
}

export function QuickActions({
  onCreateEvent,
  onManageUsers,
  onReviewComments,
  onViewAnalytics,
  onSystemSettings,
  pendingComments = 0,
  className
}: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      title: 'Create Event',
      description: 'Add a new conference or event',
      icon: Plus,
      onClick: onCreateEvent,
      color: 'bg-blue-500 hover:bg-primary',
    },
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: Users,
      onClick: onManageUsers,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Review Comments',
      description: 'Moderate pending comments',
      icon: MessageSquare,
      onClick: onReviewComments,
      color: 'bg-yellow-500 hover:bg-yellow-600',
      badge: pendingComments > 0 ? pendingComments : undefined,
    },
    {
      title: 'View Analytics',
      description: 'Check platform performance',
      icon: BarChart3,
      onClick: onViewAnalytics,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: Settings,
      onClick: onSystemSettings,
      color: 'bg-gray-500 hover:bg-gray-600',
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <button
              key={index}
              onClick={action.onClick}
              className="relative group bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <div className="flex items-start space-x-4">
                <div className={cn(
                  "flex-shrink-0 p-3 rounded-lg text-white transition-colors",
                  action.color
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {action.description}
                  </p>
                </div>
              </div>
              
              {action.badge && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {action.badge}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Recent Activity Component
interface ActivityItem {
  id: string;
  type: 'user' | 'event' | 'comment' | 'registration';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
  loading?: boolean;
  className?: string;
}

export function RecentActivity({ activities = [], loading = false, className }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return Users;
      case 'event':
        return Calendar;
      case 'comment':
        return MessageSquare;
      case 'registration':
        return FileText;
      default:
        return AlertTriangle;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user':
        return 'text-blue-500';
      case 'event':
        return 'text-green-500';
      case 'comment':
        return 'text-yellow-500';
      case 'registration':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className={cn("bg-white border border-gray-200 rounded-lg p-6", className)}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex space-x-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white border border-gray-200 rounded-lg p-6", className)}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
      
      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No recent activity to display
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            const colorClass = getActivityColor(activity.type);
            
            return (
              <div key={activity.id} className="flex space-x-3">
                <div className={cn("flex-shrink-0 p-1", colorClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity.description}
                  </p>
                  <div className="flex items-center mt-1 text-xs text-gray-400">
                    <span>{activity.timestamp}</span>
                    {activity.user && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{activity.user}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="text-sm text-primary hover:text-primary-dark font-medium">
          View all activity →
        </button>
      </div>
    </div>
  );
}
