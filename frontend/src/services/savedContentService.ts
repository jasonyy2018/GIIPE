import {
  SavedItem,
  SavedContentFilters,
  SavedContentStats,
  BulkAction,
  ContentRecommendation,
  UserPreferences,
  TrendingContent,
  ContentQualityScore
} from '@/types/savedContent';

class SavedContentService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

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

  async getSavedContent(userId: string, filters: SavedContentFilters = {}): Promise<SavedItem[]> {
    const cacheKey = `saved-content-${userId}-${JSON.stringify(filters)}`;
    const cached = this.getCachedData<SavedItem[]>(cacheKey);
    if (cached) return cached;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock data - in real app, this would come from backend
      const mockSavedItems: SavedItem[] = [
        {
          id: '1',
          type: 'article',
          title: 'The Future of AI Patents',
          description: 'Exploring how artificial intelligence is reshaping patent law and intellectual property protection.',
          image: this.placeholder(0),
          savedAt: new Date('2024-05-20T10:30:00Z'),
          category: 'Technology',
          url: '/news/ai-patents-future',
          tags: ['AI', 'Patents', 'Technology', 'Innovation'],
          contentId: 'news-1',
          userId,
          metadata: {
            author: 'Dr. Sarah Chen',
            publishedAt: new Date('2024-05-15T08:00:00Z'),
            readTime: 8,
            difficulty: 'intermediate'
          }
        },
        {
          id: '2',
          type: 'event',
          title: 'IP Strategy Conference 2024',
          description: 'Annual conference bringing together IP professionals from around the world.',
          image: this.placeholder(1),
          savedAt: new Date('2024-05-19T15:45:00Z'),
          category: 'Conference',
          url: '/events/ip-strategy-2024',
          tags: ['Conference', 'IP Strategy', 'Networking'],
          contentId: 'event-1',
          userId,
          metadata: {
            publishedAt: new Date('2024-04-01T00:00:00Z')
          }
        },
        {
          id: '3',
          type: 'news',
          title: 'Patent Filing Trends in 2024',
          description: 'Analysis of current patent filing trends and their implications for businesses.',
          image: this.placeholder(2),
          savedAt: new Date('2024-05-18T09:20:00Z'),
          category: 'Analysis',
          url: '/news/patent-trends-2024',
          tags: ['Patents', 'Trends', 'Business', 'Analysis'],
          contentId: 'news-2',
          userId,
          metadata: {
            author: 'Michael Rodriguez',
            publishedAt: new Date('2024-05-10T12:00:00Z'),
            readTime: 12,
            difficulty: 'advanced'
          }
        },
        {
          id: '4',
          type: 'article',
          title: 'Trademark Protection Strategies',
          description: 'Best practices for protecting your brand through effective trademark strategies.',
          image: this.placeholder(0),
          savedAt: new Date('2024-05-17T14:10:00Z'),
          category: 'Legal',
          url: '/news/trademark-strategies',
          tags: ['Trademark', 'Branding', 'Legal', 'Protection'],
          contentId: 'news-3',
          userId,
          metadata: {
            author: 'Jennifer Liu',
            publishedAt: new Date('2024-05-12T14:30:00Z'),
            readTime: 6,
            difficulty: 'beginner'
          }
        },
        {
          id: '5',
          type: 'event',
          title: 'Blockchain & IP Workshop',
          description: 'Hands-on workshop exploring the intersection of blockchain technology and intellectual property.',
          image: this.placeholder(1),
          savedAt: new Date('2024-05-16T11:30:00Z'),
          category: 'Workshop',
          url: '/events/blockchain-ip-workshop',
          tags: ['Blockchain', 'Workshop', 'Technology', 'IP'],
          contentId: 'event-2',
          userId,
          metadata: {
            publishedAt: new Date('2024-04-15T00:00:00Z')
          }
        }
      ];

      // Apply filters
      let filteredItems = mockSavedItems;

      if (filters.type && filters.type !== 'all') {
        filteredItems = filteredItems.filter(item => item.type === filters.type);
      }

      if (filters.category) {
        filteredItems = filteredItems.filter(item => 
          item.category.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredItems = filteredItems.filter(item =>
          filters.tags!.some(tag => 
            item.tags.some(itemTag => 
              itemTag.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredItems = filteredItems.filter(item =>
          item.title.toLowerCase().includes(searchTerm) ||
          item.description.toLowerCase().includes(searchTerm) ||
          item.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      if (filters.dateRange) {
        filteredItems = filteredItems.filter(item => {
          const savedDate = new Date(item.savedAt);
          return savedDate >= filters.dateRange!.start && savedDate <= filters.dateRange!.end;
        });
      }

      // Apply sorting
      if (filters.sortBy) {
        filteredItems.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (filters.sortBy) {
            case 'savedAt':
              aValue = new Date(a.savedAt).getTime();
              bValue = new Date(b.savedAt).getTime();
              break;
            case 'title':
              aValue = a.title.toLowerCase();
              bValue = b.title.toLowerCase();
              break;
            case 'type':
              aValue = a.type;
              bValue = b.type;
              break;
            case 'category':
              aValue = a.category.toLowerCase();
              bValue = b.category.toLowerCase();
              break;
            default:
              return 0;
          }

          if (aValue < bValue) return filters.sortOrder === 'desc' ? 1 : -1;
          if (aValue > bValue) return filters.sortOrder === 'desc' ? -1 : 1;
          return 0;
        });
      }

      this.setCachedData(cacheKey, filteredItems);
      return filteredItems;
    } catch (error) {
      console.error('Error fetching saved content:', error);
      throw error;
    }
  }

  async getSavedContentStats(userId: string): Promise<SavedContentStats> {
    const cacheKey = `saved-content-stats-${userId}`;
    const cached = this.getCachedData<SavedContentStats>(cacheKey);
    if (cached) return cached;

    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const allItems = await this.getSavedContent(userId);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const stats: SavedContentStats = {
        total: allItems.length,
        byType: {
          event: allItems.filter(item => item.type === 'event').length,
          article: allItems.filter(item => item.type === 'article').length,
          news: allItems.filter(item => item.type === 'news').length
        },
        byCategory: {},
        recentlyAdded: allItems.filter(item => new Date(item.savedAt) > sevenDaysAgo).length
      };

      // Calculate category distribution
      allItems.forEach(item => {
        stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
      });

      this.setCachedData(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error fetching saved content stats:', error);
      throw error;
    }
  }

  async saveContent(userId: string, contentId: string, type: 'event' | 'article' | 'news'): Promise<SavedItem> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // In real app, this would create a new saved item in the backend
      const newItem: SavedItem = {
        id: `saved-${Date.now()}`,
        type,
        title: 'New Saved Item',
        description: 'Description of the saved content',
        savedAt: new Date(),
        category: 'General',
        url: `/${type}s/${contentId}`,
        tags: [],
        contentId,
        userId
      };

      // Clear cache to force refresh
      this.clearUserCache(userId);
      
      return newItem;
    } catch (error) {
      console.error('Error saving content:', error);
      throw error;
    }
  }

  async unsaveContent(userId: string, savedItemId: string): Promise<void> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Clear cache to force refresh
      this.clearUserCache(userId);
    } catch (error) {
      console.error('Error unsaving content:', error);
      throw error;
    }
  }

  async performBulkAction(userId: string, action: BulkAction): Promise<void> {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In real app, this would perform the bulk action on the backend
      console.log('Performing bulk action:', action);
      
      // Clear cache to force refresh
      this.clearUserCache(userId);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      throw error;
    }
  }

  async getAvailableCategories(userId: string): Promise<string[]> {
    const cacheKey = `categories-${userId}`;
    const cached = this.getCachedData<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const items = await this.getSavedContent(userId);
      const categories = Array.from(new Set(items.map(item => item.category))).sort();
      
      this.setCachedData(cacheKey, categories);
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async getAvailableTags(userId: string): Promise<string[]> {
    const cacheKey = `tags-${userId}`;
    const cached = this.getCachedData<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const items = await this.getSavedContent(userId);
      const allTags = items.flatMap(item => item.tags);
      const uniqueTags = Array.from(new Set(allTags)).sort();
      
      this.setCachedData(cacheKey, uniqueTags);
      return uniqueTags;
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  }

  private clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(userId)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const savedContentService = new SavedContentService();