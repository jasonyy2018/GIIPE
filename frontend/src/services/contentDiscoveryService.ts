import {
  TrendingContent,
  ContentQualityScore,
  UserPreferences
} from '@/types/savedContent';
import { Event } from '@/types/public';

interface ContentFeed {
  id: string;
  name: string;
  description: string;
  content: TrendingContent[];
  lastUpdated: Date;
  isPersonalized: boolean;
}

interface TrendingMetrics {
  timeWindow: '1h' | '6h' | '24h' | '7d' | '30d';
  metrics: {
    views: number;
    saves: number;
    shares: number;
    comments: number;
    engagementRate: number;
  };
  trend: 'rising' | 'stable' | 'declining';
  velocity: number; // Rate of change
}

interface CurationCriteria {
  minQualityScore: number;
  minEngagementRate: number;
  maxAge: number; // days
  categories: string[];
  contentTypes: ('event' | 'article' | 'news')[];
  excludeKeywords: string[];
}

class ContentDiscoveryService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 15 * 60 * 1000; // 15 minutes
  private trendingUpdateInterval = 60 * 60 * 1000; // 1 hour

  private readonly placeholderImages = [
    '/images/features/innovation.jpg',
    '/images/features/research.jpg',
    '/images/features/collaboration.jpg',
  ];

  private placeholder(i: number): string {
    return this.placeholderImages[i % this.placeholderImages.length];
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getTrendingContent(
    timeWindow: '1h' | '6h' | '24h' | '7d' | '30d' = '24h',
    limit: number = 10
  ): Promise<TrendingContent[]> {
    const cacheKey = `trending-${timeWindow}-${limit}`;
    const cached = this.getCachedData<TrendingContent[]>(cacheKey);
    if (cached) return cached;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Mock trending content data
      const mockContent = await this.getMockContent();
      
      // Calculate trending scores based on time window
      const trendingContent = mockContent.map(content => {
        const trendScore = this.calculateTrendingScore(content, timeWindow);
        return {
          ...content,
          trendScore
        };
      });

      // Sort by trend score and take top items
      const topTrending = trendingContent?.sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, limit);

      this.setCachedData(cacheKey, topTrending);
      return topTrending;
    } catch (error) {
      console.error('Error fetching trending content:', error);
      return [];
    }
  }

  async getPersonalizedFeed(userId: string, limit: number = 20): Promise<ContentFeed> {
    const cacheKey = `personalized-feed-${userId}-${limit}`;
    const cached = this.getCachedData<ContentFeed>(cacheKey);
    if (cached) return cached;

    try {
      // Get user preferences (in real app, this would come from user service)
      const userPreferences = await this.getUserPreferences(userId);
      
      // Get all available content
      const allContent = await this.getMockContent();
      
      // Apply personalization filters
      const personalizedContent = this.applyPersonalizationFilters(
        allContent,
        userPreferences
      );

      // Calculate quality scores
      const scoredContent = await Promise.all(
        personalizedContent.map(async content => {
          const qualityScore = await this.calculateContentQuality(content);
          return {
            ...content,
            qualityScore: qualityScore.score
          };
        })
      );

      // Sort by combined score (quality + personalization + trending)
      const rankedContent = scoredContent?.map(content => ({
          ...content,
          combinedScore: this.calculateCombinedScore(content, userPreferences)
        }))
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);

      const feed: ContentFeed = {
        id: `personalized-${userId}`,
        name: 'Your Personalized Feed',
        description: 'Content curated based on your interests and activity',
        content: rankedContent,
        lastUpdated: new Date(),
        isPersonalized: true
      };

      this.setCachedData(cacheKey, feed);
      return feed;
    } catch (error) {
      console.error('Error generating personalized feed:', error);
      throw error;
    }
  }

  async getCuratedFeeds(): Promise<ContentFeed[]> {
    const cacheKey = 'curated-feeds';
    const cached = this.getCachedData<ContentFeed[]>(cacheKey);
    if (cached) return cached;

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const allContent = await this.getMockContent();
      
      // Define curation criteria for different feeds
      const feedConfigs = [
        {
          id: 'trending-now',
          name: 'Trending Now',
          description: 'Most popular content in the last 24 hours',
          criteria: {
            minQualityScore: 70,
            minEngagementRate: 0.05,
            maxAge: 7,
            categories: [],
            contentTypes: ['event', 'article', 'news'] as ('event' | 'article' | 'news')[],
            excludeKeywords: []
          }
        },
        {
          id: 'ai-innovation',
          name: 'AI & Innovation',
          description: 'Latest developments in artificial intelligence and innovation',
          criteria: {
            minQualityScore: 75,
            minEngagementRate: 0.03,
            maxAge: 14,
            categories: ['Technology', 'Research'],
            contentTypes: ['article', 'news'] as ('event' | 'article' | 'news')[],
            excludeKeywords: []
          }
        },
        {
          id: 'patent-law',
          name: 'Patent Law Updates',
          description: 'Recent changes and insights in patent law',
          criteria: {
            minQualityScore: 80,
            minEngagementRate: 0.02,
            maxAge: 30,
            categories: ['Legal'],
            contentTypes: ['article', 'news'] as ('event' | 'article' | 'news')[],
            excludeKeywords: []
          }
        },
        {
          id: 'upcoming-events',
          name: 'Must-Attend Events',
          description: 'Carefully selected upcoming conferences and workshops',
          criteria: {
            minQualityScore: 70,
            minEngagementRate: 0.04,
            maxAge: 60,
            categories: ['Conference', 'Workshop'],
            contentTypes: ['event'] as ('event' | 'article' | 'news')[],
            excludeKeywords: []
          }
        }
      ];

      const feeds = await Promise.all(
        feedConfigs.map(async config => {
          const curatedContent = await this.curateContent(allContent, config.criteria);
          return {
            id: config.id,
            name: config.name,
            description: config.description,
            content: curatedContent.slice(0, 10), // Limit to 10 items per feed
            lastUpdated: new Date(),
            isPersonalized: false
          };
        })
      );

      this.setCachedData(cacheKey, feeds);
      return feeds;
    } catch (error) {
      console.error('Error generating curated feeds:', error);
      return [];
    }
  }

  private async getMockContent(): Promise<TrendingContent[]> {
    // Mock content data - in real app, this would come from content APIs
    return [
      {
        id: 'event-1',
        type: 'event',
        title: 'AI Innovation Summit 2024',
        description: 'Leading conference on AI innovation and intellectual property strategies.',
        image: this.placeholder(0),
        url: '/events/ai-innovation-summit-2024',
        trendScore: 0,
        tags: ['AI', 'Innovation', 'Conference', 'Technology'],
        stats: {
          views: 2450,
          saves: 189,
          shares: 67,
          comments: 23
        }
      },
      {
        id: 'article-1',
        type: 'article',
        title: 'The Future of Machine Learning Patents',
        description: 'Comprehensive analysis of ML patent trends and their implications for businesses.',
        image: this.placeholder(1),
        url: '/articles/ml-patents-future',
        trendScore: 0,
        tags: ['Machine Learning', 'Patents', 'Analysis', 'Business'],
        stats: {
          views: 3200,
          saves: 245,
          shares: 89,
          comments: 34
        }
      },
      {
        id: 'news-1',
        type: 'news',
        title: 'New EU Patent Regulations Take Effect',
        description: 'Major changes to European patent filing procedures and requirements.',
        image: this.placeholder(2),
        url: '/news/eu-patent-regulations-2024',
        trendScore: 0,
        tags: ['Patents', 'Regulations', 'Europe', 'Legal'],
        stats: {
          views: 1890,
          saves: 134,
          shares: 45,
          comments: 18
        }
      },
      {
        id: 'article-2',
        type: 'article',
        title: 'Blockchain IP Protection Strategies',
        description: 'How blockchain technology is revolutionizing intellectual property protection.',
        image: this.placeholder(0),
        url: '/articles/blockchain-ip-protection',
        trendScore: 0,
        tags: ['Blockchain', 'IP Protection', 'Technology', 'Innovation'],
        stats: {
          views: 1650,
          saves: 98,
          shares: 34,
          comments: 12
        }
      },
      {
        id: 'event-2',
        type: 'event',
        title: 'Patent Strategy Workshop',
        description: 'Hands-on workshop for developing effective patent strategies.',
        image: this.placeholder(1),
        url: '/events/patent-strategy-workshop',
        trendScore: 0,
        tags: ['Patents', 'Strategy', 'Workshop', 'Education'],
        stats: {
          views: 980,
          saves: 67,
          shares: 23,
          comments: 8
        }
      },
      {
        id: 'news-2',
        type: 'news',
        title: 'Global Innovation Index 2024 Results',
        description: 'Latest rankings and insights from the World Intellectual Property Organization.',
        image: this.placeholder(2),
        url: '/news/global-innovation-index-2024',
        trendScore: 0,
        tags: ['Innovation', 'Rankings', 'Global', 'Research'],
        stats: {
          views: 2100,
          saves: 156,
          shares: 78,
          comments: 29
        }
      }
    ];
  }

  private calculateTrendingScore(content: TrendingContent, timeWindow: string): number {
    const { views, saves, shares, comments } = content.stats;
    
    // Base engagement score
    const engagementScore = (saves * 3 + shares * 2 + comments * 1.5) / views;
    
    // Time decay factor based on window
    const timeDecayFactor = this.getTimeDecayFactor(timeWindow);
    
    // Content type multiplier
    const typeMultiplier = content.type === 'event' ? 1.2 : 1.0;
    
    // Tag relevance boost
    const trendingTags = ['AI', 'Innovation', 'Technology', 'Patents'];
    const tagBoost = content.tags.filter(tag => trendingTags.includes(tag)).length * 0.1;
    
    return Math.min(
      (engagementScore * timeDecayFactor * typeMultiplier + tagBoost) * 100,
      100
    );
  }

  private getTimeDecayFactor(timeWindow: string): number {
    // Simulate time-based decay - in real app, this would use actual timestamps
    switch (timeWindow) {
      case '1h': return 1.0;
      case '6h': return 0.9;
      case '24h': return 0.8;
      case '7d': return 0.6;
      case '30d': return 0.4;
      default: return 0.8;
    }
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    // Mock user preferences - in real app, this would come from user service
    return {
      interests: ['AI', 'Patents', 'Technology', 'Innovation'],
      contentTypes: ['article', 'event', 'news'],
      categories: ['Technology', 'Legal', 'Research'],
      difficulty: ['intermediate', 'advanced'],
      readingTime: { min: 5, max: 20 },
      notificationSettings: {
        newRecommendations: true,
        weeklyDigest: true,
        trendingContent: true
      }
    };
  }

  private applyPersonalizationFilters(
    content: TrendingContent[],
    preferences: UserPreferences
  ): TrendingContent[] {
    return content.filter(item => {
      // Filter by content type
      if (!preferences.contentTypes.includes(item.type)) {
        return false;
      }
      
      // Filter by interests (tag matching)
      const hasMatchingTags = item.tags.some(tag =>
        preferences.interests.some(interest =>
          tag.toLowerCase().includes(interest.toLowerCase())
        )
      );
      
      return hasMatchingTags;
    });
  }

  private async calculateContentQuality(content: TrendingContent): Promise<ContentQualityScore> {
    // Simulate quality calculation - in real app, this would use ML models
    const { views, saves, shares, comments } = content.stats;
    
    // Engagement factor (0-100)
    const engagementScore = Math.min((saves + shares + comments) / views * 100, 100);
    
    // Freshness factor (0-100) - assume all content is recent for mock
    const freshnessScore = 85;
    
    // Relevance factor (0-100) - based on tag popularity
    const popularTags = ['AI', 'Innovation', 'Technology', 'Patents'];
    const relevanceScore = Math.min(
      content.tags.filter(tag => popularTags.includes(tag)).length * 25,
      100
    );
    
    // Authority factor (0-100) - mock based on content type
    const authorityScore = content.type === 'article' ? 80 : 70;
    
    // Completeness factor (0-100) - mock based on description length
    const completenessScore = Math.min(content.description.length / 2, 100);
    
    const overallScore = Math.round(
      (engagementScore * 0.3 +
       freshnessScore * 0.2 +
       relevanceScore * 0.2 +
       authorityScore * 0.15 +
       completenessScore * 0.15)
    );

    return {
      contentId: content.id,
      score: overallScore,
      factors: {
        engagement: engagementScore,
        freshness: freshnessScore,
        relevance: relevanceScore,
        authority: authorityScore,
        completeness: completenessScore
      },
      lastUpdated: new Date()
    };
  }

  private calculateCombinedScore(
    content: TrendingContent & { qualityScore?: number },
    preferences: UserPreferences
  ): number {
    const qualityScore = content.qualityScore || 50;
    const trendingScore = content.trendScore;
    
    // Interest matching bonus
    const interestBonus = content.tags.filter(tag =>
      preferences.interests.some(interest =>
        tag.toLowerCase().includes(interest.toLowerCase())
      )
    ).length * 10;
    
    return qualityScore * 0.4 + trendingScore * 0.4 + interestBonus * 0.2;
  }

  private async curateContent(
    content: TrendingContent[],
    criteria: CurationCriteria
  ): Promise<TrendingContent[]> {
    // Calculate quality scores for all content
    const scoredContent = await Promise.all(
      content.map(async item => {
        const qualityScore = await this.calculateContentQuality(item);
        return { ...item, qualityScore: qualityScore.score };
      })
    );

    // Apply curation filters
    const curatedContent = scoredContent.filter(item => {
      // Quality threshold
      if (item.qualityScore < criteria.minQualityScore) {
        return false;
      }
      
      // Engagement rate threshold
      const engagementRate = (item.stats.saves + item.stats.shares + item.stats.comments) / item.stats.views;
      if (engagementRate < criteria.minEngagementRate) {
        return false;
      }
      
      // Content type filter
      if (criteria.contentTypes.length > 0 && !criteria.contentTypes.includes(item.type)) {
        return false;
      }
      
      // Category filter (mock - in real app, content would have category field)
      if (criteria.categories.length > 0) {
        const hasMatchingCategory = item.tags.some(tag =>
          criteria.categories.some(category =>
            tag.toLowerCase().includes(category.toLowerCase())
          )
        );
        if (!hasMatchingCategory) {
          return false;
        }
      }
      
      return true;
    });

    // Sort by quality score and trending score
    return curatedContent?.sort((a, b) => (b.qualityScore + b.trendScore) - (a.qualityScore + a.trendScore));
  }

  async getContentMetrics(contentId: string): Promise<TrendingMetrics | null> {
    try {
      // Mock metrics - in real app, this would fetch from analytics service
      return {
        timeWindow: '24h',
        metrics: {
          views: Math.floor(Math.random() * 5000),
          saves: Math.floor(Math.random() * 500),
          shares: Math.floor(Math.random() * 200),
          comments: Math.floor(Math.random() * 100),
          engagementRate: Math.random() * 0.1
        },
        trend: Math.random() > 0.5 ? 'rising' : 'stable',
        velocity: Math.random() * 2 - 1 // -1 to 1
      };
    } catch (error) {
      console.error('Error fetching content metrics:', error);
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const contentDiscoveryService = new ContentDiscoveryService();