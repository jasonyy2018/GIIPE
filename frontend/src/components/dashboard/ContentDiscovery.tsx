'use client';

import { useState, useEffect } from 'react';
import { TrendingContent } from '@/types/savedContent';
import { contentDiscoveryService } from '@/services/contentDiscoveryService';
import { savedContentService } from '@/services/savedContentService';

interface ContentDiscoveryProps {
  userId: string;
  feedType?: 'trending' | 'personalized' | 'curated';
  timeWindow?: '1h' | '6h' | '24h' | '7d' | '30d';
  limit?: number;
  showTimeFilter?: boolean;
}

export default function ContentDiscovery({ 
  userId,
  feedType = 'trending',
  timeWindow = '24h',
  limit = 6,
  showTimeFilter = true
}: ContentDiscoveryProps) {
  const [content, setContent] = useState<TrendingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(timeWindow);
  const [savingContent, setSavingContent] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContent();
  }, [userId, feedType, selectedTimeWindow, limit]);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: TrendingContent[] = [];
      
      switch (feedType) {
        case 'trending':
          data = await contentDiscoveryService.getTrendingContent(selectedTimeWindow, limit);
          break;
        case 'personalized':
          const feed = await contentDiscoveryService.getPersonalizedFeed(userId, limit);
          data = feed.content;
          break;
        case 'curated':
          const feeds = await contentDiscoveryService.getCuratedFeeds();
          // For now, show content from the first curated feed
          data = feeds.length > 0 ? feeds[0].content.slice(0, limit) : [];
          break;
      }
      
      setContent(data);
    } catch (err) {
      setError('Failed to load content');
      console.error('Error loading content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async (item: TrendingContent) => {
    try {
      setSavingContent(prev => new Set(prev).add(item.id));
      
      await savedContentService.saveContent(userId, item.id, item.type);
      
      // Show success feedback
      console.log('Content saved successfully');
    } catch (err) {
      console.error('Error saving content:', err);
    } finally {
      setSavingContent(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
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

  const getTrendIcon = (score: number) => {
    if (score >= 80) return 'fas fa-fire text-red-500';
    if (score >= 60) return 'fas fa-arrow-up text-green-500';
    if (score >= 40) return 'fas fa-minus text-yellow-500';
    return 'fas fa-arrow-down text-gray-400';
  };

  const formatTrendScore = (score: number) => {
    return Math.round(score);
  };

  const formatStats = (stats: any) => {
    const { views, saves, shares, comments } = stats;
    const total = saves + shares + comments;
    return {
      views: views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views.toString(),
      engagement: total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toString()
    };
  };

  const getFeedTitle = () => {
    switch (feedType) {
      case 'trending': return 'Trending Content';
      case 'personalized': return 'Personalized Feed';
      case 'curated': return 'Curated Content';
      default: return 'Content Discovery';
    }
  };

  const getFeedDescription = () => {
    switch (feedType) {
      case 'trending': return `Most popular content in the last ${selectedTimeWindow}`;
      case 'personalized': return 'Content tailored to your interests and activity';
      case 'curated': return 'Hand-picked quality content from our editors';
      default: return 'Discover new and interesting content';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{getFeedTitle()}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">
          <i className="fas fa-exclamation-triangle text-2xl"></i>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadContent}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
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
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <span>{getFeedTitle()}</span>
            {feedType === 'trending' && <i className="fas fa-fire text-orange-500"></i>}
            {feedType === 'personalized' && <i className="fas fa-user-circle text-blue-500"></i>}
            {feedType === 'curated' && <i className="fas fa-star text-yellow-500"></i>}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{getFeedDescription()}</p>
        </div>
        
        {/* Time Window Filter */}
        {showTimeFilter && feedType === 'trending' && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Time:</span>
            <select
              value={selectedTimeWindow}
              onChange={(e) => setSelectedTimeWindow(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last Week</option>
              <option value="30d">Last Month</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Grid */}
      {content.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <i className="fas fa-search text-3xl mb-4"></i>
          <p className="mb-2">No content found</p>
          <p className="text-sm">
            Try adjusting your filters or check back later
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image */}
              {item.image && (
                <div className="relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                  
                  {/* Overlays */}
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    {/* Content Type Badge */}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/90 ${getTypeColor(item.type)}`}>
                      <i className={`${getTypeIcon(item.type)} mr-1`}></i>
                      {item.type}
                    </span>
                  </div>
                  
                  <div className="absolute top-3 right-3 flex items-center space-x-2">
                    {/* Trending Indicator */}
                    {feedType === 'trending' && (
                      <div className="bg-white/90 rounded-full px-2 py-1 flex items-center space-x-1">
                        <i className={getTrendIcon(item.trendScore)}></i>
                        <span className="text-xs font-medium text-gray-700">
                          {formatTrendScore(item.trendScore)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Save Button */}
                  <button
                    onClick={() => handleSaveContent(item)}
                    disabled={savingContent.has(item.id)}
                    className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-gray-700 hover:text-primary rounded-full p-2 transition-colors disabled:opacity-50"
                    title="Save Content"
                  >
                    {savingContent.has(item.id) ? (
                      <i className="fas fa-spinner fa-spin text-sm"></i>
                    ) : (
                      <i className="fas fa-bookmark text-sm"></i>
                    )}
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                  <a 
                    href={item.url}
                    className="hover:text-primary transition-colors"
                  >
                    {item.title}
                  </a>
                </h4>
                
                <p className="text-xs text-gray-600 mb-3 line-clamp-3">
                  {item.description}
                </p>
                
                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <i className="fas fa-eye"></i>
                      <span>{formatStats(item.stats).views}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <i className="fas fa-heart"></i>
                      <span>{formatStats(item.stats).engagement}</span>
                    </span>
                  </div>
                  
                  <a
                    href={item.url}
                    className="text-primary hover:text-primary-dark font-medium"
                  >
                    Read More
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View More */}
      {content.length >= limit && (
        <div className="text-center pt-4">
          <button
            onClick={() => window.location.href = '/discover'}
            className="text-primary hover:text-primary-dark font-medium text-sm"
          >
            Discover More Content
          </button>
        </div>
      )}
    </div>
  );
}