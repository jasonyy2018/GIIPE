interface AutocompleteResult {
  id: string;
  text: string;
  type: 'query' | 'entity' | 'filter';
  category?: string;
  description?: string;
  icon?: string;
  score: number;
  metadata?: Record<string, any>;
}

interface AutocompleteOptions {
  maxResults?: number;
  includeHistory?: boolean;
  includePopular?: boolean;
  includeEntities?: boolean;
  includeFilters?: boolean;
  contextualBoost?: boolean;
}

interface SearchContext {
  userId?: string;
  currentPage?: string;
  recentSearches?: string[];
  userPreferences?: {
    interests?: string[];
    contentTypes?: string[];
    categories?: string[];
  };
}

class SearchAutocompleteService {
  private cache = new Map<string, AutocompleteResult[]>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private popularQueries: string[] = [];
  private entityIndex: Map<string, any[]> = new Map();

  constructor() {
    this.initializePopularQueries();
    this.initializeEntityIndex();
    this.loadRealEventsData();
  }

  private async loadRealEventsData() {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const events = data.events || data;
        
        const eventEntities = events.map((event: any) => ({
          name: event.title,
          type: 'conference', // Refetch data to ensure synchronization
          category: 'Event'
        }));
        
        this.entityIndex.set('events', eventEntities);
      }
    } catch (error) {
      console.error('Error loading real events data for autocomplete:', error);
    }
  }

  private initializePopularQueries() {
    this.popularQueries = [
      'patent filing',
      'IP conference 2024',
      'trademark registration',
      'AI patents',
      'copyright law',
      'innovation summit',
      'patent trends',
      'IP attorney',
      'intellectual property',
      'patent search',
      'trademark search',
      'IP licensing',
      'patent analytics',
      'IP portfolio management',
      'patent prosecution',
      'IP valuation',
      'patent landscape',
      'IP strategy',
      'patent infringement',
      'IP due diligence'
    ];
  }

  private initializeEntityIndex() {
    // Mock entity data - in real implementation, this would come from a search index
    // Refetch data to ensure synchronization
    this.entityIndex.set('events', []);

    this.entityIndex.set('people', [
      { name: 'Dr. Sarah Johnson', role: 'IP Attorney', expertise: 'AI Patents' },
      { name: 'Prof. Michael Chen', role: 'Researcher', expertise: 'Patent Analytics' },
      { name: 'Lisa Rodriguez', role: 'IP Consultant', expertise: 'Trademark Law' },
      { name: 'David Kim', role: 'Patent Agent', expertise: 'Software Patents' },
      { name: 'Dr. Emily Watson', role: 'IP Strategist', expertise: 'Portfolio Management' }
    ]);

    this.entityIndex.set('topics', [
      { name: 'Artificial Intelligence', category: 'Technology', aliases: ['AI', 'Machine Learning', 'ML'] },
      { name: 'Patent Analytics', category: 'Analytics', aliases: ['Patent Data', 'IP Analytics'] },
      { name: 'Trademark Law', category: 'Legal', aliases: ['Trademark', 'Brand Protection'] },
      { name: 'Copyright', category: 'Legal', aliases: ['Copyright Law', 'Digital Rights'] },
      { name: 'IP Licensing', category: 'Business', aliases: ['Technology Transfer', 'Licensing'] }
    ]);

    this.entityIndex.set('organizations', [
      { name: 'USPTO', fullName: 'United States Patent and Trademark Office', type: 'government' },
      { name: 'WIPO', fullName: 'World Intellectual Property Organization', type: 'international' },
      { name: 'EPO', fullName: 'European Patent Office', type: 'regional' },
      { name: 'INTA', fullName: 'International Trademark Association', type: 'association' },
      { name: 'AIPLA', fullName: 'American Intellectual Property Law Association', type: 'association' }
    ]);
  }

  async getAutocompleteSuggestions(
    query: string,
    options: AutocompleteOptions = {},
    context: SearchContext = {}
  ): Promise<AutocompleteResult[]> {
    if (!query || query.length < 2) {
      return this.getDefaultSuggestions(options, context);
    }

    const cacheKey = `${query}_${JSON.stringify(options)}_${JSON.stringify(context)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const results: AutocompleteResult[] = [];
    const queryLower = query.toLowerCase();

    // Query completions
    if (options.includeHistory !== false) {
      results.push(...this.getQueryCompletions(queryLower, context));
    }

    // Entity suggestions
    if (options.includeEntities !== false) {
      results.push(...this.getEntitySuggestions(queryLower));
    }

    // Filter suggestions
    if (options.includeFilters !== false) {
      results.push(...this.getFilterSuggestions(queryLower));
    }

    // Popular query suggestions
    if (options.includePopular !== false) {
      results.push(...this.getPopularQuerySuggestions(queryLower));
    }

    // Apply contextual boosting
    if (options.contextualBoost && context.userPreferences) {
      this.applyContextualBoost(results, context);
    }

    // Sort by score and limit results
    const sortedResults = results?.sort((a, b) => b.score - a.score)
      .slice(0, options.maxResults || 10);

    // Cache results
    this.cache.set(cacheKey, sortedResults);
    setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);

    return sortedResults;
  }

  private getDefaultSuggestions(options: AutocompleteOptions, context: SearchContext): AutocompleteResult[] {
    const results: AutocompleteResult[] = [];

    // Recent searches
    if (options.includeHistory !== false && context.recentSearches) {
      results.push(...context.recentSearches.slice(0, 3).map((query, index) => ({
        id: `recent_${index}`,
        text: query,
        type: 'query' as const,
        category: 'Recent',
        icon: 'fas fa-history',
        score: 0.8 - (index * 0.1),
        metadata: { source: 'recent' }
      })));
    }

    // Popular searches
    if (options.includePopular !== false) {
      results.push(...this.popularQueries.slice(0, 5).map((query, index) => ({
        id: `popular_${index}`,
        text: query,
        type: 'query' as const,
        category: 'Popular',
        icon: 'fas fa-fire',
        score: 0.7 - (index * 0.05),
        metadata: { source: 'popular' }
      })));
    }

    return results;
  }

  private getQueryCompletions(query: string, context: SearchContext): AutocompleteResult[] {
    const results: AutocompleteResult[] = [];

    // Smart query completions based on common patterns
    const completions = [
      { pattern: /^patent/, suggestions: ['patent filing', 'patent search', 'patent analytics', 'patent trends'] },
      { pattern: /^trademark/, suggestions: ['trademark registration', 'trademark search', 'trademark law'] },
      { pattern: /^copyright/, suggestions: ['copyright law', 'copyright infringement', 'copyright protection'] },
      { pattern: /^ip/, suggestions: ['IP strategy', 'IP portfolio', 'IP licensing', 'IP valuation'] },
      { pattern: /^ai/, suggestions: ['AI patents', 'AI innovation', 'AI technology trends'] },
      { pattern: /^conference/, suggestions: ['conference 2024', 'conference schedule', 'conference speakers'] }
    ];

    completions.forEach(({ pattern, suggestions }) => {
      if (pattern.test(query)) {
        suggestions.forEach((suggestion, index) => {
          if (suggestion.toLowerCase().includes(query)) {
            results.push({
              id: `completion_${suggestion}`,
              text: suggestion,
              type: 'query',
              category: 'Suggestions',
              icon: 'fas fa-search',
              score: 0.9 - (index * 0.1),
              metadata: { source: 'completion', pattern: pattern.source }
            });
          }
        });
      }
    });

    return results;
  }

  private getEntitySuggestions(query: string): AutocompleteResult[] {
    const results: AutocompleteResult[] = [];

    // Search through entity index
    this.entityIndex.forEach((entities, entityType) => {
      entities.forEach(entity => {
        const matchScore = this.calculateMatchScore(query, entity);
        if (matchScore > 0.3) {
          results.push({
            id: `entity_${entityType}_${entity.name}`,
            text: entity.name,
            type: 'entity',
            category: this.getEntityCategoryLabel(entityType),
            description: this.getEntityDescription(entity, entityType),
            icon: this.getEntityIcon(entityType),
            score: matchScore,
            metadata: { 
              source: 'entity', 
              entityType, 
              entity 
            }
          });
        }
      });
    });

    return results;
  }

  private getFilterSuggestions(query: string): AutocompleteResult[] {
    const results: AutocompleteResult[] = [];

    const filterSuggestions = [
      { filter: 'type:event', label: 'Events only', icon: 'fas fa-calendar' },
      { filter: 'type:article', label: 'Articles only', icon: 'fas fa-file-alt' },
      { filter: 'type:user', label: 'People only', icon: 'fas fa-user' },
      { filter: 'type:news', label: 'News only', icon: 'fas fa-newspaper' },
      { filter: 'date:week', label: 'This week', icon: 'fas fa-clock' },
      { filter: 'date:month', label: 'This month', icon: 'fas fa-calendar-alt' },
      { filter: 'category:conference', label: 'Conferences', icon: 'fas fa-users' },
      { filter: 'category:workshop', label: 'Workshops', icon: 'fas fa-tools' }
    ];

    filterSuggestions.forEach(({ filter, label, icon }) => {
      if (label.toLowerCase().includes(query) || filter.toLowerCase().includes(query)) {
        results.push({
          id: `filter_${filter}`,
          text: `${query} ${filter}`,
          type: 'filter',
          category: 'Filters',
          description: label,
          icon,
          score: 0.6,
          metadata: { source: 'filter', filter, originalQuery: query }
        });
      }
    });

    return results;
  }

  private getPopularQuerySuggestions(query: string): AutocompleteResult[] {
    return this.popularQueries?.filter(popular => popular.toLowerCase().includes(query))
      .map((popular, index) => ({
        id: `popular_match_${popular}`,
        text: popular,
        type: 'query' as const,
        category: 'Popular',
        icon: 'fas fa-fire',
        score: 0.7 - (index * 0.05),
        metadata: { source: 'popular_match' }
      }));
  }

  private calculateMatchScore(query: string, entity: any): number {
    const name = entity.name.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match
    if (name === queryLower) return 1.0;

    // Starts with query
    if (name.startsWith(queryLower)) return 0.9;

    // Contains query
    if (name.includes(queryLower)) return 0.7;

    // Check aliases if available
    if (entity.aliases) {
      for (const alias of entity.aliases) {
        const aliasLower = alias.toLowerCase();
        if (aliasLower === queryLower) return 0.95;
        if (aliasLower.startsWith(queryLower)) return 0.85;
        if (aliasLower.includes(queryLower)) return 0.65;
      }
    }

    // Fuzzy matching for typos
    const fuzzyScore = this.calculateFuzzyScore(queryLower, name);
    return fuzzyScore > 0.6 ? fuzzyScore * 0.5 : 0;
  }

  private calculateFuzzyScore(query: string, target: string): number {
    // Simple Levenshtein distance-based fuzzy matching
    const matrix = Array(query.length + 1).fill(null).map(() => Array(target.length + 1).fill(null));

    for (let i = 0; i <= target.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= query.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= query.length; j++) {
      for (let i = 1; i <= target.length; i++) {
        const indicator = query[j - 1] === target[i - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = matrix[query.length][target.length];
    const maxLength = Math.max(query.length, target.length);
    return 1 - (distance / maxLength);
  }

  private applyContextualBoost(results: AutocompleteResult[], context: SearchContext): void {
    const { userPreferences } = context;
    if (!userPreferences) return;

    results.forEach(result => {
      let boost = 0;

      // Boost based on user interests
      if (userPreferences.interests) {
        userPreferences.interests.forEach(interest => {
          if (result.text.toLowerCase().includes(interest.toLowerCase()) ||
              result.description?.toLowerCase().includes(interest.toLowerCase())) {
            boost += 0.2;
          }
        });
      }

      // Boost based on preferred content types
      if (userPreferences.contentTypes && result.metadata?.entityType) {
        if (userPreferences.contentTypes.includes(result.metadata.entityType)) {
          boost += 0.15;
        }
      }

      // Boost based on preferred categories
      if (userPreferences.categories && result.category) {
        if (userPreferences.categories.includes(result.category)) {
          boost += 0.1;
        }
      }

      result.score = Math.min(1.0, result.score + boost);
    });
  }

  private getEntityCategoryLabel(entityType: string): string {
    const labels: Record<string, string> = {
      events: 'Events',
      people: 'People',
      topics: 'Topics',
      organizations: 'Organizations'
    };
    return labels[entityType] || entityType;
  }

  private getEntityDescription(entity: any, entityType: string): string {
    switch (entityType) {
      case 'events':
        return `${entity.type} • ${entity.category}`;
      case 'people':
        return `${entity.role} • ${entity.expertise}`;
      case 'topics':
        return `${entity.category} topic`;
      case 'organizations':
        return `${entity.type} • ${entity.fullName}`;
      default:
        return '';
    }
  }

  private getEntityIcon(entityType: string): string {
    const icons: Record<string, string> = {
      events: 'fas fa-calendar',
      people: 'fas fa-user',
      topics: 'fas fa-tag',
      organizations: 'fas fa-building'
    };
    return icons[entityType] || 'fas fa-search';
  }

  // Method to update popular queries based on search analytics
  updatePopularQueries(queries: string[]): void {
    this.popularQueries = queries;
  }

  // Method to add entities to the index
  addEntities(entityType: string, entities: any[]): void {
    this.entityIndex.set(entityType, entities);
  }

  // Method to clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Method to get search suggestions for a specific context
  async getContextualSuggestions(
    context: 'dashboard' | 'events' | 'articles' | 'users',
    query: string = ''
  ): Promise<AutocompleteResult[]> {
    const contextualOptions: Record<string, AutocompleteOptions> = {
      dashboard: { includeHistory: true, includePopular: true, maxResults: 5 },
      events: { includeEntities: true, includeFilters: true, maxResults: 8 },
      articles: { includeEntities: true, includePopular: true, maxResults: 6 },
      users: { includeEntities: true, maxResults: 10 }
    };

    return this.getAutocompleteSuggestions(query, contextualOptions[context]);
  }
}

export const searchAutocompleteService = new SearchAutocompleteService();
export type { AutocompleteResult, AutocompleteOptions, SearchContext };