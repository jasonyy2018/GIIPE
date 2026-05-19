import {
  ContentRecommendation,
  UserPreferences,
  SavedItem
} from '@/types/savedContent';
import { Event } from '@/types/public';

interface RecommendationAlgorithm {
  name: string;
  weight: number;
  calculate: (content: any, userProfile: UserProfile) => number;
}

interface UserProfile {
  preferences: UserPreferences;
  savedContent: SavedItem[];
  recentActivity: any[];
  demographics?: {
    industry?: string;
    experience?: 'junior' | 'mid' | 'senior';
    interests?: string[];
  };
}

interface ABTestVariant {
  id: string;
  name: string;
  algorithms: RecommendationAlgorithm[];
  trafficPercentage: number;
  isActive: boolean;
}

class ContentRecommendationService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes
  private abTestVariants: ABTestVariant[] = [];
  private userVariantAssignments = new Map<string, string>();

  constructor() {
    this.initializeABTestVariants();
  }

  private initializeABTestVariants(): void {
    this.abTestVariants = [
      {
        id: 'control',
        name: 'Control - Basic Recommendations',
        algorithms: [
          {
            name: 'content_similarity',
            weight: 0.4,
            calculate: this.calculateContentSimilarity.bind(this)
          },
          {
            name: 'user_preferences',
            weight: 0.3,
            calculate: this.calculateUserPreferenceMatch.bind(this)
          },
          {
            name: 'popularity',
            weight: 0.3,
            calculate: this.calculatePopularityScore.bind(this)
          }
        ],
        trafficPercentage: 50,
        isActive: true
      },
      {
        id: 'ml_enhanced',
        name: 'ML Enhanced Recommendations',
        algorithms: [
          {
            name: 'content_similarity',
            weight: 0.25,
            calculate: this.calculateContentSimilarity.bind(this)
          },
          {
            name: 'user_preferences',
            weight: 0.25,
            calculate: this.calculateUserPreferenceMatch.bind(this)
          },
          {
            name: 'collaborative_filtering',
            weight: 0.25,
            calculate: this.calculateCollaborativeFiltering.bind(this)
          },
          {
            name: 'behavioral_patterns',
            weight: 0.25,
            calculate: this.calculateBehavioralPatterns.bind(this)
          }
        ],
        trafficPercentage: 50,
        isActive: true
      }
    ];
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

  private getUserABTestVariant(userId: string): ABTestVariant {
    // Check if user already has a variant assigned
    let variantId = this.userVariantAssignments.get(userId);
    
    if (!variantId) {
      // Assign user to a variant based on user ID hash
      const hash = this.hashUserId(userId);
      const activeVariants = this.abTestVariants.filter(v => v.isActive);
      
      let cumulativePercentage = 0;
      for (const variant of activeVariants) {
        cumulativePercentage += variant.trafficPercentage;
        if (hash <= cumulativePercentage) {
          variantId = variant.id;
          break;
        }
      }
      
      // Fallback to control if no variant assigned
      if (!variantId) {
        variantId = 'control';
      }
      
      this.userVariantAssignments.set(userId, variantId);
    }
    
    return this.abTestVariants.find(v => v.id === variantId) || this.abTestVariants[0];
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }

  async getRecommendations(userId: string, limit: number = 10): Promise<ContentRecommendation[]> {
    const cacheKey = `recommendations-${userId}-${limit}`;
    const cached = this.getCachedData<ContentRecommendation[]>(cacheKey);
    if (cached) return cached;

    try {
      // Get user profile and preferences
      const userProfile = await this.getUserProfile(userId);
      
      // Get A/B test variant for this user
      const variant = this.getUserABTestVariant(userId);
      
      // Get available content
      const availableContent = await this.getAvailableContent(userId);
      
      // Calculate recommendations using the assigned variant's algorithms
      const recommendations = this.calculateRecommendations(
        availableContent,
        userProfile,
        variant.algorithms,
        limit
      );
      
      // Track recommendation generation for A/B testing
      this.trackRecommendationGeneration(userId, variant.id, recommendations.length);
      
      this.setCachedData(cacheKey, recommendations);
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    // In real app, this would fetch from multiple services
    const mockPreferences: UserPreferences = {
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

    const mockSavedContent: SavedItem[] = [
      {
        id: '1',
        type: 'article',
        title: 'AI Patents',
        description: 'Article about AI patents',
        savedAt: new Date(),
        category: 'Technology',
        url: '/article/1',
        tags: ['AI', 'Patents'],
        contentId: 'article-1',
        userId
      }
    ];

    return {
      preferences: mockPreferences,
      savedContent: mockSavedContent,
      recentActivity: [],
      demographics: {
        industry: 'Technology',
        experience: 'senior',
        interests: ['AI', 'Patents', 'Innovation']
      }
    };
  }

  private async getAvailableContent(userId: string): Promise<any[]> {
    // Mock content - in real app, this would fetch from content APIs
    return [
      {
        id: 'event-1',
        type: 'event',
        title: 'AI Innovation Summit 2024',
        description: 'Leading conference on AI innovation and intellectual property.',
        tags: ['AI', 'Innovation', 'Conference'],
        category: 'Technology',
        publishedAt: new Date('2024-05-01'),
        author: 'Tech Conference Group',
        readTime: null,
        difficulty: 'intermediate',
        stats: { views: 1250, saves: 89, shares: 34, comments: 12 }
      },
      {
        id: 'article-1',
        type: 'article',
        title: 'Machine Learning Patent Landscape',
        description: 'Comprehensive analysis of machine learning patents and trends.',
        tags: ['Machine Learning', 'Patents', 'Analysis'],
        category: 'Research',
        publishedAt: new Date('2024-05-10'),
        author: 'Dr. Sarah Chen',
        readTime: 15,
        difficulty: 'advanced',
        stats: { views: 2100, saves: 156, shares: 67, comments: 23 }
      },
      {
        id: 'news-1',
        type: 'news',
        title: 'New Patent Filing Regulations',
        description: 'Recent changes to patent filing procedures and requirements.',
        tags: ['Patents', 'Regulations', 'Legal'],
        category: 'Legal',
        publishedAt: new Date('2024-05-15'),
        author: 'Legal News Team',
        readTime: 8,
        difficulty: 'intermediate',
        stats: { views: 890, saves: 67, shares: 23, comments: 8 }
      },
      {
        id: 'article-2',
        type: 'article',
        title: 'Blockchain IP Protection Strategies',
        description: 'How blockchain technology can enhance intellectual property protection.',
        tags: ['Blockchain', 'IP Protection', 'Technology'],
        category: 'Technology',
        publishedAt: new Date('2024-05-12'),
        author: 'Michael Rodriguez',
        readTime: 12,
        difficulty: 'intermediate',
        stats: { views: 1450, saves: 98, shares: 45, comments: 15 }
      }
    ];
  }

  private calculateRecommendations(
    content: any[],
    userProfile: UserProfile,
    algorithms: RecommendationAlgorithm[],
    limit: number
  ): ContentRecommendation[] {
    const scoredContent = content.map(item => {
      let totalScore = 0;
      let algorithmScores: Record<string, number> = {};

      // Calculate score using each algorithm
      algorithms.forEach(algorithm => {
        const score = algorithm.calculate(item, userProfile);
        algorithmScores[algorithm.name] = score;
        totalScore += score * algorithm.weight;
      });

      return {
        ...item,
        score: Math.min(totalScore, 1), // Normalize to 0-1
        algorithmScores,
        reason: this.generateRecommendationReason(item, userProfile, algorithmScores)
      };
    });

    // Sort by score and take top recommendations
    const topRecommendations = scoredContent?.sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Convert to ContentRecommendation format
    return topRecommendations.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      url: `/${item.type}s/${item.id}`,
      score: item.score,
      reason: item.reason,
      tags: item.tags,
      metadata: {
        author: item.author,
        publishedAt: item.publishedAt,
        readTime: item.readTime
      }
    }));
  }

  private calculateContentSimilarity(content: any, userProfile: UserProfile): number {
    const userTags = new Set(
      userProfile.savedContent.flatMap(item => item.tags)
        .concat(userProfile.preferences.interests)
    );
    
    const contentTags = new Set(content.tags);
    const intersection = new Set([...userTags].filter(tag => contentTags.has(tag)));
    
    if (userTags.size === 0) return 0;
    return intersection.size / userTags.size;
  }

  private calculateUserPreferenceMatch(content: any, userProfile: UserProfile): number {
    let score = 0;
    let factors = 0;

    // Content type preference
    if (userProfile.preferences.contentTypes.includes(content.type)) {
      score += 0.3;
    }
    factors += 0.3;

    // Category preference
    if (userProfile.preferences.categories.includes(content.category)) {
      score += 0.3;
    }
    factors += 0.3;

    // Difficulty preference
    if (content.difficulty && userProfile.preferences.difficulty.includes(content.difficulty)) {
      score += 0.2;
    }
    factors += 0.2;

    // Reading time preference (for articles)
    if (content.readTime && content.type === 'article') {
      const { min, max } = userProfile.preferences.readingTime;
      if (content.readTime >= min && content.readTime <= max) {
        score += 0.2;
      }
    }
    factors += 0.2;

    return factors > 0 ? score / factors : 0;
  }

  private calculatePopularityScore(content: any, userProfile: UserProfile): number {
    const stats = content.stats || { views: 0, saves: 0, shares: 0, comments: 0 };
    
    // Normalize popularity metrics (assuming max values for normalization)
    const maxViews = 5000;
    const maxSaves = 500;
    const maxShares = 200;
    const maxComments = 100;
    
    const viewsScore = Math.min(stats.views / maxViews, 1);
    const savesScore = Math.min(stats.saves / maxSaves, 1);
    const sharesScore = Math.min(stats.shares / maxShares, 1);
    const commentsScore = Math.min(stats.comments / maxComments, 1);
    
    // Weighted average of popularity metrics
    return (viewsScore * 0.3 + savesScore * 0.4 + sharesScore * 0.2 + commentsScore * 0.1);
  }

  private calculateCollaborativeFiltering(content: any, userProfile: UserProfile): number {
    // Simplified collaborative filtering - in real app, this would use ML models
    // For now, return a mock score based on similar users' preferences
    const similarUserInterests = ['AI', 'Patents', 'Technology', 'Innovation'];
    const contentTags = new Set(content.tags);
    const matchingInterests = similarUserInterests.filter(interest => 
      contentTags.has(interest)
    );
    
    return matchingInterests.length / similarUserInterests.length;
  }

  private calculateBehavioralPatterns(content: any, userProfile: UserProfile): number {
    // Simplified behavioral pattern analysis
    // In real app, this would analyze user behavior patterns
    
    // Mock: prefer content published recently
    const daysSincePublished = Math.floor(
      (Date.now() - new Date(content.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const freshnessScore = Math.max(0, 1 - (daysSincePublished / 30)); // Prefer content from last 30 days
    
    // Mock: prefer content from authors user has engaged with
    const authorEngagementScore = userProfile.savedContent.some(
      item => item.metadata?.author === content.author
    ) ? 0.5 : 0;
    
    return (freshnessScore * 0.7 + authorEngagementScore * 0.3);
  }

  private generateRecommendationReason(
    content: any,
    userProfile: UserProfile,
    algorithmScores: Record<string, number>
  ): string {
    const reasons = [];
    
    // Find the highest scoring algorithm
    const topAlgorithm = Object.entries(algorithmScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topAlgorithm) {
      switch (topAlgorithm[0]) {
        case 'content_similarity':
          const commonTags = content.tags.filter((tag: string) =>
            userProfile.preferences.interests.includes(tag)
          );
          if (commonTags.length > 0) {
            reasons.push(`Matches your interests in ${commonTags.slice(0, 2).join(', ')}`);
          }
          break;
        case 'user_preferences':
          if (userProfile.preferences.contentTypes.includes(content.type)) {
            reasons.push(`${content.type} content you prefer`);
          }
          break;
        case 'popularity':
          if (content.stats?.saves > 50) {
            reasons.push('Popular with other users');
          }
          break;
        case 'collaborative_filtering':
          reasons.push('Recommended by users with similar interests');
          break;
        case 'behavioral_patterns':
          reasons.push('Based on your reading patterns');
          break;
      }
    }
    
    // Add category-based reason
    if (userProfile.preferences.categories.includes(content.category)) {
      reasons.push(`${content.category} category`);
    }
    
    return reasons.length > 0 ? reasons.join(' • ') : 'Recommended for you';
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    try {
      // In real app, this would update user preferences in the backend
      console.log('Updating user preferences:', { userId, preferences });
      
      // Clear recommendation cache for this user
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes(userId)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  async trackRecommendationInteraction(
    userId: string,
    recommendationId: string,
    action: 'view' | 'save' | 'share' | 'dismiss'
  ): Promise<void> {
    try {
      // In real app, this would track user interactions for ML model training
      console.log('Tracking recommendation interaction:', {
        userId,
        recommendationId,
        action,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error tracking recommendation interaction:', error);
    }
  }

  private trackRecommendationGeneration(
    userId: string,
    variantId: string,
    recommendationCount: number
  ): void {
    // Track A/B test metrics
    console.log('A/B Test - Recommendation Generation:', {
      userId,
      variantId,
      recommendationCount,
      timestamp: new Date()
    });
  }

  async getABTestResults(): Promise<any> {
    // In real app, this would return A/B test performance metrics
    return {
      variants: this.abTestVariants.map(variant => ({
        ...variant,
        metrics: {
          users: Math.floor(Math.random() * 1000),
          clickThroughRate: Math.random() * 0.1,
          conversionRate: Math.random() * 0.05,
          engagementScore: Math.random() * 100
        }
      }))
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const contentRecommendationService = new ContentRecommendationService();