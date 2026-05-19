'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchService, type SearchSuggestion, type SearchResult, type SearchFilter, type SearchQuery } from '@/services/searchService';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface EnhancedSearchInterfaceProps {
  placeholder?: string;
  showFilters?: boolean;
  showSuggestions?: boolean;
  showRecentSearches?: boolean;
  showPopularSearches?: boolean;
  showFacetedSearch?: boolean;
  showAdvancedSearch?: boolean;
  maxSuggestions?: number;
  maxResults?: number;
  onSearch?: (query: string, filters: Record<string, string[]>) => void;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  className?: string;
  autoFocus?: boolean;
  enableVoiceSearch?: boolean;
  enableKeyboardShortcuts?: boolean;
}

export default function EnhancedSearchInterface({
  placeholder = "Search across all content types...",
  showFilters = true,
  showSuggestions = true,
  showRecentSearches = true,
  showPopularSearches = true,
  showFacetedSearch = true,
  showAdvancedSearch = true,
  maxSuggestions = 10,
  maxResults = 8,
  onSearch,
  onSuggestionClick,
  className = "",
  autoFocus = false,
  enableVoiceSearch = true,
  enableKeyboardShortcuts = true
}: EnhancedSearchInterfaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [facets, setFacets] = useState<Record<string, { value: string; count: number }[]>>({});
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAdvancedSearchModal, setShowAdvancedSearchModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'popularity'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchMode, setSearchMode] = useState<'simple' | 'advanced'>('simple');
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  const [searchStats, setSearchStats] = useState<{ totalResults: number; searchTime: number } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const voiceRecognitionRef = useRef<any>(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (showRecentSearches) {
          const recent = await searchService.getRecentSearches('current-user');
          setRecentSearches(recent);
        }
        if (showPopularSearches) {
          const popular = await searchService.getPopularSearches();
          setPopularSearches(popular);
        }
      } catch (error) {
        console.error('Error loading initial search data:', error);
      }
    };
    loadInitialData();
  }, [showRecentSearches, showPopularSearches]);

  // Auto focus
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced search function with enhanced features
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        setResults([]);
        setActiveFilters([]);
        setFacets({});
        setSearchStats(null);
        return;
      }

      setLoading(true);
      const startTime = Date.now();

      try {
        const searchParams: SearchQuery = {
          query: searchQuery,
          filters,
          sortBy,
          sortOrder,
          limit: maxResults
        };

        const response = await searchService.search(searchParams);

        setSuggestions(response.suggestions.slice(0, maxSuggestions));
        setResults(response.results);
        setActiveFilters(response.filters);
        setFacets(response.facets);
        setSearchStats({
          totalResults: response.totalCount,
          searchTime: Date.now() - startTime
        });

      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
        setResults([]);
        setActiveFilters([]);
        setFacets({});
        setSearchStats(null);
      } finally {
        setLoading(false);
      }
    }, 200),
    [filters, sortBy, sortOrder, maxResults, maxSuggestions]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Voice search setup
  useEffect(() => {
    if (enableVoiceSearch && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      voiceRecognitionRef.current = new SpeechRecognition();
      voiceRecognitionRef.current.continuous = false;
      voiceRecognitionRef.current.interimResults = false;
      voiceRecognitionRef.current.lang = 'en-US';

      voiceRecognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsVoiceSearchActive(false);
        debouncedSearch(transcript);
      };

      voiceRecognitionRef.current.onerror = () => {
        setIsVoiceSearchActive(false);
      };

      voiceRecognitionRef.current.onend = () => {
        setIsVoiceSearchActive(false);
      };
    }
  }, [enableVoiceSearch, debouncedSearch]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startVoiceSearch = () => {
    if (voiceRecognitionRef.current && enableVoiceSearch) {
      setIsVoiceSearchActive(true);
      voiceRecognitionRef.current.start();
    }
  };

  // Enhanced keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSuggestionDropdown(true);
      }

      // Ctrl/Cmd + Shift + F for advanced search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowAdvancedSearchModal(true);
      }

      // Escape to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setQuery('');
        setShowSuggestionDropdown(false);
        searchInputRef.current?.blur();
      }

      // Alt + V for voice search
      if (e.altKey && e.key === 'v' && enableVoiceSearch) {
        e.preventDefault();
        startVoiceSearch();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [enableKeyboardShortcuts, enableVoiceSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestionDropdown(value.length > 0 || recentSearches.length > 0 || popularSearches.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestionDropdown(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    setShowSuggestionDropdown(false);

    // Add to search history
    const newHistory = [suggestion.title, ...searchHistory.filter(h => h !== suggestion.title)].slice(0, 10);
    setSearchHistory(newHistory);

    onSuggestionClick?.(suggestion);
    router.push(suggestion.url);
  };

  const handleQuickSearch = (searchTerm: string) => {
    setQuery(searchTerm);
    setShowSuggestionDropdown(false);

    // Add to search history
    const newHistory = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, 10);
    setSearchHistory(newHistory);

    // Trigger search
    debouncedSearch(searchTerm);
  };

  const handleSearch = () => {
    if (query.trim()) {
      setShowSuggestionDropdown(false);

      // Add to search history
      const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(newHistory);

      onSearch?.(query, filters);

      const searchParams = new URLSearchParams();
      searchParams.set('q', query);
      searchParams.set('sort', sortBy);
      searchParams.set('order', sortOrder);

      Object.entries(filters).forEach(([key, values]) => {
        values.forEach(value => searchParams.append(key, value));
      });

      router.push(`/search?${searchParams.toString()}`);
    }
  };

  const handleFilterChange = (filterKey: string, value: string, checked: boolean) => {
    setFilters(prev => {
      const currentValues = prev[filterKey] || [];
      let newValues;

      // Find the filter to check if it's radio type
      const filter = activeFilters.find(f => f.key === filterKey);

      if (filter?.type === 'radio') {
        // For radio filters, only one value can be selected
        newValues = checked ? [value] : [];
      } else {
        // For checkbox filters, multiple values can be selected
        if (checked) {
          newValues = [...currentValues, value];
        } else {
          newValues = currentValues.filter(v => v !== value);
        }
      }

      const newFilters = { ...prev, [filterKey]: newValues };

      // Remove empty filter arrays
      if (newValues.length === 0) {
        delete newFilters[filterKey];
      }

      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({});
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

  return (
    <div className={`relative ${className}`}>
      {/* Enhanced Search Input */}
      <div className="relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestionDropdown(query.length > 0 || recentSearches.length > 0 || popularSearches.length > 0)}
            placeholder={placeholder}
            className="w-full pl-12 pr-32 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-lg shadow-sm transition-all duration-200"
          />

          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <i className={`fas fa-search text-gray-400 ${loading ? 'animate-pulse' : ''}`}></i>
          </div>

          {/* Right Side Controls */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
            {/* Voice Search Button */}
            {enableVoiceSearch && 'webkitSpeechRecognition' in window && (
              <button
                onClick={startVoiceSearch}
                disabled={isVoiceSearchActive}
                className={`p-2 rounded-lg transition-colors ${
                  isVoiceSearchActive
                    ? 'bg-red-100 text-red-600 animate-pulse'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title="Voice search (Alt + V)"
              >
                <i className={`fas ${isVoiceSearchActive ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
              </button>
            )}

            {/* Advanced Search Button */}
            {showAdvancedSearch && (
              <button
                onClick={() => setShowAdvancedSearchModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Advanced search (Ctrl + Shift + F)"
              >
                <i className="fas fa-cog"></i>
              </button>
            )}

            {/* Keyboard shortcut hint */}
            {!query && enableKeyboardShortcuts && (
              <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-400">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl</kbd>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">K</kbd>
              </div>
            )}

            {/* Clear button */}
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setResults([]);
                  setShowSuggestionDropdown(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear search"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {/* Search Statistics */}
        {searchStats && query && (
          <div className="mt-2 text-sm text-gray-500 flex items-center justify-between">
            <span>
              {searchStats.totalResults.toLocaleString()} results found in {searchStats.searchTime}ms
            </span>
            <div className="flex items-center space-x-4">
              <span>Sort: {sortBy}</span>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-primary hover:text-primary-dark"
              >
                <i className={`fas fa-filter mr-1 ${showAdvancedFilters ? 'text-primary' : ''}`}></i>
                Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Suggestions Dropdown */}
        {showSuggestions && showSuggestionDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-96 overflow-y-auto"
          >
            {/* Auto-complete Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                  <i className="fas fa-lightbulb mr-2"></i>
                  Suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    ref={el => { suggestionRefs.current[index] = el; }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                      index === selectedSuggestionIndex
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <i className={`${suggestion.icon} ${
                      index === selectedSuggestionIndex ? 'text-white' : 'text-gray-400'
                    } mr-3 w-4`}></i>
                    <div className="flex-1">
                      <div className="font-medium">{suggestion.title}</div>
                      {suggestion.subtitle && (
                        <div className={`text-sm ${
                          index === selectedSuggestionIndex ? 'text-gray-200' : 'text-gray-500'
                        }`}>
                          {suggestion.subtitle}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {suggestion.category && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          index === selectedSuggestionIndex
                            ? 'bg-white bg-opacity-20 text-white'
                            : getTypeBadgeColor(suggestion.type)
                        }`}>
                          {suggestion.category}
                        </span>
                      )}
                      {suggestion.relevanceScore && (
                        <div className={`text-xs ${
                          index === selectedSuggestionIndex ? 'text-gray-200' : 'text-gray-400'
                        }`}>
                          {Math.round(suggestion.relevanceScore * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {showRecentSearches && recentSearches.length > 0 && !query && (
              <div>
                <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                  <i className="fas fa-history mr-2"></i>
                  Recent Searches
                </div>
                {recentSearches.slice(0, 5).map((search, index) => (
                  <div
                    key={`recent-${index}`}
                    onClick={() => handleQuickSearch(search)}
                    className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <i className="fas fa-history text-gray-400 mr-3 w-4"></i>
                    <div className="flex-1 font-medium text-gray-700">{search}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentSearches(prev => prev.filter(s => s !== search));
                      }}
                      className="text-gray-300 hover:text-gray-500 ml-2"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Popular Searches */}
            {showPopularSearches && popularSearches.length > 0 && !query && (
              <div>
                <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                  <i className="fas fa-fire mr-2"></i>
                  Trending Searches
                </div>
                {popularSearches.slice(0, 5).map((search, index) => (
                  <div
                    key={`popular-${index}`}
                    onClick={() => handleQuickSearch(search)}
                    className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <i className="fas fa-fire text-orange-400 mr-3 w-4"></i>
                    <div className="flex-1 font-medium text-gray-700">{search}</div>
                    <i className="fas fa-arrow-right text-gray-300 ml-2"></i>
                  </div>
                ))}
              </div>
            )}

            {/* No results message */}
            {query && suggestions.length === 0 && !loading && (
              <div className="px-4 py-8 text-center text-gray-500">
                <i className="fas fa-search text-3xl mb-3 text-gray-300"></i>
                <div className="font-medium">No suggestions found</div>
                <div className="text-sm mt-1">Try a different search term or check spelling</div>
                <button
                  onClick={handleSearch}
                  className="mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Search anyway
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Faceted Search Filters */}
      {showFacetedSearch && Object.keys(facets).length > 0 && query && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">Refine Results</h4>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:text-primary-dark"
              >
                Clear All Filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {Object.entries(facets).map(([facetKey, facetValues]) => (
              <div key={facetKey} className="bg-white rounded-lg border border-gray-200 p-4 min-w-48">
                <h5 className="font-medium text-gray-700 mb-3 capitalize">{facetKey}</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {facetValues.map(({ value, count }) => (
                    <label
                      key={value}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filters[facetKey]?.includes(value) || false}
                        onChange={(e) => handleFilterChange(facetKey, value, e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 flex-1">{value}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {count}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && showAdvancedFilters && (
        <div className="mt-4 bg-gray-50 rounded-xl p-6 space-y-6">
          {/* Sort Options */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Sort & Order</h4>
            <div className="flex flex-wrap gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'popularity')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="popularity">Popularity</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Dynamic Filters */}
          {activeFilters.map(filter => (
            <div key={filter.key}>
              <h4 className="font-medium text-gray-700 mb-3">{filter.label}</h4>
              <div className={`${
                filter.type === 'checkbox' ? 'grid grid-cols-2 md:grid-cols-3 gap-2' : 'flex flex-wrap gap-2'
              }`}>
                {filter.options.map(option => (
                  <label
                    key={option.value}
                    className="flex items-center space-x-2 cursor-pointer p-3 rounded-lg hover:bg-white transition-colors border border-transparent hover:border-gray-200"
                  >
                    <input
                      type={filter.type === 'radio' ? 'radio' : 'checkbox'}
                      name={filter.type === 'radio' ? filter.key : undefined}
                      checked={filters[filter.key]?.includes(option.value) || false}
                      onChange={(e) => handleFilterChange(filter.key, option.value, e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      {option.icon && (
                        <i className={`${option.icon} text-gray-400 text-sm`}></i>
                      )}
                      <span className="text-sm text-gray-700">
                        {option.label}
                        {option.count !== undefined && (
                          <span className="text-gray-500 ml-1">({option.count})</span>
                        )}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Quick Filter Presets */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Quick Filters</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilters({ type: ['event'] })}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i className="fas fa-calendar mr-2"></i>
                Events Only
              </button>
              <button
                onClick={() => setFilters({ type: ['article'] })}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i className="fas fa-file-alt mr-2"></i>
                Articles Only
              </button>
              <button
                onClick={() => setFilters({ type: ['user'] })}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i className="fas fa-user mr-2"></i>
                People Only
              </button>
              <button
                onClick={() => setFilters({ date: ['week'] })}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i className="fas fa-clock mr-2"></i>
                This Week
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {Object.keys(filters).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(filters).flatMap(([key, values]) =>
            values.map(value => (
              <span
                key={`${key}-${value}`}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary text-white"
              >
                {value}
                <button
                  onClick={() => handleFilterChange(key, value, false)}
                  className="ml-2 hover:text-gray-200"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </span>
            ))
          )}
        </div>
      )}

      {/* Search Results Preview */}
      {results.length > 0 && query && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Search Results ({results.length})
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing top {Math.min(results.length, maxResults)} results for "{query}"
                {Object.keys(filters).length > 0 && (
                  <span> with {Object.keys(filters).length} filter{Object.keys(filters).length > 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
            <button
              onClick={handleSearch}
              className="text-primary hover:text-primary-dark text-sm font-medium flex items-center px-4 py-2 border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
            >
              View All Results
              <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {results.slice(0, 4).map(result => (
              <div
                key={result.id}
                onClick={() => router.push(result.url)}
                className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {result.image && (
                  <img
                    src={result.image}
                    alt={result.title}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <i className={`${getTypeIcon(result.type)} text-gray-400 text-sm`}></i>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {result.type}
                    </span>
                    {result.date && (
                      <span className="text-xs text-gray-400">
                        {new Date(result.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 truncate">{result.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                    {result.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    {result.tags && result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      {Math.round(result.relevanceScore * 100)}% match
                    </div>
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
