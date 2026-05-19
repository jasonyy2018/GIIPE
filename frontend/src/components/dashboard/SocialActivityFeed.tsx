'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SocialInteraction, 
  DiscussionParticipation 
} from '@/types/networking';
import { networkingService } from '@/services/networkingService';

interface SocialActivityFeedProps {
  userId: string;
  limit?: number;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

type ActivityFilter = 'all' | 'mentions' | 'discussions' | 'comments' | 'events';

interface CombinedActivity {
  id: string;
  type: 'social_interaction' | 'discussion_participation';
  timestamp: Date;
  data: SocialInteraction | DiscussionParticipation;
}

export default function SocialActivityFeed({ 
  userId, 
  limit = 15, 
  showFilters = true,
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}: SocialActivityFeedProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<CombinedActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadActivities();
  }, [userId]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        loadActivities(true);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, userId]);

  const loadActivities = async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const [socialInteractions, discussionParticipation] = await Promise.all([
        networkingService.getSocialInteractions(userId, limit),
        networkingService.getDiscussionParticipation(userId, limit)
      ]);

      // Combine and sort activities by timestamp
      const combinedActivities: CombinedActivity[] = [
        ...socialInteractions.map(interaction => ({
          id: `social-${interaction.id}`,
          type: 'social_interaction' as const,
          timestamp: interaction.timestamp,
          data: interaction
        })),
        ...discussionParticipation.map(discussion => ({
          id: `discussion-${discussion.id}`,
          type: 'discussion_participation' as const,
          timestamp: discussion.lastActivity,
          data: discussion
        }))
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setActivities(combinedActivities.slice(0, limit));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading social activities:', error);
      setError('Failed to load social activities');
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    
    if (activity.type === 'social_interaction') {
      const interaction = activity.data as SocialInteraction;
      switch (filter) {
        case 'mentions':
          return interaction.type === 'mention';
        case 'comments':
          return interaction.type === 'comment' || interaction.type === 'discussion_reply';
        case 'events':
          return interaction.type === 'event_discussion';
        case 'discussions':
          return interaction.type === 'discussion_reply';
        default:
          return true;
      }
    } else if (activity.type === 'discussion_participation') {
      return filter === 'discussions';
    }
    
    return true;
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getActivityIcon = (activity: CombinedActivity) => {
    if (activity.type === 'social_interaction') {
      const interaction = activity.data as SocialInteraction;
      switch (interaction.type) {
        case 'mention':
          return 'fas fa-at text-blue-500';
        case 'comment':
          return 'fas fa-comment text-green-500';
        case 'discussion_reply':
          return 'fas fa-reply text-purple-500';
        case 'event_discussion':
          return 'fas fa-calendar-alt text-orange-500';
        default:
          return 'fas fa-circle text-gray-400';
      }
    } else {
      const discussion = activity.data as DiscussionParticipation;
      switch (discussion.discussionType) {
        case 'event':
          return 'fas fa-calendar-alt text-blue-500';
        case 'news':
          return 'fas fa-newspaper text-green-500';
        case 'general':
          return 'fas fa-comments text-purple-500';
        default:
          return 'fas fa-circle text-gray-400';
      }
    }
  };

  const handleActivityClick = (activity: CombinedActivity) => {
    if (activity.type === 'social_interaction') {
      const interaction = activity.data as SocialInteraction;
      if (interaction.targetType === 'event') {
        router.push(`/events/${interaction.targetId}`);
      } else if (interaction.targetType === 'discussion') {
        router.push(`/discussions/${interaction.targetId}`);
      }
      // News functionality removed
    } else {
      const discussion = activity.data as DiscussionParticipation;
      router.push(`/discussions/${discussion.discussionId}`);
    }
  };

  const renderActivityContent = (activity: CombinedActivity) => {
    if (activity.type === 'social_interaction') {
      const interaction = activity.data as SocialInteraction;
      return (
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {interaction.title}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            {interaction.description}
          </p>
          {interaction.targetTitle && (
            <p className="text-xs text-primary">
              in "{interaction.targetTitle}"
            </p>
          )}
          {interaction.participants && interaction.participants.length > 0 && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex -space-x-1">
                {interaction.participants.slice(0, 3).map((participant, index) => (
                  <img
                    key={participant.id}
                    src={participant.avatar || '/images/features/innovation.jpg'}
                    alt={`${participant.firstName} ${participant.lastName}`}
                    className="w-6 h-6 rounded-full border-2 border-white object-cover"
                  />
                ))}
                {interaction.participants.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-gray-600">+{interaction.participants.length - 3}</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {interaction.participants.length} participant{interaction.participants.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      );
    } else {
      const discussion = activity.data as DiscussionParticipation;
      return (
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 mb-1">
            Active in Discussion
          </p>
          <p className="text-sm text-gray-600 mb-1">
            {discussion.discussionTitle}
          </p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{discussion.participantCount} participants</span>
            <span>{discussion.userCommentCount} your comments</span>
            {discussion.unreadReplies > 0 && (
              <span className="text-primary font-medium">
                {discussion.unreadReplies} new replies
              </span>
            )}
          </div>
        </div>
      );
    }
  };

  const getUnreadCount = (activity: CombinedActivity) => {
    if (activity.type === 'social_interaction') {
      const interaction = activity.data as SocialInteraction;
      return interaction.unreadCount || 0;
    } else {
      const discussion = activity.data as DiscussionParticipation;
      return discussion.unreadReplies;
    }
  };

  const totalUnreadCount = filteredActivities.reduce((sum, activity) => sum + getUnreadCount(activity), 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
          onClick={() => loadActivities()}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Social Activity</h3>
          {totalUnreadCount > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {totalUnreadCount} unread
            </span>
          )}
          {autoRefresh && (
            <span className="text-xs text-gray-500">
              Last updated: {formatTimeAgo(lastRefresh)}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadActivities()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
          <button
            onClick={() => router.push('/social')}
            className="text-primary hover:text-primary-dark text-sm font-medium"
          >
            View All
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      {showFilters && (
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'All', count: activities.length },
            { key: 'mentions', label: 'Mentions', count: activities.filter(a => a.type === 'social_interaction' && (a.data as SocialInteraction).type === 'mention').length },
            { key: 'discussions', label: 'Discussions', count: activities.filter(a => a.type === 'discussion_participation' || (a.type === 'social_interaction' && (a.data as SocialInteraction).type === 'discussion_reply')).length },
            { key: 'comments', label: 'Comments', count: activities.filter(a => a.type === 'social_interaction' && ['comment', 'discussion_reply'].includes((a.data as SocialInteraction).type)).length },
            { key: 'events', label: 'Events', count: activities.filter(a => a.type === 'social_interaction' && (a.data as SocialInteraction).type === 'event_discussion').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as ActivityFilter)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === tab.key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 text-xs ${
                  filter === tab.key ? 'text-primary' : 'text-gray-400'
                }`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Activity Feed */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <i className="fas fa-comments text-3xl"></i>
          </div>
          <p className="text-gray-600">No social activities yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Join discussions and interact with other members to see activity here
          </p>
          <button
            onClick={() => router.push('/discussions')}
            className="mt-4 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            Explore Discussions
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => {
            const unreadCount = getUnreadCount(activity);
            return (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  unreadCount > 0
                    ? 'bg-blue-50 border-blue-200 hover:bg-light'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  <i className={`${getActivityIcon(activity)} text-lg`}></i>
                </div>
                {renderActivityContent(activity)}
                <div className="flex items-center space-x-2 ml-4">
                  <div className="text-right">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                    {unreadCount > 0 && (
                      <div className="mt-1">
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => router.push('/discussions')}
            className="flex items-center justify-center space-x-2 bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm"
          >
            <i className="fas fa-comments"></i>
            <span>Discussions</span>
          </button>
          <button
            onClick={() => router.push('/mentions')}
            className="flex items-center justify-center space-x-2 bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm"
          >
            <i className="fas fa-at"></i>
            <span>Mentions</span>
          </button>
          <button
            onClick={() => router.push('/events')}
            className="flex items-center justify-center space-x-2 bg-orange-600 text-white px-3 py-2 rounded-md hover:bg-orange-700 transition-colors text-sm"
          >
            <i className="fas fa-calendar-alt"></i>
            <span>Events</span>
          </button>
        </div>
      </div>
    </div>
  );
}