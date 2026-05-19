'use client';

// User behavior tracking and preference learning service
export interface UserBehaviorEvent {
  id: string;
  userId: string;
  eventType: 'click' | 'view' | 'scroll' | 'hover' | 'search' | 'bookmark' | 'share' | 'like' | 'comment';
  target: string; // Element ID or component name
  context: string; // Page or section where event occurred
  metadata: Record<string, any>; // Additional event data
  timestamp: Date;
  sessionId: string;
  duration?: number; // For events with duration (view, hover)
}

export interface UserPreferencePattern {
  userId: string;
  category: 'content' | 'layout' | 'interaction' | 'timing' | 'navigation';
  pattern: string;
  confidence: number; // 0-1 score
  frequency: number;
  lastSeen: Date;
  metadata: Record<string, any>;
}

export interface PreferenceInference {
  userId: string;
  inferredPreferences: {
    contentTypes: string[];
    interactionStyles: string[];
    layoutPreferences: string[];
    timingPatterns: string[];
    navigationPatterns: string[];
  };
  confidence: number;
  lastUpdated: Date;
  validationScore?: number;
}

export interface BehaviorAnalytics {
  totalEvents: number;
  uniqueSessions: number;
  averageSessionDuration: number;
  mostActiveHours: number[];
  topInteractions: { type: string; count: number }[];
  contentEngagement: { category: string; score: number }[];
  navigationPatterns: { path: string; frequency: number }[];
}

class UserBehaviorTrackingService {
  private storageKey = 'userBehaviorData';
  private sessionKey = 'behaviorSessionId';
  private currentSessionId: string;
  private eventQueue: UserBehaviorEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<(event: UserBehaviorEvent) => void> = new Set();

  constructor() {
    this.currentSessionId = this.getOrCreateSessionId();
    this.startEventFlushing();
    
    // Track page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flushEvents();
        }
      });
    }
  }

  // Generate or retrieve session ID
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    let sessionId = sessionStorage.getItem(this.sessionKey);
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(this.sessionKey, sessionId);
    }
    return sessionId;
  }

  // Track user behavior event
  trackEvent(
    userId: string,
    eventType: UserBehaviorEvent['eventType'],
    target: string,
    context: string,
    metadata: Record<string, any> = {},
    duration?: number
  ): void {
    const event: UserBehaviorEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      eventType,
      target,
      context,
      metadata,
      timestamp: new Date(),
      sessionId: this.currentSessionId,
      duration
    };

    this.eventQueue.push(event);
    this.notifySubscribers(event);

    // Flush immediately for critical events
    if (['bookmark', 'share', 'like'].includes(eventType)) {
      this.flushEvents();
    }
  }

  // Track widget interaction
  trackWidgetInteraction(
    userId: string,
    widgetId: string,
    action: 'view' | 'click' | 'resize' | 'move' | 'configure',
    metadata: Record<string, any> = {}
  ): void {
    this.trackEvent(userId, 'click', widgetId, 'dashboard', {
      action,
      widgetType: metadata.widgetType || 'unknown',
      ...metadata
    });
  }

  // Track content engagement
  trackContentEngagement(
    userId: string,
    contentId: string,
    contentType: string,
    engagementType: 'view' | 'click' | 'bookmark' | 'share',
    duration?: number
  ): void {
    this.trackEvent(userId, engagementType, contentId, 'content', {
      contentType,
      category: this.inferContentCategory(contentType)
    }, duration);
  }

  // Track navigation patterns
  trackNavigation(
    userId: string,
    fromPath: string,
    toPath: string,
    method: 'click' | 'search' | 'direct' | 'back'
  ): void {
    this.trackEvent(userId, 'click', 'navigation', 'app', {
      fromPath,
      toPath,
      method,
      navigationTime: Date.now()
    });
  }

  // Track search behavior
  trackSearch(
    userId: string,
    query: string,
    filters: Record<string, any>,
    resultsCount: number,
    selectedResult?: string
  ): void {
    this.trackEvent(userId, 'search', 'search-interface', 'search', {
      query,
      filters,
      resultsCount,
      selectedResult,
      queryLength: query.length,
      hasFilters: Object.keys(filters).length > 0
    });
  }

  // Get user behavior data
  getUserBehaviorData(userId: string): UserBehaviorEvent[] {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const stored = localStorage.getItem(`${this.storageKey}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading user behavior data:', error);
      return [];
    }
  }

  // Analyze user behavior patterns
  analyzeUserBehavior(userId: string): BehaviorAnalytics {
    const events = this.getUserBehaviorData(userId);
    
    if (events.length === 0) {
      return this.getEmptyAnalytics();
    }

    const sessions = new Set(events.map(e => e.sessionId));
    const sessionDurations = this.calculateSessionDurations(events);
    const hourlyActivity = this.analyzeHourlyActivity(events);
    const interactionCounts = this.countInteractionTypes(events);
    const contentEngagement = this.analyzeContentEngagement(events);
    const navigationPatterns = this.analyzeNavigationPatterns(events);

    return {
      totalEvents: events.length,
      uniqueSessions: sessions.size,
      averageSessionDuration: sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length,
      mostActiveHours: hourlyActivity,
      topInteractions: interactionCounts,
      contentEngagement,
      navigationPatterns
    };
  }

  // Infer user preferences from behavior
  inferUserPreferences(userId: string): PreferenceInference {
    const events = this.getUserBehaviorData(userId);
    const analytics = this.analyzeUserBehavior(userId);
    
    const contentTypes = this.inferContentPreferences(events);
    const interactionStyles = this.inferInteractionPreferences(events);
    const layoutPreferences = this.inferLayoutPreferences(events);
    const timingPatterns = this.inferTimingPatterns(events);
    const navigationPatterns = this.inferNavigationPreferences(events);

    const confidence = this.calculateInferenceConfidence(events, analytics);

    return {
      userId,
      inferredPreferences: {
        contentTypes,
        interactionStyles,
        layoutPreferences,
        timingPatterns,
        navigationPatterns
      },
      confidence,
      lastUpdated: new Date()
    };
  }

  // Validate preference inference with user feedback
  validatePreferences(
    userId: string,
    inference: PreferenceInference,
    userFeedback: { category: string; preference: string; isCorrect: boolean }[]
  ): number {
    let correctPredictions = 0;
    let totalPredictions = 0;

    userFeedback.forEach(feedback => {
      const { category, preference, isCorrect } = feedback;
      const inferredPrefs = inference.inferredPreferences[category as keyof typeof inference.inferredPreferences];
      
      if (Array.isArray(inferredPrefs) && inferredPrefs.includes(preference)) {
        totalPredictions++;
        if (isCorrect) correctPredictions++;
      }
    });

    const validationScore = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
    
    // Store validation result
    this.storeValidationResult(userId, inference, validationScore);
    
    return validationScore;
  }

  // Get preference patterns for a user
  getUserPreferencePatterns(userId: string): UserPreferencePattern[] {
    try {
      const stored = localStorage.getItem(`userPreferencePatterns_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading preference patterns:', error);
      return [];
    }
  }

  // Update preference patterns based on new behavior
  updatePreferencePatterns(userId: string): void {
    const events = this.getUserBehaviorData(userId);
    const patterns = this.extractPatterns(events);
    
    try {
      localStorage.setItem(`userPreferencePatterns_${userId}`, JSON.stringify(patterns));
    } catch (error) {
      console.error('Error saving preference patterns:', error);
    }
  }

  // Private helper methods
  private startEventFlushing(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000); // Flush every 30 seconds
  }

  private flushEvents(): void {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    // Group events by user
    const eventsByUser = eventsToFlush.reduce((acc, event) => {
      if (!acc[event.userId]) acc[event.userId] = [];
      acc[event.userId].push(event);
      return acc;
    }, {} as Record<string, UserBehaviorEvent[]>);

    // Save events for each user
    Object.entries(eventsByUser).forEach(([userId, events]) => {
      this.saveUserEvents(userId, events);
    });
  }

  private saveUserEvents(userId: string, newEvents: UserBehaviorEvent[]): void {
    try {
      const existing = this.getUserBehaviorData(userId);
      const combined = [...existing, ...newEvents];
      
      // Keep only last 1000 events per user to manage storage
      const trimmed = combined.slice(-1000);
      
      localStorage.setItem(`${this.storageKey}_${userId}`, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error saving user events:', error);
    }
  }

  private inferContentCategory(contentType: string): string {
    const categoryMap: Record<string, string> = {
      'article': 'content',
      'event': 'events',
      'news': 'content',
      'user': 'social',
      'discussion': 'social',
      'announcement': 'content'
    };
    return categoryMap[contentType] || 'other';
  }

  private getEmptyAnalytics(): BehaviorAnalytics {
    return {
      totalEvents: 0,
      uniqueSessions: 0,
      averageSessionDuration: 0,
      mostActiveHours: [],
      topInteractions: [],
      contentEngagement: [],
      navigationPatterns: []
    };
  }

  private calculateSessionDurations(events: UserBehaviorEvent[]): number[] {
    const sessionGroups = events.reduce((acc, event) => {
      if (!acc[event.sessionId]) acc[event.sessionId] = [];
      acc[event.sessionId].push(event);
      return acc;
    }, {} as Record<string, UserBehaviorEvent[]>);

    return Object.values(sessionGroups).map(sessionEvents => {
      if (sessionEvents.length < 2) return 0;
      
      const sorted = sessionEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const start = sorted[0].timestamp.getTime();
      const end = sorted[sorted.length - 1].timestamp.getTime();
      
      return (end - start) / 1000 / 60; // Duration in minutes
    });
  }

  private analyzeHourlyActivity(events: UserBehaviorEvent[]): number[] {
    const hourCounts = new Array(24).fill(0);
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    });

    // Return top 3 most active hours
    return hourCounts?.map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);
  }

  private countInteractionTypes(events: UserBehaviorEvent[]): { type: string; count: number }[] {
    const counts = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  private analyzeContentEngagement(events: UserBehaviorEvent[]): { category: string; score: number }[] {
    const contentEvents = events.filter(e => e.context === 'content');
    const categoryScores = contentEvents.reduce((acc, event) => {
      const category = event.metadata.category || 'other';
      if (!acc[category]) acc[category] = { views: 0, interactions: 0 };
      
      if (event.eventType === 'view') acc[category].views++;
      else acc[category].interactions++;
      
      return acc;
    }, {} as Record<string, { views: number; interactions: number }>);

    return Object.entries(categoryScores)
      .map(([category, data]) => ({
        category,
        score: (data.interactions * 2 + data.views) / Math.max(1, data.views + data.interactions)
      }))
      .sort((a, b) => b.score - a.score);
  }

  private analyzeNavigationPatterns(events: UserBehaviorEvent[]): { path: string; frequency: number }[] {
    const navEvents = events.filter(e => e.target === 'navigation');
    const pathCounts = navEvents.reduce((acc, event) => {
      const path = `${event.metadata.fromPath} -> ${event.metadata.toPath}`;
      acc[path] = (acc[path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(pathCounts)
      .map(([path, frequency]) => ({ path, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  private inferContentPreferences(events: UserBehaviorEvent[]): string[] {
    const contentEngagement = this.analyzeContentEngagement(events);
    return contentEngagement?.filter(item => item.score > 1.5)
      .map(item => item.category)
      .slice(0, 5);
  }

  private inferInteractionPreferences(events: UserBehaviorEvent[]): string[] {
    const interactionCounts = this.countInteractionTypes(events);
    const totalEvents = events.length;
    
    return interactionCounts?.filter(item => item.count / totalEvents > 0.1)
      .map(item => item.type)
      .slice(0, 3);
  }

  private inferLayoutPreferences(events: UserBehaviorEvent[]): string[] {
    const widgetEvents = events.filter(e => e.context === 'dashboard');
    const widgetInteractions = widgetEvents.reduce((acc, event) => {
      const widgetType = event.metadata.widgetType || event.target;
      acc[widgetType] = (acc[widgetType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(widgetInteractions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([widget]) => widget);
  }

  private inferTimingPatterns(events: UserBehaviorEvent[]): string[] {
    const hourlyActivity = this.analyzeHourlyActivity(events);
    const patterns: string[] = [];

    if (hourlyActivity.some(hour => hour >= 6 && hour <= 11)) {
      patterns.push('morning-active');
    }
    if (hourlyActivity.some(hour => hour >= 12 && hour <= 17)) {
      patterns.push('afternoon-active');
    }
    if (hourlyActivity.some(hour => hour >= 18 && hour <= 23)) {
      patterns.push('evening-active');
    }

    return patterns;
  }

  private inferNavigationPreferences(events: UserBehaviorEvent[]): string[] {
    const navPatterns = this.analyzeNavigationPatterns(events);
    const preferences: string[] = [];

    // Analyze common navigation patterns
    const searchNavigation = navPatterns.filter(p => p.path.includes('search')).length;
    const directNavigation = navPatterns.filter(p => p.path.includes('direct')).length;
    
    if (searchNavigation > directNavigation) {
      preferences.push('search-driven');
    } else {
      preferences.push('direct-navigation');
    }

    return preferences;
  }

  private calculateInferenceConfidence(events: UserBehaviorEvent[], analytics: BehaviorAnalytics): number {
    const factors = [
      Math.min(events.length / 100, 1), // Event count factor
      Math.min(analytics.uniqueSessions / 10, 1), // Session count factor
      Math.min(analytics.averageSessionDuration / 30, 1), // Session duration factor
    ];

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  private extractPatterns(events: UserBehaviorEvent[]): UserPreferencePattern[] {
    const patterns: UserPreferencePattern[] = [];
    
    if (events.length === 0) return patterns;
    
    const userId = events[0].userId;
    
    // Extract content patterns
    const contentPatterns = this.extractContentPatterns(events, userId);
    const interactionPatterns = this.extractInteractionPatterns(events, userId);
    const timingPatterns = this.extractTimingPatterns(events, userId);
    
    return [...contentPatterns, ...interactionPatterns, ...timingPatterns];
  }

  private extractContentPatterns(events: UserBehaviorEvent[], userId: string): UserPreferencePattern[] {
    const contentEvents = events.filter(e => e.context === 'content');
    const categoryFrequency = contentEvents.reduce((acc, event) => {
      const category = event.metadata.category || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryFrequency)
      .filter(([, frequency]) => frequency >= 3)
      .map(([category, frequency]) => ({
        userId,
        category: 'content',
        pattern: `prefers-${category}`,
        confidence: Math.min(frequency / 10, 1),
        frequency,
        lastSeen: new Date(),
        metadata: { contentCategory: category }
      }));
  }

  private extractInteractionPatterns(events: UserBehaviorEvent[], userId: string): UserPreferencePattern[] {
    const interactionCounts = this.countInteractionTypes(events);
    
    return interactionCounts?.filter(item => item.count >= 5)
      .map(item => ({
        userId,
        category: 'interaction' as const,
        pattern: `frequent-${item.type}`,
        confidence: Math.min(item.count / 20, 1),
        frequency: item.count,
        lastSeen: new Date(),
        metadata: { interactionType: item.type }
      }));
  }

  private extractTimingPatterns(events: UserBehaviorEvent[], userId: string): UserPreferencePattern[] {
    const hourlyActivity = this.analyzeHourlyActivity(events);
    
    return hourlyActivity.map(hour => ({
      userId,
      category: 'timing' as const,
      pattern: `active-hour-${hour}`,
      confidence: 0.8,
      frequency: events.filter(e => new Date(e.timestamp).getHours() === hour).length,
      lastSeen: new Date(),
      metadata: { hour }
    }));
  }

  private storeValidationResult(
    userId: string,
    inference: PreferenceInference,
    validationScore: number
  ): void {
    try {
      const validationData = {
        ...inference,
        validationScore,
        validatedAt: new Date()
      };
      
      localStorage.setItem(
        `preferenceValidation_${userId}`,
        JSON.stringify(validationData)
      );
    } catch (error) {
      console.error('Error storing validation result:', error);
    }
  }

  // Subscribe to behavior events
  subscribe(callback: (event: UserBehaviorEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(event: UserBehaviorEvent): void {
    this.subscribers.forEach(callback => callback(event));
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushEvents();
  }
}

export const userBehaviorTrackingService = new UserBehaviorTrackingService();