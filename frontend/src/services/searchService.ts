interface SearchSuggestion {
  id: string;
  type: 'event' | 'article' | 'user' | 'news';
  title: string;
  subtitle?: string;
  url: string;
  icon: string;
  category?: string;
  relevanceScore?: number;
}

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

interface SearchFilter {
  key: string;
  label: string;
  type: 'checkbox' | 'radio' | 'date' | 'range';
  options: SearchFilterOption[];
}

interface SearchFilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: string;
}

interface SearchQuery {
  query: string;
  filters: Record<string, string[]>;
  sortBy?: 'relevance' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface SearchResponse {
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  filters: SearchFilter[];
  totalCount: number;
  facets: Record<string, { value: string; count: number }[]>;
  searchTime: number;
}

class SearchService {
  private suggestionCache = new Map<string, SearchSuggestion[]>();
  private resultCache = new Map<string, SearchResponse>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private readonly placeholderImages = [
    '/images/features/innovation.jpg',
    '/images/features/research.jpg',
    '/images/features/collaboration.jpg',
  ];

  private placeholder(i: number): string {
    return this.placeholderImages[i % this.placeholderImages.length];
  }

  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query.trim()) return [];

    const cacheKey = `suggestions_${query.toLowerCase()}`;
    const cached = this.suggestionCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Mock implementation - replace with actual API call
      const mockSuggestions: SearchSuggestion[] = [
        {
          id: '1',
          type: 'event' as const,
          title: 'IP Innovation Summit 2024',
          subtitle: 'March 15-17, 2024 • San Francisco',
          url: '/events/ip-innovation-summit-2024',
          icon: 'fas fa-calendar',
          category: 'Conference',
          relevanceScore: 0.95
        },
        {
          id: '2',
          type: 'article' as const,
          title: 'Patent Trends in AI Technology',
          subtitle: 'Published 2 days ago • Dr. Sarah Johnson',
          url: '/articles/patent-trends-ai',
          icon: 'fas fa-file-alt',
          category: 'Research',
          relevanceScore: 0.87
        },
        {
          id: '3',
          type: 'user' as const,
          title: 'Dr. Sarah Johnson',
          subtitle: 'IP Attorney at TechCorp • 500+ connections',
          url: '/users/sarah-johnson',
          icon: 'fas fa-user',
          category: 'Professional',
          relevanceScore: 0.82
        },
        {
          id: '4',
          type: 'news' as const,
          title: 'New Patent Filing Guidelines Released',
          subtitle: 'USPTO • 1 hour ago',
          url: '/news/patent-filing-guidelines',
          icon: 'fas fa-newspaper',
          category: 'Regulatory',
          relevanceScore: 0.78
        }
      ].filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
      );

      this.suggestionCache.set(cacheKey, mockSuggestions);
      setTimeout(() => this.suggestionCache.delete(cacheKey), this.cacheTimeout);

      return mockSuggestions;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }

  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    const cacheKey = `search_${JSON.stringify(searchQuery)}`;
    const cached = this.resultCache.get(cacheKey);
    if (cached) return cached;

    try {
      const startTime = Date.now();
      
      // Mock implementation - replace with actual API call
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'event' as const,
          title: 'IP Innovation Summit 2024',
          description: 'Join leading IP professionals for three days of networking and learning about the latest trends in intellectual property, patent law, and innovation management.',
          url: '/events/ip-innovation-summit-2024',
          image: this.placeholder(0),
          date: '2024-03-15',
          tags: ['IP', 'Innovation', 'Networking', 'Patents'],
          relevanceScore: 0.95,
          category: 'Conference',
          location: 'San Francisco, CA'
        },
        {
          id: '2',
          type: 'article' as const,
          title: 'Patent Trends in AI Technology: A Comprehensive Analysis',
          description: 'An in-depth analysis of recent patent filings in artificial intelligence and machine learning technologies, including emerging trends and key players.',
          url: '/articles/patent-trends-ai',
          image: this.placeholder(1),
          date: '2024-01-20',
          tags: ['Patents', 'AI', 'Technology', 'Analysis'],
          relevanceScore: 0.87,
          category: 'Research',
          author: 'Dr. Sarah Johnson'
        },
        {
          id: '3',
          type: 'user' as const,
          title: 'Dr. Sarah Johnson',
          description: 'Senior IP Attorney at TechCorp with 15+ years of experience in patent law, specializing in AI and software patents. Active speaker and researcher.',
          url: '/users/sarah-johnson',
          image: this.placeholder(2),
          tags: ['IP Attorney', 'AI Patents', 'Speaker'],
          relevanceScore: 0.82,
          category: 'Professional',
          location: 'Silicon Valley, CA'
        },
        {
          id: '4',
          type: 'news' as const,
          title: 'USPTO Releases New Patent Filing Guidelines for AI Inventions',
          description: 'The United States Patent and Trademark Office has published updated guidelines for patent applications involving artificial intelligence inventions.',
          url: '/news/patent-filing-guidelines',
          image: this.placeholder(0),
          date: '2024-01-25',
          tags: ['USPTO', 'Guidelines', 'AI Patents', 'Regulatory'],
          relevanceScore: 0.78,
          category: 'Regulatory'
        }
      ].filter(item => {
        const queryMatch = item.title.toLowerCase().includes(searchQuery.query.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.query.toLowerCase()) ||
                          item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.query.toLowerCase()));
        
        if (!queryMatch) return false;

        // Apply filters
        for (const [filterKey, filterValues] of Object.entries(searchQuery.filters)) {
          if (filterValues.length === 0) continue;
          
          switch (filterKey) {
            case 'type':
              if (!filterValues.includes(item.type)) return false;
              break;
            case 'category':
              if (item.category && !filterValues.includes(item.category)) return false;
              break;
            case 'date':
              // Implement date filtering logic
              break;
          }
        }
        
        return true;
      });

      // Sort results
      if (searchQuery.sortBy) {
        mockResults.sort((a, b) => {
          let comparison = 0;
          switch (searchQuery.sortBy) {
            case 'relevance':
              comparison = b.relevanceScore - a.relevanceScore;
              break;
            case 'date':
              const dateA = new Date(a.date || 0).getTime();
              const dateB = new Date(b.date || 0).getTime();
              comparison = dateB - dateA;
              break;
            case 'popularity':
              // Mock popularity score
              comparison = Math.random() - 0.5;
              break;
          }
          return searchQuery.sortOrder === 'asc' ? -comparison : comparison;
        });
      }

      const filters: SearchFilter[] = [
        {
          key: 'type',
          label: 'Content Type',
          type: 'checkbox',
          options: [
            { value: 'event', label: 'Events', count: mockResults.filter(r => r.type === 'event').length, icon: 'fas fa-calendar' },
            { value: 'article', label: 'Articles', count: mockResults.filter(r => r.type === 'article').length, icon: 'fas fa-file-alt' },
            { value: 'user', label: 'Users', count: mockResults.filter(r => r.type === 'user').length, icon: 'fas fa-user' },
            { value: 'news', label: 'News', count: mockResults.filter(r => r.type === 'news').length, icon: 'fas fa-newspaper' }
          ].filter(option => option.count && option.count > 0)
        },
        {
          key: 'category',
          label: 'Category',
          type: 'checkbox',
          options: [
            { value: 'Conference', label: 'Conference', count: mockResults.filter(r => r.category === 'Conference').length },
            { value: 'Research', label: 'Research', count: mockResults.filter(r => r.category === 'Research').length },
            { value: 'Professional', label: 'Professional', count: mockResults.filter(r => r.category === 'Professional').length },
            { value: 'Regulatory', label: 'Regulatory', count: mockResults.filter(r => r.category === 'Regulatory').length }
          ].filter(option => option.count && option.count > 0)
        },
        {
          key: 'date',
          label: 'Date Range',
          type: 'radio',
          options: [
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
            { value: 'year', label: 'This Year' },
            { value: 'all', label: 'All Time' }
          ]
        }
      ];

      const facets = {
        types: mockResults.reduce((acc, result) => {
          const existing = acc.find(f => f.value === result.type);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ value: result.type, count: 1 });
          }
          return acc;
        }, [] as { value: string; count: number }[]),
        categories: mockResults.reduce((acc, result) => {
          if (result.category) {
            const existing = acc.find(f => f.value === result.category);
            if (existing) {
              existing.count++;
            } else {
              acc.push({ value: result.category, count: 1 });
            }
          }
          return acc;
        }, [] as { value: string; count: number }[])
      };

      const response: SearchResponse = {
        results: mockResults,
        suggestions: await this.getSuggestions(searchQuery.query),
        filters,
        totalCount: mockResults.length,
        facets,
        searchTime: Date.now() - startTime
      };

      this.resultCache.set(cacheKey, response);
      setTimeout(() => this.resultCache.delete(cacheKey), this.cacheTimeout);

      return response;
    } catch (error) {
      console.error('Error performing search:', error);
      throw error;
    }
  }

  async getPopularSearches(): Promise<string[]> {
    // Mock popular searches
    return [
      'patent filing',
      'IP conference',
      'trademark registration',
      'AI patents',
      'copyright law',
      'innovation summit',
      'patent trends',
      'IP attorney'
    ];
  }

  async getRecentSearches(_userId: string): Promise<string[]> {
    // Mock recent searches - in real implementation, fetch from user's search history
    return [
      'patent trends AI',
      'IP conference 2024',
      'trademark filing process'
    ];
  }

  clearCache(): void {
    this.suggestionCache.clear();
    this.resultCache.clear();
  }
}

export const searchService = new SearchService();
export type { SearchSuggestion, SearchResult, SearchFilter, SearchQuery, SearchResponse };