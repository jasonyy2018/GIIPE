'use client';

import { useState, useEffect, useRef } from 'react';

interface ActivityItem {
  id: string;
  action: string;
  resource: string;
  user: string;
  timestamp: Date;
  details?: any;
}

interface RealTimeActivityFeedProps {
  activities: ActivityItem[];
  recentActivity?: ActivityItem[];
  maxItems?: number;
  autoScroll?: boolean;
  showFilters?: boolean;
  className?: string;
}

export default function RealTimeActivityFeed({
  activities = [],
  recentActivity = [],
  maxItems = 50,
  autoScroll = true,
  showFilters = true,
  className = ''
}: RealTimeActivityFeedProps) {
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    user: '',
    timeRange: '1h' // 1h, 6h, 24h, 7d, all
  });
  const [isPaused, setIsPaused] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const [newActivityCount, setNewActivityCount] = useState(0);

  // Combine static activities with real-time updates
  const allActivities = [...activities, ...recentActivity]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxItems);

  // Filter activities based on current filters
  useEffect(() => {
    let filtered = allActivities;

    // Apply time range filter
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      };
      const cutoff = new Date(now.getTime() - timeRanges[filters.timeRange as keyof typeof timeRanges]);
      filtered = filtered.filter(activity => new Date(activity.timestamp) >= cutoff);
    }

    // Apply text filters
    if (filters.action) {
      filtered = filtered.filter(activity => 
        activity.action.toLowerCase().includes(filters.action.toLowerCase())
      );
    }
    if (filters.resource) {
      filtered = filtered.filter(activity => 
        activity.resource.toLowerCase().includes(filters.resource.toLowerCase())
      );
    }
    if (filters.user) {
      filtered = filtered.filter(activity => 
        activity.user.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    setFilteredActivities(filtered);
  }, [allActivities, filters]);

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (autoScroll && !isPaused && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [filteredActivities, autoScroll, isPaused]);

  // Track new activities when paused
  useEffect(() => {
    if (isPaused && recentActivity.length > 0) {
      setNewActivityCount(prev => prev + recentActivity.length);
    } else {
      setNewActivityCount(0);
    }
  }, [recentActivity, isPaused]);

  const getActionIcon = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'USER_CREATED': 'fas fa-user-plus text-green-600',
      'USER_UPDATED': 'fas fa-user-edit text-primary',
      'USER_DELETED': 'fas fa-user-minus text-red-600',
      'EVENT_CREATED': 'fas fa-calendar-plus text-green-600',
      'EVENT_PUBLISHED': 'fas fa-calendar-check text-primary',
      'EVENT_CANCELLED': 'fas fa-calendar-times text-red-600',
      'COMMENT_MODERATED': 'fas fa-comment-dots text-yellow-600',
      'LOGIN': 'fas fa-sign-in-alt text-gray-600',
      'LOGOUT': 'fas fa-sign-out-alt text-gray-600',
      'SYSTEM_BACKUP': 'fas fa-database text-purple-600',
      'SETTINGS_UPDATED': 'fas fa-cog text-primary'
    };
    return actionMap[action] || 'fas fa-info-circle text-gray-600';
  };

  const formatAction = (action: string) => {
    return action.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
      setIsPaused(false);
      setNewActivityCount(0);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900">Activity Feed</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                recentActivity.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm text-gray-500">
                {recentActivity.length > 0 ? 'Live' : 'Static'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Pause/Resume button */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                isPaused 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              <i className={`fas fa-${isPaused ? 'play' : 'pause'} mr-1`}></i>
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            {/* Clear filters button */}
            <button
              onClick={() => setFilters({ action: '', resource: '', user: '', timeRange: '1h' })}
              className="px-3 py-1 rounded text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
            >
              <i className="fas fa-filter mr-1"></i>
              Clear
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Filter by action..."
              value={filters.action}
              onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="text"
              placeholder="Filter by resource..."
              value={filters.resource}
              onChange={(e) => setFilters(prev => ({ ...prev, resource: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="text"
              placeholder="Filter by user..."
              value={filters.user}
              onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="1h">Last hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        )}
      </div>

      {/* New activity notification */}
      {isPaused && newActivityCount > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-dark">
              {newActivityCount} new {newActivityCount === 1 ? 'activity' : 'activities'}
            </span>
            <button
              onClick={scrollToBottom}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              View latest
            </button>
          </div>
        </div>
      )}

      {/* Activity list */}
      <div 
        ref={feedRef}
        className="h-96 overflow-y-auto"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
          if (!isAtBottom && !isPaused) {
            setIsPaused(true);
          }
        }}
      >
        {filteredActivities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <i className="fas fa-inbox text-3xl mb-2"></i>
              <p>No activities found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredActivities.map((activity, index) => (
              <div 
                key={`${activity.id}-${index}`} 
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  recentActivity.some(ra => ra.id === activity.id) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <i className={`${getActionIcon(activity.action)} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user}</span>
                        {' '}
                        <span className="text-gray-600">
                          {formatAction(activity.action).toLowerCase()}
                        </span>
                        {' '}
                        <span className="font-medium">{activity.resource.toLowerCase()}</span>
                      </p>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {getRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                    {activity.details && (
                      <p className="text-xs text-gray-500 mt-1">
                        {JSON.stringify(activity.details)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {filteredActivities.length} of {allActivities.length} activities</span>
          <span>Auto-scroll: {autoScroll && !isPaused ? 'On' : 'Off'}</span>
        </div>
      </div>
    </div>
  );
}