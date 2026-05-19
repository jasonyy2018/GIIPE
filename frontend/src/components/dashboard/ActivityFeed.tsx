'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userStatsService, UserActivity } from '../../services/userStatsService';

interface ActivityFeedProps {
  userId: string;
  limit?: number;
  showHeader?: boolean;
}

export default function ActivityFeed({ userId, limit = 10, showHeader = true }: ActivityFeedProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, [userId, limit]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const userActivities = await userStatsService.getUserActivity(userId, limit);
      setActivities(userActivities);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    userStatsService.clearCache();
    loadActivities();
  };

  const handleActivityClick = (activity: UserActivity) => {
    const { relatedEntity } = activity;
    
    switch (relatedEntity.type) {
      case 'event':
        router.push(`/events/${relatedEntity.id}`);
        break;
      case 'article':
        // Article/news functionality removed
        break;
      case 'user':
        if (relatedEntity.id !== userId) {
          router.push(`/users/${relatedEntity.id}`);
        } else {
          router.push('/dashboard/profile');
        }
        break;
      default:
        break;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'event_registration':
        return 'text-primary bg-light';
      case 'content_save':
        return 'text-green-600 bg-green-100';
      case 'connection_made':
        return 'text-purple-600 bg-purple-100';
      case 'comment_posted':
        return 'text-orange-600 bg-orange-100';
      case 'profile_update':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">Recent Activity</h4>
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        )}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">
          <i className="fas fa-exclamation-triangle text-2xl"></i>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <i className="fas fa-clock text-2xl text-gray-400"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
        <p className="text-gray-500 mb-4">
          Start engaging with events and content to see your activity here.
        </p>
        <button
          onClick={() => router.push('/events')}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Browse Events
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900">Recent Activity</h4>
          <button
            onClick={handleRefresh}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      )}

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            onClick={() => handleActivityClick(activity)}
            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
              <i className={`${activity.icon} text-sm`}></i>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activity.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {activity.description}
              </p>
              <div className="flex items-center mt-2 text-xs text-gray-500">
                <span>{formatTimeAgo(activity.timestamp)}</span>
                <span className="mx-2"></span>                <span className="mx-2"></span>
                <span className="capitalize">{activity.relatedEntity.type}</span>
              </div>
            </div>

            <div className="flex-shrink-0">
              <i className="fas fa-chevron-right text-gray-400 text-sm"></i>
            </div>
          </div>
        ))}
      </div>

      {activities.length >= limit && (
        <div className="text-center pt-4">
          <button
            onClick={() => router.push('/activity')}
            className="text-primary hover:text-primary-dark font-medium text-sm"
          >
            View all activity 锟?
          </button>
        </div>
      )}
    </div>
  );
}
