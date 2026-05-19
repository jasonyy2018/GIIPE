'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectionRecommendation } from '@/types/networking';
import { networkingService } from '@/services/networkingService';
import ConnectionRecommendations from '@/components/dashboard/ConnectionRecommendations';

type RecommendationType = 'all' | 'mutual' | 'interests' | 'events';

export default function ConnectionRecommendationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<ConnectionRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RecommendationType>('all');
  const [stats, setStats] = useState({
    total: 0,
    mutual: 0,
    interests: 0,
    events: 0
  });

  // Mock user ID - in real app, this would come from auth context
  const userId = 'current-user';

  useEffect(() => {
    loadRecommendations();
  }, [activeTab]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: ConnectionRecommendation[] = [];
      
      switch (activeTab) {
        case 'all':
          data = await networkingService.getConnectionRecommendations(userId, 20);
          break;
        case 'mutual':
          data = await networkingService.getRecommendationsByMutualConnections(userId, 20);
          break;
        case 'interests':
          data = await networkingService.getRecommendationsByInterests(userId, 20);
          break;
        case 'events':
          data = await networkingService.getRecommendationsByEvents(userId, 20);
          break;
      }
      
      setRecommendations(data);
      
      // Update stats (in real app, this would be a separate API call)
      setStats({
        total: data.length,
        mutual: data.filter(r => r.mutualConnections > 0).length,
        interests: data.filter(r => r.sharedInterests.length > 0).length,
        events: data.filter(r => r.sharedEvents > 0).length
      });
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setError('Failed to load connection recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionSent = (sentToUserId: string) => {
    // Remove the user from recommendations
    setRecommendations(prev => 
      prev.filter(rec => rec.recommendedUser.id !== sentToUserId)
    );
    
    // Update stats
    setStats(prev => ({
      ...prev,
      total: prev.total - 1
    }));
  };

  const getTabIcon = (tab: RecommendationType) => {
    switch (tab) {
      case 'all':
        return 'fas fa-users';
      case 'mutual':
        return 'fas fa-user-friends';
      case 'interests':
        return 'fas fa-heart';
      case 'events':
        return 'fas fa-calendar-alt';
      default:
        return 'fas fa-users';
    }
  };

  const getTabCount = (tab: RecommendationType) => {
    switch (tab) {
      case 'all':
        return stats.total;
      case 'mutual':
        return stats.mutual;
      case 'interests':
        return stats.interests;
      case 'events':
        return stats.events;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Connection Recommendations</h1>
                <p className="text-sm text-gray-600">Discover new professional connections</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/users')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Browse All Users
              </button>
              <button
                onClick={() => router.push('/connections')}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
              >
                My Connections
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="fas fa-users text-2xl text-blue-500"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Recommendations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="fas fa-user-friends text-2xl text-green-500"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mutual Connections</p>
                <p className="text-2xl font-bold text-gray-900">{stats.mutual}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="fas fa-heart text-2xl text-red-500"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Shared Interests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.interests}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="fas fa-calendar-alt text-2xl text-purple-500"></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Event Connections</p>
                <p className="text-2xl font-bold text-gray-900">{stats.events}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'all', label: 'All Recommendations' },
                { key: 'mutual', label: 'Mutual Connections' },
                { key: 'interests', label: 'Shared Interests' },
                { key: 'events', label: 'Event Connections' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as RecommendationType)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <i className={getTabIcon(tab.key as RecommendationType)}></i>
                  <span>{tab.label}</span>
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getTabCount(tab.key as RecommendationType)}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="flex space-x-2">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <i className="fas fa-exclamation-triangle text-4xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Recommendations</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={loadRecommendations}
                  className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <i className="fas fa-user-friends text-4xl"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h3>
                <p className="text-gray-600 mb-6">
                  We couldn't find any connection recommendations for this category right now.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setActiveTab('all')}
                    className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
                  >
                    View All Recommendations
                  </button>
                  <button
                    onClick={() => router.push('/users')}
                    className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Browse Users
                  </button>
                </div>
              </div>
            ) : (
              <ConnectionRecommendations
                userId={userId}
                limit={recommendations.length}
                showScores={true}
                showReasons={true}
                allowDismiss={true}
                onConnectionSent={handleConnectionSent}
              />
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <i className="fas fa-lightbulb text-blue-500 text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">Tips for Better Connections</h3>
              <ul className="text-sm text-primary-dark space-y-1">
                <li>�?Complete your profile to get better recommendations</li>
                <li>�?Attend events to meet people with similar interests</li>
                <li>�?Engage in discussions to increase your visibility</li>
                <li>�?Personalize your connection requests with a message</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}