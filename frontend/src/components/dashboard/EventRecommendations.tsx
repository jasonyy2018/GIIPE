'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Event, Registration } from '@/types/public';
import { publicAPI } from '@/lib/public-api';

interface RecommendationReason {
  type: 'interest' | 'location' | 'past_attendance' | 'trending' | 'similar_users';
  description: string;
  confidence: number; // 0-1
}

interface EventRecommendation {
  event: Event;
  score: number; // 0-1
  reasons: RecommendationReason[];
}

interface EventRecommendationsProps {
  userId: string;
  limit?: number;
}

interface RecommendationFilters {
  interests: string[];
  eventTypes: string[];
  locations: string[];
  showOnlyHighConfidence: boolean;
}

function RecommendationCard({ 
  recommendation, 
  onRegister, 
  onDismiss, 
  onFeedback 
}: { 
  recommendation: EventRecommendation;
  onRegister: (eventId: string) => void;
  onDismiss: (eventId: string) => void;
  onFeedback: (eventId: string, helpful: boolean) => void;
}) {
  const router = useRouter();
  const { event, score, reasons } = recommendation;
  const [showReasons, setShowReasons] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getReasonIcon = (type: RecommendationReason['type']) => {
    switch (type) {
      case 'interest':
        return 'fas fa-heart';
      case 'location':
        return 'fas fa-map-marker-alt';
      case 'past_attendance':
        return 'fas fa-history';
      case 'trending':
        return 'fas fa-fire';
      case 'similar_users':
        return 'fas fa-users';
      default:
        return 'fas fa-lightbulb';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const primaryReason = reasons.sort((a, b) => b.confidence - a.confidence)[0];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header with score and dismiss */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`text-sm font-medium ${getScoreColor(score)}`}>
            {Math.round(score * 100)}% match
          </div>
          <div className="text-xs text-gray-500">
            <i className={`${getReasonIcon(primaryReason?.type)} mr-1`}></i>
            {primaryReason?.description}
          </div>
        </div>
        <button
          onClick={() => onDismiss(event.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Dismiss recommendation"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Event Info */}
      <div className="mb-3">
        <h4 
          className="font-semibold text-gray-900 hover:text-primary cursor-pointer line-clamp-2 mb-1"
          onClick={() => router.push(`/events/${event.id}`)}
        >
          {event.title}
        </h4>
        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <div className="flex items-center">
            <i className="fas fa-calendar-alt mr-1"></i>
            <span>{formatDate(event.startDate)}</span>
          </div>
          <div className="flex items-center">
            <i className="fas fa-map-marker-alt mr-1"></i>
            <span className="truncate">{event.location}</span>
          </div>
        </div>
      </div>

      {/* Event Tags */}
      {event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {event.tags.slice(0, 3).map(tag => (
            <span 
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {event.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{event.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex space-x-2">
          <button
            onClick={() => onRegister(event.id)}
            className="flex items-center px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary-dark transition-colors"
          >
            <i className="fas fa-plus mr-1"></i>
            Register
          </button>
          
          <button
            onClick={() => setShowReasons(!showReasons)}
            className="flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            <i className="fas fa-info-circle mr-1"></i>
            Why?
          </button>
        </div>

        {/* Feedback buttons */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500 mr-2">Helpful?</span>
          <button
            onClick={() => onFeedback(event.id, true)}
            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
            title="This recommendation is helpful"
          >
            <i className="fas fa-thumbs-up"></i>
          </button>
          <button
            onClick={() => onFeedback(event.id, false)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="This recommendation is not helpful"
          >
            <i className="fas fa-thumbs-down"></i>
          </button>
        </div>
      </div>

      {/* Expandable reasons */}
      {showReasons && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Why we recommend this:</h5>
          <div className="space-y-2">
            {reasons.map((reason, index) => (
              <div key={index} className="flex items-center text-sm">
                <i className={`${getReasonIcon(reason.type)} mr-2 text-primary w-4`}></i>
                <span className="text-gray-600">{reason.description}</span>
                <div className="ml-auto">
                  <div className="w-12 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full" 
                      style={{ width: `${reason.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventRecommendations({ userId, limit = 4 }: EventRecommendationsProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<EventRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<RecommendationFilters>({
    interests: [],
    eventTypes: [],
    locations: [],
    showOnlyHighConfidence: false
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [userId, filters]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would call a recommendations API
      // For now, we'll simulate the recommendation algorithm
      const mockRecommendations = await generateMockRecommendations();
      
      setRecommendations(mockRecommendations);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const generateMockRecommendations = async (): Promise<EventRecommendation[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get some events to use as recommendations
    const eventsResponse = await publicAPI.getEvents({
      status: 'published' as any,
      limit: 10,
      page: 1
    });

    // Simulate recommendation algorithm
    const events = eventsResponse.data || eventsResponse.events || [];
    const mockRecommendations: EventRecommendation[] = events.slice(0, limit).map((event, index) => {
      const baseScore = 0.5 + (Math.random() * 0.4); // Random score between 0.5-0.9
      
      const possibleReasons: RecommendationReason[] = [
        {
          type: 'interest',
          description: 'Matches your interest in technology',
          confidence: 0.8 + (Math.random() * 0.2)
        },
        {
          type: 'location',
          description: 'Near your preferred location',
          confidence: 0.6 + (Math.random() * 0.3)
        },
        {
          type: 'past_attendance',
          description: 'Similar to events you\'ve attended',
          confidence: 0.7 + (Math.random() * 0.2)
        },
        {
          type: 'trending',
          description: 'Popular among users like you',
          confidence: 0.5 + (Math.random() * 0.4)
        },
        {
          type: 'similar_users',
          description: 'Recommended by similar users',
          confidence: 0.6 + (Math.random() * 0.3)
        }
      ];

      // Select 2-3 random reasons
      const selectedReasons = possibleReasons?.sort(() => Math.random() - 0.5)
        .slice(0, 2 + Math.floor(Math.random() * 2));

      return {
        event,
        score: baseScore,
        reasons: selectedReasons
      };
    });

    // Sort by score (highest first)
    return mockRecommendations.sort((a, b) => b.score - a.score);
  };

  const handleRegister = async (eventId: string) => {
    try {
      await publicAPI.registerForEvent(eventId);
      // Remove from recommendations after registration
      setRecommendations(prev => prev.filter(r => r.event.id !== eventId));
    } catch (err) {
      console.error('Error registering for event:', err);
    }
  };

  const handleDismiss = (eventId: string) => {
    setRecommendations(prev => prev.filter(r => r.event.id !== eventId));
    // In a real app, you'd also send this feedback to the backend
  };

  const handleFeedback = (eventId: string, helpful: boolean) => {
    // In a real app, you'd send this feedback to improve recommendations
    console.log(`Feedback for event ${eventId}: ${helpful ? 'helpful' : 'not helpful'}`);
    
    // Optionally remove from view after feedback
    if (!helpful) {
      setRecommendations(prev => prev.filter(r => r.event.id !== eventId));
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    if (filters.showOnlyHighConfidence && rec.score < 0.7) return false;
    if (filters.interests.length > 0 && !rec.event.tags?.some(tag => filters.interests.includes(tag))) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-4"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="flex space-x-2">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
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

  if (filteredRecommendations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <i className="fas fa-lightbulb text-3xl mb-4"></i>
        <p className="mb-2">No recommendations available</p>
        <p className="text-sm mb-4">
          {recommendations.length === 0 
            ? "Engage with more events to get personalized recommendations"
            : "Try adjusting your filters"
          }
        </p>
        {recommendations.length === 0 && (
          <button
            onClick={() => router.push('/events')}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            Browse All Events
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          {filteredRecommendations.length} recommendation{filteredRecommendations.length !== 1 ? 's' : ''}
        </h4>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-sm text-primary hover:text-primary-dark transition-colors"
        >
          <i className="fas fa-filter mr-1"></i>
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="high-confidence"
              checked={filters.showOnlyHighConfidence}
              onChange={(e) => setFilters(prev => ({ ...prev, showOnlyHighConfidence: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="high-confidence" className="text-sm text-gray-700">
              Show only high-confidence recommendations (70%+)
            </label>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-4">
        {filteredRecommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.event.id}
            recommendation={recommendation}
            onRegister={handleRegister}
            onDismiss={handleDismiss}
            onFeedback={handleFeedback}
          />
        ))}
      </div>

      {/* View More */}
      {filteredRecommendations.length >= limit && (
        <div className="text-center pt-4">
          <button
            onClick={() => router.push('/events?recommended=true')}
            className="text-primary hover:text-primary-dark font-medium"
          >
            View More Recommendations →
          </button>
        </div>
      )}
    </div>
  );
}