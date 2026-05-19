'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectionRecommendation } from '@/types/networking';
import { networkingService } from '@/services/networkingService';

interface ConnectionRecommendationsProps {
  userId: string;
  limit?: number;
  showScores?: boolean;
  showReasons?: boolean;
  allowDismiss?: boolean;
  onConnectionSent?: (userId: string) => void;
}

export default function ConnectionRecommendations({
  userId,
  limit = 5,
  showScores = false,
  showReasons = true,
  allowDismiss = true,
  onConnectionSent
}: ConnectionRecommendationsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<ConnectionRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await networkingService.getConnectionRecommendations(userId, limit + dismissedIds.size);
      // Filter out dismissed recommendations
      const filteredData = data.filter(rec => !dismissedIds.has(rec.id));
      setRecommendations(filteredData.slice(0, limit));
    } catch (error) {
      console.error('Error loading connection recommendations:', error);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSendConnectionRequest = async (recommendedUserId: string, recommendationId: string) => {
    setSendingRequests(prev => new Set(prev).add(recommendedUserId));
    
    try {
      await networkingService.sendConnectionRequest(userId, recommendedUserId);
      
      // Remove the recommendation from the list
      setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));
      
      if (onConnectionSent) {
        onConnectionSent(recommendedUserId);
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      // Could show a toast notification here
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendedUserId);
        return newSet;
      });
    }
  };

  const handleDismissRecommendation = (recommendationId: string) => {
    setDismissedIds(prev => new Set(prev).add(recommendationId));
    setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-primary bg-light';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent Match';
    if (score >= 0.6) return 'Good Match';
    if (score >= 0.4) return 'Fair Match';
    return 'Potential Match';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
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
          onClick={loadRecommendations}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">
          <i className="fas fa-user-friends text-3xl"></i>
        </div>
        <p className="text-gray-600 mb-4">No new connection recommendations available</p>
        <button
          onClick={() => router.push('/users')}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Browse All Users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recommended Connections</h3>
        <button
          onClick={() => router.push('/connections/recommendations')}
          className="text-primary hover:text-primary-dark text-sm font-medium"
        >
          View All
        </button>
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        {recommendations.map((recommendation) => (
          <div 
            key={recommendation.id} 
            className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* User Avatar */}
            <div className="flex-shrink-0">
              <img
                src={recommendation.recommendedUser.avatar || '/images/features/innovation.jpg'}
                alt={`${recommendation.recommendedUser.firstName} ${recommendation.recommendedUser.lastName}`}
                className="w-12 h-12 rounded-full object-cover cursor-pointer"
                onClick={() => router.push(`/users/${recommendation.recommendedUser.id}`)}
              />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 
                      className="text-sm font-medium text-gray-900 cursor-pointer hover:text-primary"
                      onClick={() => router.push(`/users/${recommendation.recommendedUser.id}`)}
                    >
                      {recommendation.recommendedUser.firstName} {recommendation.recommendedUser.lastName}
                    </h4>
                    {showScores && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(recommendation.score)}`}>
                        {Math.round(recommendation.score * 100)}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {recommendation.recommendedUser.bio || 'No bio available'}
                  </p>

                  {/* Connection Stats */}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {recommendation.mutualConnections > 0 && (
                      <span className="flex items-center space-x-1">
                        <i className="fas fa-users"></i>
                        <span>{recommendation.mutualConnections} mutual</span>
                      </span>
                    )}
                    {recommendation.sharedEvents > 0 && (
                      <span className="flex items-center space-x-1">
                        <i className="fas fa-calendar"></i>
                        <span>{recommendation.sharedEvents} events</span>
                      </span>
                    )}
                    {recommendation.sharedInterests.length > 0 && (
                      <span className="flex items-center space-x-1">
                        <i className="fas fa-heart"></i>
                        <span>{recommendation.sharedInterests.length} interests</span>
                      </span>
                    )}
                  </div>

                  {/* Recommendation Reasons */}
                  {showReasons && recommendation.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recommendation.reasons.slice(0, 3).map((reason, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs bg-light text-primary-dark rounded-full"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Shared Interests */}
                  {recommendation.sharedInterests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recommendation.sharedInterests.slice(0, 3).map((interest, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                      {recommendation.sharedInterests.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                          +{recommendation.sharedInterests.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleSendConnectionRequest(recommendation.recommendedUser.id, recommendation.id)}
                    disabled={sendingRequests.has(recommendation.recommendedUser.id)}
                    className="bg-primary text-white px-3 py-1.5 text-sm rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    {sendingRequests.has(recommendation.recommendedUser.id) ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-plus"></i>
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                  
                  {allowDismiss && (
                    <button
                      onClick={() => handleDismissRecommendation(recommendation.id)}
                      className="text-gray-400 hover:text-gray-600 p-1.5"
                      title="Dismiss recommendation"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <button
            onClick={loadRecommendations}
            className="text-primary hover:text-primary-dark text-sm font-medium flex items-center space-x-1"
          >
            <i className="fas fa-sync-alt"></i>
            <span>Refresh Recommendations</span>
          </button>
          
          <button
            onClick={() => router.push('/users')}
            className="bg-gray-600 text-white px-4 py-2 text-sm rounded-md hover:bg-gray-700 transition-colors"
          >
            Browse All Users
          </button>
        </div>
      </div>
    </div>
  );
}