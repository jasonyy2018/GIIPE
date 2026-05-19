'use client';

import { useState, useEffect } from 'react';
import { ContentRecommendation, UserPreferences } from '@/types/savedContent';
import { contentRecommendationService } from '@/services/contentRecommendationService';
import { savedContentService } from '@/services/savedContentService';

interface ContentRecommendationsProps {
  userId: string;
  limit?: number;
  showPreferences?: boolean;
  title?: string;
}

export default function ContentRecommendations({ 
  userId, 
  limit = 5, 
  showPreferences = false,
  title = "Recommended for You"
}: ContentRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [savingContent, setSavingContent] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecommendations();
  }, [userId, limit]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await contentRecommendationService.getRecommendations(userId, limit);
      setRecommendations(data);
    } catch (err) {
      setError('Failed to load recommendations');
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async (recommendation: ContentRecommendation) => {
    try {
      setSavingContent(prev => new Set(prev).add(recommendation.id));
      
      await savedContentService.saveContent(userId, recommendation.id, recommendation.type);
      
      // Track the interaction
      await contentRecommendationService.trackRecommendationInteraction(
        userId,
        recommendation.id,
        'save'
      );
      
      // Show success feedback
      // In a real app, you might show a toast notification
      console.log('Content saved successfully');
    } catch (err) {
      console.error('Error saving content:', err);
    } finally {
      setSavingContent(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendation.id);
        return newSet;
      });
    }
  };

  const handleViewContent = async (recommendation: ContentRecommendation) => {
    // Track the interaction
    await contentRecommendationService.trackRecommendationInteraction(
      userId,
      recommendation.id,
      'view'
    );
    
    // Navigate to content
    window.location.href = recommendation.url;
  };

  const handleDismissRecommendation = async (recommendation: ContentRecommendation) => {
    try {
      // Track the interaction
      await contentRecommendationService.trackRecommendationInteraction(
        userId,
        recommendation.id,
        'dismiss'
      );
      
      // Remove from current recommendations
      setRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
    } catch (err) {
      console.error('Error dismissing recommendation:', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return 'fas fa-calendar';
      case 'article': return 'fas fa-file-alt';
      case 'news': return 'fas fa-newspaper';
      default: return 'fas fa-bookmark';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'text-primary';
      case 'article': return 'text-green-600';
      case 'news': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-primary';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <i className="fas fa-magic text-primary" title="AI-powered recommendations"></i>
        </div>
        
        <div className="flex items-center space-x-2">
          {showPreferences && (
            <button
              onClick={() => setShowPreferencesModal(true)}
              className="p-2 text-gray-400 hover:text-primary transition-colors"
              title="Customize Preferences"
            >
              <i className="fas fa-cog"></i>
            </button>
          )}
          
          <button
            onClick={loadRecommendations}
            className="p-2 text-gray-400 hover:text-primary transition-colors"
            title="Refresh Recommendations"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-lightbulb text-3xl mb-4"></i>
          <p className="mb-2">No recommendations available</p>
          <p className="text-sm">
            Save more content to get better recommendations
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Content Icon */}
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <i className={`${getTypeIcon(recommendation.type)} ${getTypeColor(recommendation.type)}`}></i>
                </div>
              </div>

              {/* Content Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Type and Score */}
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {recommendation.type}
                      </span>
                      <span className="text-xs text-gray-400"></span>
                      <span className={`text-xs font-medium ${getScoreColor(recommendation.score)}`}>
                        {formatScore(recommendation.score)}% match
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      <button
                        onClick={() => handleViewContent(recommendation)}
                        className="hover:text-primary transition-colors text-left"
                      >
                        {recommendation.title}
                      </button>
                    </h4>
                    
                    {/* Description */}
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {recommendation.description}
                    </p>
                    
                    {/* Reason */}
                    <div className="flex items-center space-x-1 mb-2">
                      <i className="fas fa-info-circle text-xs text-blue-500"></i>
                      <span className="text-xs text-primary">
                        {recommendation.reason}
                      </span>
                    </div>
                    
                    {/* Tags */}
                    {recommendation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {recommendation.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {recommendation.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{recommendation.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Metadata */}
                    {recommendation.metadata && (
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        {recommendation.metadata.author && (
                          <span></span>
                        )}
                        {recommendation.metadata.readTime && (
                          <>
                            <span></span>
                            <span></span>
                          </>
                        )}
                        {recommendation.metadata.publishedAt && (
                          <>
                            <span></span>
                            <span></span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col items-center space-y-2 ml-4">
                    <button
                      onClick={() => handleSaveContent(recommendation)}
                      disabled={savingContent.has(recommendation.id)}
                      className="p-2 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                      title="Save Content"
                    >
                      {savingContent.has(recommendation.id) ? (
                        <i className="fas fa-spinner fa-spin text-sm"></i>
                      ) : (
                        <i className="fas fa-bookmark text-sm"></i>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDismissRecommendation(recommendation)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Not Interested"
                    >
                      <i className="fas fa-times text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View More */}
      {recommendations.length >= limit && (
        <div className="text-center pt-4">
          <button
            onClick={() => window.location.href = '/recommendations'}
            className="text-primary hover:text-primary-dark font-medium text-sm"
          >
            View More Recommendations
          </button>
        </div>
      )}

      {/* Preferences Modal - Placeholder */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recommendation Preferences</h3>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Customize your content recommendations by adjusting your preferences.
              </p>
              
              {/* Placeholder for preference controls */}
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-cog text-2xl mb-2"></i>
                <p>Preference controls coming soon</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
