'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MentionNotifications from '@/components/dashboard/MentionNotifications';
import { mentionService } from '@/services/mentionService';

type FilterMode = 'all' | 'unread' | 'read';

export default function MentionsPage() {
  const router = useRouter();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [loading, setLoading] = useState(false);
  
  // Mock user ID - in real app, this would come from auth context
  const userId = 'current-user';

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      await mentionService.markAllMentionsAsRead(userId);
      // Refresh the component by changing filter mode temporarily
      setFilterMode('read');
      setTimeout(() => setFilterMode('all'), 100);
    } catch (error) {
      console.error('Error marking all mentions as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMentionRead = async (mentionId: string) => {
    try {
      await mentionService.markMentionAsRead(mentionId);
    } catch (error) {
      console.error('Error marking mention as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mentions</h1>
              <p className="mt-2 text-gray-600">
                See when others mention you in discussions, comments, and events
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Marking...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-double mr-2"></i>
                    Mark All Read
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/social')}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Social Hub
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'all' as FilterMode, label: 'All Mentions', icon: 'fas fa-list' },
                { key: 'unread' as FilterMode, label: 'Unread', icon: 'fas fa-circle text-red-500' },
                { key: 'read' as FilterMode, label: 'Read', icon: 'fas fa-check-circle text-green-500' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterMode(filter.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    filterMode === filter.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <i className={filter.icon}></i>
                    <span>{filter.label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Mentions Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <MentionNotifications 
              userId={userId} 
              limit={50}
              showUnreadOnly={filterMode === 'unread'}
              onMarkAsRead={handleMentionRead}
            />
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            <i className="fas fa-info-circle mr-2"></i>
            About Mentions
          </h3>
          <div className="text-sm text-primary-dark space-y-2">
            <p>
              <strong>What are mentions?</strong> Mentions occur when someone uses @username to reference you in discussions, comments, or event conversations.
            </p>
            <p>
              <strong>How to mention someone:</strong> Type @ followed by their username (e.g., @johndoe) in any discussion or comment.
            </p>
            <p>
              <strong>Notifications:</strong> You'll receive real-time notifications when someone mentions you, and they'll appear here for easy tracking.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/discussions')}
            className="flex items-center justify-center space-x-2 bg-primary text-white px-4 py-3 rounded-md hover:bg-primary-dark transition-colors"
          >
            <i className="fas fa-comments"></i>
            <span>Join Discussions</span>
          </button>
          <button
            onClick={() => router.push('/social?view=discussions')}
            className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 transition-colors"
          >
            <i className="fas fa-user-check"></i>
            <span>My Participation</span>
          </button>
          <button
            onClick={() => router.push('/notifications/manage')}
            className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-3 rounded-md hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}