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

interface SearchInterfaceProps {
  placeholder?: string;
  showFilters?: boolean;
  showSuggestions?: boolean;
  showRecentSearches?: boolean;
  showPopularSearches?: boolean;
  maxSuggestions?: number;
  maxResults?: number;
  onSearch?: (query: string, filters: Record<string, string[]>) => void;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  className?: string;
  autoFocus?: boolean;
}

export default function SearchInterface({
  placeholder = "Search events, articles, users, and more...",
  showFilters = true,
  showSuggestions = true,
  showRecentSearches = true,
  showPopularSearches = true,
  maxSuggestions = 8,
  maxResults = 5,
  onSearch,
  onSuggestionClick,
  className = "",
  autoFocus = false
}: SearchInterfaceProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'popularity'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        setResults([]);
        setActiveFilters([]);
        return;
      }

      setLoading(true);
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
        
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
        setResults([]);
        setActiveFilters([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [filters, sortBy, sortOrder, maxResults, maxSuggestions]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

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

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSuggestionDropdown(true);
      }
      
      // Escape to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setQuery('');
        setShowSuggestionDropdown(false);
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestionDropdown(value.length > 0);
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

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Input */}
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
            className="w-full pl-12 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
          />
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <i className={`fas fa-search text-gray-400 ${loading ? 'animate-pulse' : ''}`}></i>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
            {/* Keyboard shortcut hint */}
            {!query && (
              <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-400">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⌘</kbd>
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
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && showSuggestionDropdown && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          >
            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
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
                    {suggestion.relevanceScore && (
                      <div className={`text-xs ${
                        index === selectedSuggestionIndex ? 'text-gray-200' : 'text-gray-400'
                      } mr-2`}>
                        {Math.round(suggestion.relevanceScore * 100)}%
                      </div>
                    )}
                    <i className={`fas fa-arrow-right ${
                      index === selectedSuggestionIndex ? 'text-white' : 'text-gray-300'
                    } ml-2`}></i>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {showRecentSearches && recentSearches.length > 0 && !query && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
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
                    <i className="fas fa-arrow-right text-gray-300 ml-2"></i>
                  </div>
                ))}
              </div>
            )}

            {/* Popular Searches */}
            {showPopularSearches && popularSearches.length > 0 && !query && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  Popular Searches
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
              <div className="px-4 py-6 text-center text-gray-500">
                <i className="fas fa-search text-2xl mb-2"></i>
                <div>No suggestions found for "{query}"</div>
                <div className="text-sm mt-1">Try a different search term</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            >
              <i className={`fas fa-filter mr-2 ${showAdvancedFilters ? 'text-primary' : ''}`}></i>
              Advanced Filters
              <i className={`fas fa-chevron-${showAdvancedFilters ? 'up' : 'down'} ml-2`}></i>
            </button>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:text-primary-dark"
              >
                Clear All
              </button>
            )}
          </div>

          {showAdvancedFilters && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-6">
              {/* Sort Options */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Sort Results</h4>
                <div className="flex flex-wrap gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'popularity')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date</option>
                    <option value="popularity">Popularity</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Filters */}
              {activeFilters.map(filter => (
                <div key={filter.key}>
                  <h4 className="font-medium text-gray-700 mb-3">{filter.label}</h4>
                  <div className={`${
                    filter.type === 'checkbox' ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'
                  }`}>
                    {filter.options.map(option => (
                      <label
                        key={option.value}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-white transition-colors"
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
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <i className="fas fa-calendar mr-2"></i>
                    Events Only
                  </button>
                  <button
                    onClick={() => setFilters({ type: ['article'] })}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <i className="fas fa-file-alt mr-2"></i>
                    Articles Only
                  </button>
                  <button
                    onClick={() => setFilters({ date: ['week'] })}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
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
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(filters).flatMap(([key, values]) =>
                values.map(value => (
                  <span
                    key={`${key}-${value}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-light text-white"
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
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                Sort: {sortBy} ({sortOrder})
              </div>
              <button
                onClick={handleSearch}
                className="text-primary hover:text-primary-dark text-sm font-medium flex items-center"
              >
                View All Results
                <i className="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {results.slice(0, 3).map(result => (
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
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <div className="text-xs text-gray-400">
                    {Math.round(result.relevanceScore * 100)}% match
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