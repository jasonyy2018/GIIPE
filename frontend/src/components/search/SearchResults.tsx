'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { searchAnalyticsService } from '@/services/searchAnalyticsService';

interface SearchResult {
  id: string;
  type: 'event' | 'article' | 'user' | 'news';
  title: string;
  description: string;
  url: string;
  image?: string;
  date?: string;
  tags?: string[];
  relevanceScore: number;
  category?: string;
  author?: string;
  location?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  filters: Record<string, string[]>;
  totalCount: number;
  loading: boolean;
  sortBy: 'relevance' | 'date' | 'popularity';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortOrder: string) => void;
  onResultClick: (result: SearchResult, position: number) => void;
  showResultStats?: boolean;
  showSaveOptions?: boolean;
  showShareOptions?: boolean;
  enableInfiniteScroll?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function SearchResults({
  results,
  query,
  filters,
  totalCount,
  loading,
  sortBy,
  sortOrder,
  onSortChange,
  onResultClick,
  showResultStats = true,
  showSaveOptions = true,
  showShareOptions = true,
  enableInfiniteScroll = false,
  onLoadMore,
  hasMore = false
}: SearchResultsProps) {
  const router = useRouter();
  const [savedResults, setSavedResults] = useState<Set<string>>(new Set());
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');

  // Load saved results from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_search_results');
      if (saved) {
        setSavedResults(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.warn('Failed to load saved results:', error);
    }
  }, []);

  // Infinite scroll handler
  useEffect(() => {
    if (!enableInfiniteScroll || !onLoadMore) return;

    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop 
          >= document.documentElement.offsetHeight - 1000) {
        if (hasMore && !loading) {
          onLoadMore();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enableInfiniteScroll, onLoadMore, hasMore, loading]);

  const handleResultClick = (result: SearchResult, position: number) => {
    // Track analytics
    searchAnalyticsService.trackResultClick(query, result.id, position, filters);
    
    onResultClick(result, position);
    router.push(result.url);
  };

  const handleSaveResult = (resultId: string) => {
    const newSaved = new Set(savedResults);
    if (newSaved.has(resultId)) {
      newSaved.delete(resultId);
    } else {
      newSaved.add(resultId);
    }
    setSavedResults(newSaved);
    
    try {
      localStorage.setItem('saved_search_results', JSON.stringify(Array.from(newSaved)));
    } catch (error) {
      console.warn('Failed to save result:', error);
    }
  };

  const handleShareResult = async (result: SearchResult) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: result.title,
          text: result.description,
          url: window.location.origin + result.url
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin + result.url);
        // Show toast notification (would need toast service)
        console.log('Link copied to clipboard');
      } catch (error) {
        console.warn('Failed to copy to clipboard:', error);
      }
    }
  };

  const toggleExpanded = (resultId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return 'fas fa-calendar';
      case 'article': return 'fas fa-file-alt';
      case 'user': return 'fas fa-user';
      case 'news': return 'fas fa-newspaper';
      default: return 'fas fa-search';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'event': return 'bg-light text-primary-dark';
      case 'article': return 'bg-green-100 text-green-800';
      case 'user': return 'bg-orange-100 text-orange-800';
      case 'news': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  if (loading && results.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <i className="fas fa-search text-3xl text-gray-400"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          We couldn't find any results for "{query}". Try adjusting your search terms or filters.
        </p>
        <div className="space-y-3">
          <div className="text-sm text-gray-500">Suggestions:</div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>�?Check your spelling</li>
            <li>�?Try more general terms</li>
            <li>�?Remove some filters</li>
            <li>�?Use synonyms or alternative terms</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Results Header */}
      {showResultStats && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalCount.toLocaleString()} results for "{query}"
              {Object.keys(filters).length > 0 && (
                <span> with {Object.keys(filters).length} filter{Object.keys(filters).length > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {[
                { mode: 'list', icon: 'fas fa-list' },
                { mode: 'grid', icon: 'fas fa-th' },
                { mode: 'compact', icon: 'fas fa-bars' }
              ].map(({ mode, icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title={`${mode} view`}
                >
                  <i className={icon}></i>
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value, sortOrder)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="popularity">Popularity</option>
              </select>
              <button
                onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 text-gray-600 hover:text-gray-800"
                title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              >
                <i className={`fas fa-sort-amount-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className={`space-y-4 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}`}>
        {results.map((result, index) => (
          <div
            key={result.id}
            className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${
              viewMode === 'compact' ? 'p-4' : 'p-6'
            }`}
          >
            <div className={`flex ${viewMode === 'compact' ? 'items-center space-x-3' : 'items-start space-x-4'}`}>
              {/* Result Image */}
              {result.image && viewMode !== 'compact' && (
                <div className="flex-shrink-0">
                  <Image
                    src={result.image}
                    alt={result.title}
                    width={viewMode === 'grid' ? 60 : 80}
                    height={viewMode === 'grid' ? 60 : 80}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}

              {/* Result Content */}
              <div className="flex-1 min-w-0">
                {/* Result Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <i className={`${getTypeIcon(result.type)} text-gray-400 text-sm`}></i>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(result.type)}`}>
                      {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                    </span>
                    {result.category && (
                      <span className="text-xs text-gray-500">�?{result.category}</span>
                    )}
                    {result.date && (
                      <span className="text-xs text-gray-500">�?{formatDate(result.date)}</span>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1">
                    {showSaveOptions && (
                      <button
                        onClick={() => handleSaveResult(result.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          savedResults.has(result.id)
                            ? 'text-primary bg-primary-light'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title={savedResults.has(result.id) ? 'Remove from saved' : 'Save result'}
                      >
                        <i className={`fas ${savedResults.has(result.id) ? 'fa-bookmark' : 'fa-bookmark-o'}`}></i>
                      </button>
                    )}
                    
                    {showShareOptions && (
                      <button
                        onClick={() => handleShareResult(result)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Share result"
                      >
                        <i className="fas fa-share"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Result Title */}
                <h3 
                  className={`font-semibold text-gray-900 hover:text-primary transition-colors cursor-pointer ${
                    viewMode === 'compact' ? 'text-base' : 'text-lg'
                  } mb-2`}
                  onClick={() => handleResultClick(result, index)}
                  dangerouslySetInnerHTML={{ __html: highlightQuery(result.title, query) }}
                />

                {/* Result Description */}
                <p 
                  className={`text-gray-600 mb-3 ${
                    viewMode === 'compact' ? 'text-sm line-clamp-1' : 'line-clamp-2'
                  } ${expandedResults.has(result.id) ? 'line-clamp-none' : ''}`}
                  dangerouslySetInnerHTML={{ __html: highlightQuery(result.description, query) }}
                />

                {/* Result Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Tags */}
                    {result.tags && result.tags.length > 0 && viewMode !== 'compact' && (
                      <div className="flex flex-wrap gap-1">
                        {result.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer transition-colors"
                            onClick={() => {
                              // Add tag to search query
                              const newQuery = `${query} ${tag}`;
                              router.push(`/search?q=${encodeURIComponent(newQuery)}`);
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {result.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{result.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Author/Location */}
                    {(result.author || result.location) && (
                      <div className="text-xs text-gray-500">
                        {result.author && <span>by {result.author}</span>}
                        {result.author && result.location && <span> �?</span>}
                        {result.location && <span>{result.location}</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Relevance Score */}
                    <div className="text-xs text-gray-400">
                      {Math.round(result.relevanceScore * 100)}% match
                    </div>

                    {/* Expand/Collapse Button */}
                    {result.description.length > 150 && (
                      <button
                        onClick={() => toggleExpanded(result.id)}
                        className="text-xs text-primary hover:text-primary-dark"
                      >
                        {expandedResults.has(result.id) ? 'Show less' : 'Show more'}
                      </button>
                    )}

                    {/* View Details Button */}
                    <button
                      onClick={() => handleResultClick(result, index)}
                      className="text-sm text-primary hover:text-primary-dark font-medium flex items-center"
                    >
                      View Details
                      <i className="fas fa-arrow-right ml-1 text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {enableInfiniteScroll && hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Loading...
              </>
            ) : (
              'Load More Results'
            )}
          </button>
        </div>
      )}

      {/* Loading Indicator for Infinite Scroll */}
      {loading && results.length > 0 && (
        <div className="text-center py-4">
          <i className="fas fa-spinner fa-spin text-primary text-xl"></i>
        </div>
      )}
    </div>
  );
}