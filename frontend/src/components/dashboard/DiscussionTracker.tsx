'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DiscussionParticipation } from '@/types/networking';
import { networkingService } from '@/services/networkingService';

interface DiscussionTrackerProps {
  userId: string;
  limit?: number;
  showActiveOnly?: boolean;
  showUnreadOnly?: boolean;
  groupByType?: boolean;
}

export default function DiscussionTracker({ 
  userId, 
  limit = 10, 
  showActiveOnly = false,
  showUnreadOnly = false,
  groupByType = false
}: DiscussionTrackerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [discussions, setDiscussions] = useState<DiscussionParticipation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDiscussions();
  }, [userId, showActiveOnly, showUnreadOnly]);

  const loadDiscussions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allDiscussions = await networkingService.getDiscussionParticipation(userId, limit * 2);
      
      let filtered = allDiscussions;
      
      if (showActiveOnly) {
        filtered = filtered.filter(d => d.isActive);
      }
      
      if (showUnreadOnly) {
        filtered = filtered.filter(d => d.unreadReplies > 0);
      }
      
      setDiscussions(filtered.slice(0, limit));
    } catch (error) {
      console.error('Error loading discussions:', error);
      setError('Failed to load discussion participation');
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

  const getDiscussionTypeLabel = (type: DiscussionParticipation['discussionType']) => {
    switch (type) {
      case 'event':
        return 'Event Discussion';
      case 'news':
        return 'News Discussion';
      case 'general':
        return 'General Discussion';
      default:
        return 'Discussion';
    }
  };

  const handleDiscussionClick = (discussion: DiscussionParticipation) => {
    router.push(`/discussions/${discussion.discussionId}`);
  };

  const groupedDiscussions = groupByType 
    ? discussions.reduce((groups, discussion) => {
        const type = discussion.discussionType;
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(discussion);
        return groups;
      }, {} as Record<string, DiscussionParticipation[]>)
    : { all: discussions };

  const totalUnreadReplies = discussions.reduce((sum, discussion) => sum + discussion.unreadReplies, 0);
  const activeDiscussionsCount = discussions.filter(d => d.isActive).length;

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
              <div key={i} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
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
      <div className="text-center py-6">
        <div className="text-red-500 mb-2">
          <i className="fas fa-exclamation-triangle text-xl"></i>
        </div>
        <p className="text-gray-600 mb-3">{error}</p>
        <button
          onClick={loadDiscussions}
          className="bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm"
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
          <h4 className="text-md font-medium text-gray-900">Discussion Participation</h4>
          <div className="flex items-center space-x-2">
            {totalUnreadReplies > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {totalUnreadReplies} unread
              </span>
            )}
            {activeDiscussionsCount > 0 && (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {activeDiscussionsCount} active
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => router.push('/discussions')}
          className="text-primary hover:text-primary-dark text-sm font-medium"
        >
          View All
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-primary">
            {discussions.length}
          </div>
          <div className="text-xs text-primary">Participating</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-green-600">
            {discussions.reduce((sum, d) => sum + d.userCommentCount, 0)}
          </div>
          <div className="text-xs text-green-600">Your Comments</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-purple-600">
            {totalUnreadReplies}
          </div>
          <div className="text-xs text-purple-600">New Replies</div>
        </div>
      </div>

      {/* Discussions List */}
      {discussions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <i className="fas fa-comments text-3xl"></i>
          </div>
          <p className="text-gray-600">
            {showUnreadOnly ? 'No unread discussion replies' : 'Not participating in any discussions yet'}
          </p>
          {!showUnreadOnly && (
            <button
              onClick={() => router.push('/discussions')}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
            >
              Explore Discussions
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedDiscussions).map(([groupType, groupDiscussions]) => (
            <div key={groupType}>
              {groupByType && groupType !== 'all' && (
                <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <i className={`${getDiscussionTypeIcon(groupType as any)} mr-2`}></i>
                  {getDiscussionTypeLabel(groupType as any)}
                  <span className="ml-2 text-xs text-gray-500">({groupDiscussions.length})</span>
                </h5>
              )}
              
              <div className="space-y-2">
                {groupDiscussions.map((discussion) => (
                  <div
                    key={discussion.id}
                    onClick={() => handleDiscussionClick(discussion)}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      discussion.unreadReplies > 0
                        ? 'bg-blue-50 border-blue-200 hover:bg-light'
                        : discussion.isActive
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <i className={`${getDiscussionTypeIcon(discussion.discussionType)} text-lg`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {discussion.discussionTitle}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <span className="flex items-center">
                              <i className="fas fa-users mr-1"></i>
                              {discussion.participantCount} participants
                            </span>
                            <span className="flex items-center">
                              <i className="fas fa-comment mr-1"></i>
                              {discussion.userCommentCount} your comments
                            </span>
                            <span className="flex items-center">
                              <i className="fas fa-clock mr-1"></i>
                              {formatTimeAgo(discussion.lastActivity)}
                            </span>
                          </div>
                          {discussion.isActive && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <i className="fas fa-circle text-green-400 mr-1" style={{ fontSize: '6px' }}></i>
                                Active
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-3">
                          {discussion.unreadReplies > 0 && (
                            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                              {discussion.unreadReplies} new
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDiscussionClick(discussion);
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="View Discussion"
                          >
                            <i className="fas fa-arrow-right"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {discussions.length > 0 && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/discussions')}
              className="flex items-center justify-center space-x-2 bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm"
            >
              <i className="fas fa-comments"></i>
              <span>All Discussions</span>
            </button>
            <button
              onClick={() => router.push('/discussions?filter=participating')}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <i className="fas fa-user-check"></i>
              <span>My Participation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}