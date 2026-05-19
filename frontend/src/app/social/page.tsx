'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SocialActivityFeed from '@/components/dashboard/SocialActivityFeed';
import MentionNotifications from '@/components/dashboard/MentionNotifications';
import DiscussionTracker from '@/components/dashboard/DiscussionTracker';
import NetworkActivity from '@/components/dashboard/NetworkActivity';

type ViewMode = 'feed' | 'mentions' | 'discussions' | 'network';

export default function SocialPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewMode>('feed');
  
  // Mock user ID - in real app, this would come from auth context
  const userId = 'current-user';

  const views = [
    {
      key: 'feed' as ViewMode,
      label: 'Activity Feed',
      icon: 'fas fa-stream',
      description: 'All your social interactions in one place'
    },
    {
      key: 'mentions' as ViewMode,
      label: 'Mentions',
      icon: 'fas fa-at',
      description: 'When others mention you in discussions'
    },
    {
      key: 'discussions' as ViewMode,
      label: 'Discussions',
      icon: 'fas fa-comments',
      description: 'Track your participation in discussions'
    },
    {
      key: 'network' as ViewMode,
      label: 'Network',
      icon: 'fas fa-users',
      description: 'Your networking activity and connections'
    }
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'feed':
        return (
          <SocialActivityFeed 
            userId={userId} 
            limit={20} 
            showFilters={true}
            autoRefresh={true}
            refreshInterval={30000}
          />
        );
      case 'mentions':
        return (
          <div className="space-y-6">
            <MentionNotifications 
              userId={userId} 
              limit={20}
              showUnreadOnly={false}
            />
          </div>
        );
      case 'discussions':
        return (
          <DiscussionTracker 
            userId={userId} 
            limit={20}
            showActiveOnly={false}
            showUnreadOnly={false}
            groupByType={true}
          />
        );
      case 'network':
        return (
          <NetworkActivity 
            userId={userId} 
            limit={20}
            showStats={true}
            showRequests={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Social Hub</h1>
              <p className="mt-2 text-gray-600">
                Stay connected with your professional network and track all your social interactions
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {views.map((view) => (
                <button
                  key={view.key}
                  onClick={() => setActiveView(view.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeView === view.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <i className={view.icon}></i>
                    <span>{view.label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab Description */}
          <div className="px-6 py-4 bg-gray-50">
            <p className="text-sm text-gray-600">
              <i className={`${views.find(v => v.key === activeView)?.icon} mr-2`}></i>
              {views.find(v => v.key === activeView)?.description}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            {renderActiveView()}
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/discussions')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-comments text-2xl text-primary mb-2"></i>
              <span className="text-sm font-medium">Browse Discussions</span>
            </button>
            <button
              onClick={() => router.push('/users')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-user-plus text-2xl text-primary mb-2"></i>
              <span className="text-sm font-medium">Find Connections</span>
            </button>
            <button
              onClick={() => router.push('/events')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-calendar-alt text-2xl text-primary mb-2"></i>
              <span className="text-sm font-medium">Event Discussions</span>
            </button>
            <button
              onClick={() => router.push('/notifications/manage')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <i className="fas fa-bell text-2xl text-primary mb-2"></i>
              <span className="text-sm font-medium">Notification Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}