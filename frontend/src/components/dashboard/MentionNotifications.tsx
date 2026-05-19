'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SocialInteraction } from '@/types/networking';
import { networkingService } from '@/services/networkingService';

interface MentionNotificationsProps {
  userId: string;
  limit?: number;
  showUnreadOnly?: boolean;
  onMarkAsRead?: (mentionId: string) => void;
}

export default function MentionNotifications({ 
  userId, 
  limit = 5, 
  showUnreadOnly = false,
  onMarkAsRead 
}: MentionNotificationsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mentions, setMentions] = useState<SocialInteraction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMentions();
  }, [userId, showUnreadOnly]);

  const loadMentions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const allInteractions = await networkingService.getSocialInteractions(userId, limit * 2);
      const mentionInteractions = allInteractions?.filter(interaction => interaction.type === 'mention')
        .filter(interaction => !showUnreadOnly || (interaction.unreadCount && interaction.unreadCount > 0))
        .slice(0, limit);
      
      setMentions(mentionInteractions);
    } catch (error) {
      console.error('Error loading mentions:', error);
      setError('Failed to load mentions');
    } finally {
      setLoading(false);
    }
  };

  const handleMentionClick = (mention: SocialInteraction) => {
    // Mark as read if callback provided
    if (onMarkAsRead && mention.unreadCount && mention.unreadCount > 0) {
      onMarkAsRead(mention.id);
    }

    // Navigate to the mentioned content
    if (mention.targetType === 'discussion') {
      router.push(`/discussions/${mention.targetId}`);
    } else if (mention.targetType === 'event') {
      router.push(`/events/${mention.targetId}`);
    }
    // News functionality removed
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

  const totalUnreadMentions = mentions.reduce((sum, mention) => sum + (mention.unreadCount || 0), 0);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
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
          onClick={loadMentions}
          className="bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className="text-md font-medium text-gray-900">Mentions</h4>
          {totalUnreadMentions > 0 && (
            <span className="bg-light text-primary-dark text-xs font-medium px-2 py-0.5 rounded-full">
              {totalUnreadMentions} new
            </span>
          )}
        </div>
        <button
          onClick={() => router.push('/mentions')}
          className="text-primary hover:text-primary-dark text-sm font-medium"
        >
          View All
        </button>
      </div>

      {/* Mentions List */}
      {mentions.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-gray-400 mb-2">
            <i className="fas fa-at text-2xl"></i>
          </div>
          <p className="text-gray-600 text-sm">
            {showUnreadOnly ? 'No unread mentions' : 'No mentions yet'}
          </p>
          {!showUnreadOnly && (
            <p className="text-gray-500 text-xs mt-1">
              You'll see mentions when others tag you in discussions
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {mentions.map((mention) => (
            <div
              key={mention.id}
              onClick={() => handleMentionClick(mention)}
              className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                mention.unreadCount && mention.unreadCount > 0
                  ? 'bg-blue-50 border-blue-200 hover:bg-light'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                <i className="fas fa-at text-blue-500"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {mention.title}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      {mention.description}
                    </p>
                    {mention.targetTitle && (
                      <p className="text-xs text-primary">
                        in "{mention.targetTitle}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    {mention.participants && mention.participants.length > 0 && (
                      <div className="flex -space-x-1">
                        {mention.participants.slice(0, 2).map((participant, index) => (
                          <img
                            key={participant.id}
                            src={participant.avatar || '/images/features/innovation.jpg'}
                            alt={`${participant.firstName} ${participant.lastName}`}
                            className="w-6 h-6 rounded-full border-2 border-white object-cover"
                          />
                        ))}
                        {mention.participants.length > 2 && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-gray-600">+{mention.participants.length - 2}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-right">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTimeAgo(mention.timestamp)}
                      </span>
                      {mention.unreadCount && mention.unreadCount > 0 && (
                        <div className="mt-1">
                          <span className="bg-light text-primary-dark text-xs font-medium px-1.5 py-0.5 rounded-full">
                            New
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

      {/* Quick Actions */}
      {mentions.length > 0 && (
        <div className="border-t pt-3">
          <div className="flex space-x-2">
            <button
              onClick={() => router.push('/mentions')}
              className="flex-1 bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-sm"
            >
              <i className="fas fa-at mr-1"></i>
              All Mentions
            </button>
            <button
              onClick={() => router.push('/discussions')}
              className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              <i className="fas fa-comments mr-1"></i>
              Discussions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}