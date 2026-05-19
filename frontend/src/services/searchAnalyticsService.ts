interface SearchEvent {
  id: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  type: 'search' | 'suggestion_click' | 'result_click' | 'filter_apply' | 'no_results';
  query: string;
  filters?: Record<string, string[]>;
  resultCount?: number;
  clickedResultId?: string;
  clickedResultPosition?: number;
  suggestionId?: string;
  searchTime?: number;
  userAgent?: string;
  referrer?: string;
}

interface SearchMetrics {
  totalSearches: number;
  uniqueUsers: number;
  averageSearchTime: number;
  topQueries: { query: string; count: number; successRate: number }[];
  topFilters: { filter: string; count: number }[];
  clickThroughRate: number;
  noResultsRate: number;
  suggestionUsageRate: number;
  popularResultTypes: { type: string; count: number }[];
}

interface SearchInsights {
  trendingQueries: string[];
  improvementSuggestions: string[];
  userBehaviorPatterns: {
    peakSearchTimes: { hour: number; count: number }[];
    commonQueryPatterns: { pattern: string; examples: string[] }[];
    filterUsagePatterns: { filter: string; usage: number }[];
  };
  performanceMetrics: {
    averageResponseTime: number;
    slowQueries: { query: string; avgTime: number }[];
    errorRate: number;
  };
}

class SearchAnalyticsService {
  private events: SearchEvent[] = [];
  private sessionId: string;
  private maxEvents = 1000; // Limit in-memory storage

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadStoredEvents();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('search_analytics_events');
      if (stored) {
        const parsedEvents = JSON.parse(stored);
        this.events = parsedEvents.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load stored search events:', error);
    }
  }

  private saveEvents(): void {
    try {
      // Keep only recent events to prevent storage bloat
      const recentEvents = this.events.slice(-this.maxEvents);
      localStorage.setItem('search_analytics_events', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Failed to save search events:', error);
    }
  }

  trackSearch(
    query: string,
    filters: Record<string, string[]> = {},
    resultCount: number = 0,
    searchTime: number = 0,
    userId?: string
  ): void {
    const event: SearchEvent = {
      id: this.generateEventId(),
      userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      type: 'search',
      query: query.trim(),
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      resultCount,
      searchTime,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    this.events.push(event);
    this.saveEvents();

    // Track no results
    if (resultCount === 0) {
      this.trackNoResults(query, filters, userId);
    }

    // Send to analytics service (in real implementation)
    this.sendToAnalyticsService(event);
  }

  trackSuggestionClick(
    query: string,
    suggestionId: string,
    suggestionText: string,
    userId?: string
  ): void {
    const event: SearchEvent = {
      id: this.generateEventId(),
      userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      type: 'suggestion_click',
      query: query.trim(),
      suggestionId,
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    this.saveEvents();
    this.sendToAnalyticsService(event);
  }

  trackResultClick(
    query: string,
    resultId: string,
    position: number,
    filters: Record<string, string[]> = {},
    userId?: string
  ): void {
    const event: SearchEvent = {
      id: this.generateEventId(),
      userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      type: 'result_click',
      query: query.trim(),
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      clickedResultId: resultId,
      clickedResultPosition: position,
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    this.saveEvents();
    this.sendToAnalyticsService(event);
  }

  trackFilterApply(
    query: string,
    filterKey: string,
    filterValue: string,
    userId?: string
  ): void {
    const event: SearchEvent = {
      id: this.generateEventId(),
      userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      type: 'filter_apply',
      query: query.trim(),
      filters: { [filterKey]: [filterValue] },
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    this.saveEvents();
    this.sendToAnalyticsService(event);
  }

  private trackNoResults(
    query: string,
    filters: Record<string, string[]> = {},
    userId?: string
  ): void {
    const event: SearchEvent = {
      id: this.generateEventId(),
      userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      type: 'no_results',
      query: query.trim(),
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      resultCount: 0,
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    this.saveEvents();
    this.sendToAnalyticsService(event);
  }

  getSearchMetrics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): SearchMetrics {
    const cutoffTime = this.getCutoffTime(timeRange);
    const relevantEvents = this.events.filter(event => event.timestamp >= cutoffTime);

    const searchEvents = relevantEvents.filter(event => event.type === 'search');
    const clickEvents = relevantEvents.filter(event => event.type === 'result_click');
    const noResultEvents = relevantEvents.filter(event => event.type === 'no_results');
    const suggestionEvents = relevantEvents.filter(event => event.type === 'suggestion_click');

    // Calculate metrics
    const totalSearches = searchEvents.length;
    const uniqueUsers = new Set(searchEvents.map(event => event.userId).filter(Boolean)).size;
    const averageSearchTime = searchEvents.reduce((sum, event) => sum + (event.searchTime || 0), 0) / totalSearches || 0;

    // Top queries with success rate
    const queryStats = this.calculateQueryStats(searchEvents, clickEvents, noResultEvents);
    const topQueries = Object.entries(queryStats)
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        successRate: stats.clicks / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top filters
    const filterStats: Record<string, number> = {};
    relevantEvents.forEach(event => {
      if (event.filters) {
        Object.entries(event.filters).forEach(([key, values]) => {
          values.forEach(value => {
            const filterKey = `${key}:${value}`;
            filterStats[filterKey] = (filterStats[filterKey] || 0) + 1;
          });
        });
      }
    });

    const topFilters = Object.entries(filterStats)
      .map(([filter, count]) => ({ filter, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate rates
    const clickThroughRate = totalSearches > 0 ? clickEvents.length / totalSearches : 0;
    const noResultsRate = totalSearches > 0 ? noResultEvents.length / totalSearches : 0;
    const suggestionUsageRate = totalSearches > 0 ? suggestionEvents.length / totalSearches : 0;

    // Popular result types (mock data - would come from actual clicks)
    const popularResultTypes = [
      { type: 'event', count: Math.floor(clickEvents.length * 0.4) },
      { type: 'article', count: Math.floor(clickEvents.length * 0.3) },
      { type: 'user', count: Math.floor(clickEvents.length * 0.2) },
      { type: 'news', count: Math.floor(clickEvents.length * 0.1) }
    ];

    return {
      totalSearches,
      uniqueUsers,
      averageSearchTime,
      topQueries,
      topFilters,
      clickThroughRate,
      noResultsRate,
      suggestionUsageRate,
      popularResultTypes
    };
  }

  getSearchInsights(timeRange: 'day' | 'week' | 'month' = 'week'): SearchInsights {
    const cutoffTime = this.getCutoffTime(timeRange);
    const relevantEvents = this.events.filter(event => event.timestamp >= cutoffTime);

    // Trending queries (queries with increasing frequency)
    const trendingQueries = this.calculateTrendingQueries(relevantEvents);

    // Improvement suggestions
    const improvementSuggestions = this.generateImprovementSuggestions(relevantEvents);

    // User behavior patterns
    const userBehaviorPatterns = this.analyzeUserBehaviorPatterns(relevantEvents);

    // Performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(relevantEvents);

    return {
      trendingQueries,
      improvementSuggestions,
      userBehaviorPatterns,
      performanceMetrics
    };
  }

  private calculateQueryStats(
    searchEvents: SearchEvent[],
    clickEvents: SearchEvent[],
    noResultEvents: SearchEvent[]
  ): Record<string, { count: number; clicks: number; noResults: number }> {
    const stats: Record<string, { count: number; clicks: number; noResults: number }> = {};

    searchEvents.forEach(event => {
      if (!stats[event.query]) {
        stats[event.query] = { count: 0, clicks: 0, noResults: 0 };
      }
      stats[event.query].count++;
    });

    clickEvents.forEach(event => {
      if (stats[event.query]) {
        stats[event.query].clicks++;
      }
    });

    noResultEvents.forEach(event => {
      if (stats[event.query]) {
        stats[event.query].noResults++;
      }
    });

    return stats;
  }

  private calculateTrendingQueries(events: SearchEvent[]): string[] {
    const searchEvents = events.filter(event => event.type === 'search');
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentQueries: Record<string, number> = {};
    const olderQueries: Record<string, number> = {};

    searchEvents.forEach(event => {
      const queryCount = event.timestamp >= oneDayAgo ? recentQueries : olderQueries;
      queryCount[event.query] = (queryCount[event.query] || 0) + 1;
    });

    // Calculate trend score (recent frequency / older frequency)
    const trendScores: { query: string; score: number }[] = [];
    Object.keys(recentQueries).forEach(query => {
      const recentCount = recentQueries[query] || 0;
      const olderCount = olderQueries[query] || 1; // Avoid division by zero
      const trendScore = recentCount / olderCount;
      
      if (recentCount >= 2) { // Only consider queries with some volume
        trendScores.push({ query, score: trendScore });
      }
    });

    return trendScores?.sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.query);
  }

  private generateImprovementSuggestions(events: SearchEvent[]): string[] {
    const suggestions: string[] = [];
    const noResultEvents = events.filter(event => event.type === 'no_results');
    const searchEvents = events.filter(event => event.type === 'search');

    // High no-results rate
    if (noResultEvents.length / searchEvents.length > 0.2) {
      suggestions.push('Consider expanding content coverage for common search terms');
    }

    // Low click-through rate
    const clickEvents = events.filter(event => event.type === 'result_click');
    if (clickEvents.length / searchEvents.length < 0.3) {
      suggestions.push('Improve search result relevance and presentation');
    }

    // Slow search times
    const avgSearchTime = searchEvents.reduce((sum, event) => sum + (event.searchTime || 0), 0) / searchEvents.length;
    if (avgSearchTime > 1000) {
      suggestions.push('Optimize search performance to reduce response times');
    }

    // Common failed queries
    const failedQueries = noResultEvents.map(event => event.query);
    const commonFailures = this.getMostCommon(failedQueries, 3);
    if (commonFailures.length > 0) {
      suggestions.push(`Add content for commonly searched terms: ${commonFailures.join(', ')}`);
    }

    return suggestions;
  }

  private analyzeUserBehaviorPatterns(events: SearchEvent[]) {
    // Peak search times
    const hourCounts: Record<number, number> = {};
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakSearchTimes = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Common query patterns
    const queries = events.filter(event => event.type === 'search').map(event => event.query);
    const patterns = this.identifyQueryPatterns(queries);

    // Filter usage patterns
    const filterUsage: Record<string, number> = {};
    events.forEach(event => {
      if (event.filters) {
        Object.keys(event.filters).forEach(filterKey => {
          filterUsage[filterKey] = (filterUsage[filterKey] || 0) + 1;
        });
      }
    });

    const filterUsagePatterns = Object.entries(filterUsage)
      .map(([filter, usage]) => ({ filter, usage }))
      .sort((a, b) => b.usage - a.usage);

    return {
      peakSearchTimes,
      commonQueryPatterns: patterns,
      filterUsagePatterns
    };
  }

  private calculatePerformanceMetrics(events: SearchEvent[]) {
    const searchEvents = events.filter(event => event.type === 'search' && event.searchTime);
    
    const averageResponseTime = searchEvents.reduce((sum, event) => sum + (event.searchTime || 0), 0) / searchEvents.length || 0;

    // Identify slow queries
    const queryTimes: Record<string, number[]> = {};
    searchEvents.forEach(event => {
      if (event.searchTime) {
        if (!queryTimes[event.query]) {
          queryTimes[event.query] = [];
        }
        queryTimes[event.query].push(event.searchTime);
      }
    });

    const slowQueries = Object.entries(queryTimes)
      .map(([query, times]) => ({
        query,
        avgTime: times.reduce((sum, time) => sum + time, 0) / times.length
      }))
      .filter(item => item.avgTime > 1000)
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    // Mock error rate (would be calculated from actual error events)
    const errorRate = 0.02; // 2% error rate

    return {
      averageResponseTime,
      slowQueries,
      errorRate
    };
  }

  private identifyQueryPatterns(queries: string[]): { pattern: string; examples: string[] }[] {
    const patterns: Record<string, string[]> = {};

    queries.forEach(query => {
      const words = query.toLowerCase().split(' ');
      
      // Identify patterns like "patent [something]", "IP [something]", etc.
      if (words.length >= 2) {
        const firstWord = words[0];
        if (['patent', 'ip', 'trademark', 'copyright', 'conference'].includes(firstWord)) {
          const pattern = `${firstWord} *`;
          if (!patterns[pattern]) {
            patterns[pattern] = [];
          }
          if (patterns[pattern].length < 3) {
            patterns[pattern].push(query);
          }
        }
      }
    });

    return Object.entries(patterns)
      .map(([pattern, examples]) => ({ pattern, examples }))
      .filter(item => item.examples.length >= 2);
  }

  private getMostCommon<T>(items: T[], limit: number): T[] {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const key = String(item);
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([item]) => item as T);
  }

  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendToAnalyticsService(event: SearchEvent): Promise<void> {
    // In a real implementation, this would send the event to an analytics service
    try {
      // await fetch('/api/analytics/search', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
      console.log('Analytics event:', event);
    } catch (error) {
      console.warn('Failed to send analytics event:', error);
    }
  }

  // Method to export analytics data
  exportAnalyticsData(timeRange: 'day' | 'week' | 'month' = 'week'): {
    events: SearchEvent[];
    metrics: SearchMetrics;
    insights: SearchInsights;
  } {
    const cutoffTime = this.getCutoffTime(timeRange);
    const relevantEvents = this.events.filter(event => event.timestamp >= cutoffTime);

    return {
      events: relevantEvents,
      metrics: this.getSearchMetrics(timeRange),
      insights: this.getSearchInsights(timeRange)
    };
  }

  // Method to clear old analytics data
  clearOldData(olderThan: Date): void {
    this.events = this.events.filter(event => event.timestamp >= olderThan);
    this.saveEvents();
  }
}

export const searchAnalyticsService = new SearchAnalyticsService();
export type { SearchEvent, SearchMetrics, SearchInsights };