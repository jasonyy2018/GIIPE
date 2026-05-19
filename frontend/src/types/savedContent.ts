export interface SavedItem {
  id: string;
  type: 'event' | 'article' | 'news';
  title: string;
  description: string;
  image?: string;
  savedAt: Date;
  category: string;
  url: string;
  tags: string[];
  contentId: string; // ID of the original content (event, news, etc.)
  userId: string;
  metadata?: {
    author?: string;
    publishedAt?: Date;
    readTime?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface SavedContentFilters {
  type?: 'event' | 'article' | 'news' | 'all';
  category?: string;
  tags?: string[];
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'savedAt' | 'title' | 'type' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface SavedContentStats {
  total: number;
  byType: {
    event: number;
    article: number;
    news: number;
  };
  byCategory: Record<string, number>;
  recentlyAdded: number; // Count of items added in last 7 days
}

export interface BulkAction {
  type: 'delete' | 'categorize' | 'tag' | 'export';
  itemIds: string[];
  metadata?: {
    category?: string;
    tags?: string[];
    format?: 'json' | 'csv' | 'pdf';
  };
}

export interface ContentRecommendation {
  id: string;
  type: 'event' | 'article' | 'news';
  title: string;
  description: string;
  image?: string;
  url: string;
  score: number; // Recommendation confidence score (0-1)
  reason: string; // Why this is recommended
  tags: string[];
  metadata?: {
    author?: string;
    publishedAt?: Date;
    readTime?: number;
  };
}

export interface UserPreferences {
  interests: string[];
  contentTypes: ('event' | 'article' | 'news')[];
  categories: string[];
  difficulty: ('beginner' | 'intermediate' | 'advanced')[];
  readingTime: {
    min: number; // minutes
    max: number; // minutes
  };
  notificationSettings: {
    newRecommendations: boolean;
    weeklyDigest: boolean;
    trendingContent: boolean;
  };
}

export interface TrendingContent {
  id: string;
  type: 'event' | 'article' | 'news';
  title: string;
  description: string;
  image?: string;
  url: string;
  trendScore: number; // Trending score based on saves, views, etc.
  tags: string[];
  stats: {
    views: number;
    saves: number;
    shares: number;
    comments: number;
  };
}

export interface ContentQualityScore {
  contentId: string;
  score: number; // 0-100 quality score
  factors: {
    engagement: number; // User engagement metrics
    freshness: number; // How recent the content is
    relevance: number; // Relevance to user interests
    authority: number; // Author/source credibility
    completeness: number; // Content completeness
  };
  lastUpdated: Date;
}