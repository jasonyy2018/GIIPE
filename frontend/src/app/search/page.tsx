'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import EnhancedSearchInterface from '@/components/search/EnhancedSearchInterface';
import AdvancedSearchModal from '@/components/search/AdvancedSearchModal';

interface SearchResult {
  id: number;
  type: 'event' | 'article' | 'news' | 'user';
  title: string;
  description: string;
  image?: string;
  date?: string;
  category?: string;
  url: string;
  relevance: number;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'event' | 'article' | 'news' | 'user'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  useEffect(() => {
    // Check authentication
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          router.push('/login');
          return;
        }
      }
      
      // Get search query from URL
      const query = searchParams.get('q') || '';
      setSearchQuery(query);
      
      if (query) {
        performSearch(query);
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, searchParams]);

  const performSearch = async (query: string) => {
    setLoading(true);
    
    // Simulate API call with mock data
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const searchResults: SearchResult[] = [];

    try {
      const token = localStorage.getItem('authToken');

      // Refetch data to ensure synchronization
      try {
        const eventsResponse = await fetch('/api/events', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          const events = eventsData.events || eventsData;
          
          const eventResults = events?.filter((event: any) => {
              if (!query.trim()) return true;
              return event.title.toLowerCase().includes(query.toLowerCase()) ||
                     event.description?.toLowerCase().includes(query.toLowerCase());
            })
            .map((event: any, index: number) => ({
              id: index + 1,
              type: 'event' as const,
              title: event.title,
              description: event.description || 'No description available',
              image: event.featuredImage || '/images/features/innovation.jpg',
              date: new Date(event.startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              category: 'Conference',
              url: `/events/${event.id}`,
              relevance: query.trim() ? 
                (event.title.toLowerCase().includes(query.toLowerCase()) ? 95 : 70) : 90
            }));
          
          searchResults.push(...eventResults);
        }
      } catch (error) {
        console.error('Error searching events:', error);
      }

      // News functionality removed
      // Refetch data to ensure synchronization
      searchResults.sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      console.error('Search error:', error);
    }
    
    setResults(searchResults);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      performSearch(searchQuery);
    }
  };

  const filteredResults = results.filter(result => 
    filter === 'all' || result.type === filter
  );

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'relevance':
        return b.relevance - a.relevance;
      case 'date':
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event':
        return 'fas fa-calendar-alt';
      case 'article':
        return 'fas fa-file-alt';
      case 'news':
        return 'fas fa-newspaper';
      case 'user':
        return 'fas fa-user';
      default:
        return 'fas fa-search';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'event':
        return 'bg-light text-primary-dark';
      case 'article':
        return 'bg-green-100 text-green-800';
      case 'news':
        return 'bg-purple-100 text-purple-800';
      case 'user':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-primary transition-colors"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
              <h1 className="text-2xl font-bold text-primary-dark">Search Results</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary hover:text-primary-dark font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Enhanced Search Interface */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <EnhancedSearchInterface
              placeholder="Search events, articles, news, users..."
              showFilters={true}
              showSuggestions={true}
              showRecentSearches={true}
              showPopularSearches={true}
              showFacetedSearch={true}
              showAdvancedSearch={true}
              maxSuggestions={8}
              maxResults={6}
              autoFocus={!searchQuery}
              enableVoiceSearch={true}
              enableKeyboardShortcuts={true}
              onSearch={(query, filters) => {
                setSearchQuery(query);
                performSearch(query);
              }}
              className="mb-4"
            />
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className="text-sm text-primary hover:text-primary-dark flex items-center"
              >
                <i className="fas fa-cogs mr-2"></i>
                Advanced Search
              </button>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex space-x-2">
                {[
                  { key: 'all', label: 'All', icon: 'fas fa-list' },
                  { key: 'event', label: 'Events', icon: 'fas fa-calendar-alt' },
                  { key: 'article', label: 'Articles', icon: 'fas fa-file-alt' },
                  { key: 'news', label: 'News', icon: 'fas fa-newspaper' },
                  { key: 'user', label: 'Users', icon: 'fas fa-user' }
                ].map((filterOption) => (
                  <button
                    key={filterOption.key}
                    onClick={() => setFilter(filterOption.key as any)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter === filterOption.key
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <i className={`${filterOption.icon} mr-2`}></i>
                    {filterOption.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Results Count */}
              <div className="mb-6">
                <p className="text-gray-600">
                  {sortedResults.length > 0 
                    ? `Found ${sortedResults.length} result${sortedResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
                    : searchQuery 
                      ? `No results found for "${searchQuery}"`
                      : 'Enter a search term to find content'
                  }
                </p>
              </div>

              {/* Results List */}
              {sortedResults.length > 0 ? (
                <div className="space-y-6">
                  {sortedResults.map((result) => (
                    <div key={result.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start space-x-4">
                        {result.image && (
                          <div className="flex-shrink-0">
                            <Image
                              src={result.image}
                              alt={result.title}
                              width={80}
                              height={80}
                              className="rounded-lg object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(result.type)}`}>
                                  <i className={`${getTypeIcon(result.type)} mr-1`}></i>
                                  {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                                </span>
                                {result.category && (
                                  <span className="text-xs text-gray-500">�?{result.category}</span>
                                )}
                                {result.date && (
                                  <span className="text-xs text-gray-500">�?{result.date}</span>
                                )}
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-primary transition-colors">
                                <a href={result.url}>{result.title}</a>
                              </h3>
                              <p className="text-gray-600 mb-3">{result.description}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">
                                  Relevance: {result.relevance}%
                                </span>
                                <button
                                  onClick={() => router.push(result.url)}
                                  className="text-primary hover:text-primary-dark font-medium text-sm"
                                >
                                  View Details �?
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-search text-3xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500 mb-6">
                    Try adjusting your search terms or browse our content categories.
                  </p>
                  <div className="space-x-4">
                    <button
                      onClick={() => router.push('/events')}
                      className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors"
                    >
                      Browse Events
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        initialQuery={searchQuery}
        onSearch={(searchParams) => {
          console.log('Advanced search params:', searchParams);
          // Handle advanced search parameters
        }}
      />
    </div>
  );
}