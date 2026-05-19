'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  NetworkStats, 
  NetworkActivity as NetworkActivityType, 
  ConnectionRequest,
  Connection 
} from '@/types/networking';
import { networkingService } from '@/services/networkingService';

interface NetworkActivityProps {
  userId: string;
  limit?: number;
  showStats?: boolean;
  showRequests?: boolean;
}

export default function NetworkActivity({ 
  userId, 
  limit = 5, 
  showStats = true, 
  showRequests = true 
}: NetworkActivityProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [activities, setActivities] = useState<NetworkActivityType[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNetworkData();
  }, [userId]);

  const loadNetworkData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [statsData, activitiesData, requestsData, connectionsData] = await Promise.all([
        showStats ? networkingService.getNetworkStats(userId) : Promise.resolve(null),
        networkingService.getNetworkActivity(userId, limit),
        showRequests ? networkingService.getConnectionRequests(userId) : Promise.resolve([]),
        networkingService.getConnections(userId)
      ]);

      setStats(statsData);
      setActivities(activitiesData);
      setConnectionRequests(requestsData);
      setConnections(connectionsData);
    } catch (error) {
      console.error('Error loading network data:', error);
      setError('Failed to load network data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionResponse = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      await networkingService.respondToConnectionRequest(requestId, action);
      // Refresh data after response
      await loadNetworkData();
    } catch (error) {
      console.error('Error responding to connection request:', error);
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

  const getActivityIcon = (type: NetworkActivityType['type']) => {
    switch (type) {
      case 'connection_request_sent':
        return 'fas fa-paper-plane text-blue-500';
      case 'connection_request_received':
        return 'fas fa-user-plus text-green-500';
      case 'connection_accepted':
        return 'fas fa-handshake text-green-600';
      case 'connection_declined':
        return 'fas fa-user-times text-red-500';
      case 'profile_viewed':
        return 'fas fa-eye text-purple-500';
      case 'message_sent':
        return 'fas fa-envelope text-primary';
      case 'discussion_joined':
        return 'fas fa-comments text-orange-500';
      default:
        return 'fas fa-circle text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          {showStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
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
          onClick={loadNetworkData}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Network Statistics */}
      {showStats && stats && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Connections</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalConnections}</p>
                </div>
                <div className="text-blue-500">
                  <i className="fas fa-users text-xl"></i>
                </div>
              </div>
              {stats.monthlyGrowth.connections > 0 && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <i className="fas fa-arrow-up mr-1"></i>
                  +{stats.monthlyGrowth.connections} this month
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Pending</p>
                  <p className="text-2xl font-bold text-green-900">{stats.pendingRequests}</p>
                </div>
                <div className="text-green-500">
                  <i className="fas fa-clock text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">Connection requests</p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Profile Views</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.profileViews}</p>
                </div>
                <div className="text-purple-500">
                  <i className="fas fa-eye text-xl"></i>
                </div>
              </div>
              {stats.monthlyGrowth.profileViews > 0 && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <i className="fas fa-arrow-up mr-1"></i>
                  +{stats.monthlyGrowth.profileViews} this month
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Mutual</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.mutualConnections}</p>
                </div>
                <div className="text-orange-500">
                  <i className="fas fa-handshake text-xl"></i>
                </div>
              </div>
              <p className="text-xs text-orange-600 mt-2">Shared connections</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Requests */}
      {showRequests && connectionRequests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Connection Requests</h3>
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {connectionRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {connectionRequests.map((request) => (
              <div key={request.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={request.fromUser?.avatar || '/images/features/innovation.jpg'}
                      alt={`${request.fromUser?.firstName} ${request.fromUser?.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.fromUser?.firstName} {request.fromUser?.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{request.fromUser?.bio}</p>
                      {request.message && (
                        <p className="text-sm text-gray-700 mt-1 italic">"{request.message}"</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(request.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleConnectionResponse(request.id, 'accept')}
                      className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleConnectionResponse(request.id, 'decline')}
                      className="bg-gray-600 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-700 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Network Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <button
            onClick={() => router.push('/network')}
            className="text-primary hover:text-primary-dark text-sm font-medium"
          >
            View All
          </button>
        </div>
        
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <i className="fas fa-network-wired text-3xl"></i>
            </div>
            <p className="text-gray-600">No recent network activity</p>
            <button
              onClick={() => router.push('/users')}
              className="mt-4 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
            >
              Find Connections
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-shrink-0">
                  <i className={`${getActivityIcon(activity.type)} text-lg`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {activity.relatedUser?.avatar && (
                        <img
                          src={activity.relatedUser.avatar}
                          alt={`${activity.relatedUser.firstName} ${activity.relatedUser.lastName}`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
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
            onClick={() => router.push('/users')}
            className="flex items-center justify-center space-x-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            <i className="fas fa-search"></i>
            <span>Find People</span>
          </button>
          <button
            onClick={() => router.push('/network/connections')}
            className="flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            <i className="fas fa-users"></i>
            <span>My Network</span>
          </button>
        </div>
      </div>
    </div>
  );
}