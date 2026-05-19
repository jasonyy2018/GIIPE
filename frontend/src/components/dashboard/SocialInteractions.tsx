'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SocialInteraction, 
  DiscussionParticipation 
} from '@/types/networking';
import { networkingService } from '@/services/networkingService';
import { mentionService } from '@/services/mentionService';
import MentionNotifications from './MentionNotifications';
import DiscussionTracker from './DiscussionTracker';
import SocialActivityFeed from './SocialActivityFeed';

interface SocialInteractionsProps {
  userId: string;
  limit?: number;
  showDiscussions?: boolean;
  showMentions?: boolean;
  allowFiltering?: boolean;
  viewMode?: 'compact' | 'detailed' | 'feed';
  autoRefresh?: boolean;
}

type FilterType = 'all' | 'mentions' | 'comments' | 'discussions';

export default function SocialInteractions({ 
  userId, 
  limit = 10, 
  showDiscussions = true, 
  showMentions = true,
  allowFiltering = true,
  viewMode = 'compact',
  autoRefresh = false
}: SocialInteractionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<SocialInteraction[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionParticipation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [mentionCount, setMentionCount] = useState(0);

  useEffect(() => {
    loadSocialData();
    loadMentionCount();
  }, [userId]);

  const loadMentionCount = async () => {
    try {
      const count = await mentionService.getUnreadMentionCount(userId);
      setMentionCount(count);
    } catch (error) {
      console.error('Error loading mention count:', error);
    }
  };

  const loadSocialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [interactionsData, discussionsData] = await Promise.all([
        networkingService.getSocialInteractions(userId, limit),
        showDiscussions ? networkingService.getDiscussionParticipation(userId, limit) : Promise.resolve([])
      ]);

      setInteractions(interactionsData);
      setDiscussions(discussionsData);
    } catch (error) {
      console.error('Error loading social data:', error);
      setError('Failed to load social interactions');
    } finally {
      setLoading(false);
    }
  };

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

  const getInteractionIcon = (type: SocialInteraction['type']) => {
    switch (type) {
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
  };

  const getDiscussionTypeIcon = (type: DiscussionParticipation['discussionType']) => {
    switch (type) {
      case 'event':
        return 'fas fa-calendar-alt text-blue-500';
      case 'news':
        return 'fas fa-newspaper text-green-500';
      case 'general':
        return 'fas fa-comments text-purple-500';
      default:
        return 'fas fa-circle text-gray-400';
    }
  };

  const filteredInteractions = interactions.filter(interaction => {
    if (filter === 'all') return true;
    if (filter === 'mentions') return interaction.type === 'mention';
    if (filter === 'comments') return interaction.type === 'comment' || interaction.type === 'discussion_reply';
    if (filter === 'discussions') return interaction.type === 'event_discussion';
    return true;
  });

  const totalUnreadCount = interactions.reduce((sum, interaction) => sum + (interaction.unreadCount || 0), 0);
  const totalDiscussionUnread = discussions.reduce((sum, discussion) => sum + discussion.unreadReplies, 0);

  const handleMentionRead = async (mentionId: string) => {
    try {
      await mentionService.markMentionAsRead(mentionId);
      loadMentionCount(); // Refresh count
    } catch (error) {
      console.error('Error marking mention as read:', error);
    }
  };

  // Render different views based on viewMode
  if (viewMode === 'feed') {
    return (
      <SocialActivityFeed 
        userId={userId} 
        limit={limit} 
        showFilters={allowFiltering}
        autoRefresh={autoRefresh}
      />
    );
  }

  if (viewMode === 'detailed') {
    return (
      <div className="space-y-6">
        {showMentions && (
          <MentionNotifications 
            userId={userId} 
            limit={Math.ceil(limit / 2)}
            onMarkAsRead={handleMentionRead}
          />
        )}
        {showDiscussions && (
          <DiscussionTracker 
            userId={userId} 
            limit={Math.ceil(limit / 2)}
            showActiveOnly={false}
            groupByType={true}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
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
          onClick={loadSocialData}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Social Activity</h3>
          {(totalUnreadCount > 0 || totalDiscussionUnread > 0 || mentionCount > 0) && (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {totalUnreadCount + totalDiscussionUnread + mentionCount} unread
            </span>
          )}
        </div>
        <button
          onClick={() => router.push('/social')}
          className="text-primary hover:text-primary-dark text-sm font-medium"
        >
          View All
        </button>
      </div>

      {/* Filter Tabs */}
      {allowFiltering && (
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: 'All', count: interactions.length },
            { key: 'mentions', label: 'Mentions', count: interactions.filter(i => i.type === 'mention').length },
            { key: 'comments', label: 'Comments', count: interactions.filter(i => i.type === 'comment' || i.type === 'discussion_reply').length },
            { key: 'discussions', label: 'Discussions', count: interactions.filter(i => i.type === 'event_discussion').length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as FilterType)}
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

      {/* Active Discussions */}
      {showDiscussions && discussions.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Active Discussions</h4>
          <div className="space-y-2">
            {discussions.slice(0, 3).map((discussion) => (
              <div 
                key={discussion.id} 
                className="bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-light transition-colors"
                onClick={() => router.push(`/discussions/${discussion.discussionId}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <i className={`${getDiscussionTypeIcon(discussion.discussionType)} text-lg`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {discussion.discussionTitle}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                        <span>{discussion.participantCount} participants</span>
                        <span>{discussion.userCommentCount} your comments</span>
                        <span>{formatTimeAgo(discussion.lastActivity)}</span>
                      </div>
                    </div>
                  </div>
                  {discussion.unreadReplies > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      {discussion.unreadReplies} new
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Interactions */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Recent Interactions</h4>
        
        {filteredInteractions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <i className="fas fa-comments text-3xl"></i>
            </div>
            <p className="text-gray-600">No recent social interactions</p>
            <button
              onClick={() => router.push('/discussions')}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
            >
              Join Discussions
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInteractions.map((interaction) => (
              <div 
                key={interaction.id} 
                className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  if (interaction.targetType === 'event') {
                    router.push(`/events/${interaction.targetId}`);
                  } else if (interaction.targetType === 'discussion') {
                    router.push(`/discussions/${interaction.targetId}`);
                  }
                  // News functionality removed
                }}
              >
                <div className="flex-shrink-0">
                  <i className={`${getInteractionIcon(interaction.type)} text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{interaction.title}</p>
                      <p className="text-sm text-gray-600">{interaction.description}</p>
                      {interaction.targetTitle && (
                        <p className="text-xs text-primary mt-1">
                          in "{interaction.targetTitle}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {interaction.participants && interaction.participants.length > 0 && (
                        <div className="flex -space-x-1">
                          {interaction.participants.slice(0, 2).map((participant, index) => (
                            <img
                              key={participant.id}
                              src={participant.avatar || '/images/features/innovation.jpg'}
                              alt={`${participant.firstName} ${participant.lastName}`}
                              className="w-6 h-6 rounded-full border-2 border-white object-cover"
                            />
                          ))}
                          {interaction.participants.length > 2 && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">+{interaction.participants.length - 2}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-right">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTimeAgo(interaction.timestamp)}
                        </span>
                        {interaction.unreadCount && interaction.unreadCount > 0 && (
                          <div className="mt-1">
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-1.5 py-0.5 rounded-full">
                              {interaction.unreadCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/discussions')}
            className="flex items-center justify-center space-x-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            <i className="fas fa-comments"></i>
            <span>Discussions</span>
          </button>
          <button
            onClick={() => router.push('/mentions')}
            className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-at"></i>
            <span>Mentions</span>
          </button>
        </div>
      </div>
    </div>
  );
}