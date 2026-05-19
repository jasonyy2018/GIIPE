'use client';

import { userBehaviorTrackingService, type PreferenceInference, type UserBehaviorEvent } from './userBehaviorTrackingService';
import { dashboardCustomizationService } from './dashboardCustomizationService';
import type { DashboardPreferences, DashboardWidget } from '@/types/dashboard';

export interface LearningRule {
  id: string;
  name: string;
  description: string;
  condition: (events: UserBehaviorEvent[], preferences: DashboardPreferences) => boolean;
  action: (userId: string, events: UserBehaviorEvent[], preferences: DashboardPreferences) => Partial<DashboardPreferences>;
  confidence: number;
  category: 'layout' | 'theme' | 'widgets' | 'timing' | 'interaction';
  enabled: boolean;
}

export interface LearningSession {
  userId: string;
  startTime: Date;
  endTime?: Date;
  rulesApplied: string[];
  changesProposed: Array<{
    rule: string;
    change: Partial<DashboardPreferences>;
    confidence: number;
    applied: boolean;
    userFeedback?: 'accepted' | 'rejected' | 'modified';
  }>;
  userSatisfactionScore?: number;
}

export interface PreferenceFeedback {
  userId: string;
  changeId: string;
  feedback: 'helpful' | 'not_helpful' | 'annoying';
  comment?: string;
  timestamp: Date;
}

class PreferenceLearningService {
  private learningRules: LearningRule[] = [];
  private activeSessions: Map<string, LearningSession> = new Map();
  private feedbackHistory: PreferenceFeedback[] = [];
  private learningEnabled = true;
  private confidenceThreshold = 0.6;

  constructor() {
    this.initializeLearningRules();
    this.startPeriodicLearning();
  }

  // Initialize default learning rules
  private initializeLearningRules(): void {
    this.learningRules = [
      {
        id: 'frequent-widget-promotion',
        name: 'Promote Frequently Used Widgets',
        description: 'Move frequently interacted widgets to more prominent positions',
        condition: (events, preferences) => {
          const widgetInteractions = this.analyzeWidgetInteractions(events);
          const currentLayout = dashboardCustomizationService.getCurrentLayout(preferences.userId);
          
          return widgetInteractions.some(widget => 
            widget.interactionCount > 10 && 
            this.isWidgetInLowerPosition(widget.widgetId, currentLayout)
          );
        },
        action: (userId, events, preferences) => {
          const widgetInteractions = this.analyzeWidgetInteractions(events);
          const currentLayout = dashboardCustomizationService.getCurrentLayout(userId);
          const changes: Partial<DashboardPreferences> = {};
          
          // Find most interacted widget in lower position
          const topWidget = widgetInteractions?.filter(w => this.isWidgetInLowerPosition(w.widgetId, currentLayout))
            .sort((a, b) => b.interactionCount - a.interactionCount)[0];
          
          if (topWidget) {
            // Move to top-left position
            const updatedLayout = { ...currentLayout };
            const widget = updatedLayout.widgets.find(w => w.id === topWidget.widgetId);
            if (widget) {
              widget.position = { x: 0, y: 0, width: widget.position.width, height: widget.position.height };
            }
            changes.customLayouts = [updatedLayout];
          }
          
          return changes;
        },
        confidence: 0.8,
        category: 'layout',
        enabled: true
      },
      {
        id: 'unused-widget-hiding',
        name: 'Hide Unused Widgets',
        description: 'Suggest hiding widgets that haven\'t been interacted with recently',
        condition: (events, preferences) => {
          const recentEvents = events.filter(e => 
            Date.now() - new Date(e.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
          );
          const widgetInteractions = this.analyzeWidgetInteractions(recentEvents);
          const currentLayout = dashboardCustomizationService.getCurrentLayout(preferences.userId);
          
          return currentLayout.widgets.some(widget => 
            !widgetInteractions.find(w => w.widgetId === widget.id) && 
            !preferences.hiddenWidgets.includes(widget.id)
          );
        },
        action: (userId, events, preferences) => {
          const recentEvents = events.filter(e => 
            Date.now() - new Date(e.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
          );
          const widgetInteractions = this.analyzeWidgetInteractions(recentEvents);
          const currentLayout = dashboardCustomizationService.getCurrentLayout(userId);
          
          const unusedWidgets = currentLayout.widgets?.filter(widget => 
              !widgetInteractions.find(w => w.widgetId === widget.id) &&
              !preferences.hiddenWidgets.includes(widget.id)
            )
            .map(w => w.id);
          
          return {
            hiddenWidgets: [...preferences.hiddenWidgets, ...unusedWidgets.slice(0, 2)]
          };
        },
        confidence: 0.7,
        category: 'widgets',
        enabled: true
      },
      {
        id: 'theme-preference-learning',
        name: 'Learn Theme Preferences',
        description: 'Suggest theme changes based on usage patterns and time of day',
        condition: (events, preferences) => {
          const hourlyActivity = this.analyzeHourlyActivity(events);
          const currentHour = new Date().getHours();
          
          // Suggest dark theme for evening users
          return hourlyActivity.evening > hourlyActivity.morning && 
                 currentHour >= 18 && 
                 preferences.currentTheme !== 'dark';
        },
        action: (userId, events, preferences) => {
          return { currentTheme: 'dark' };
        },
        confidence: 0.6,
        category: 'theme',
        enabled: true
      },
      {
        id: 'refresh-interval-optimization',
        name: 'Optimize Refresh Interval',
        description: 'Adjust refresh interval based on user activity patterns',
        condition: (events, preferences) => {
          const sessionDurations = this.calculateAverageSessionDuration(events);
          const currentInterval = preferences.refreshInterval;
          
          // If user has long sessions, reduce refresh interval
          return sessionDurations > 30 && currentInterval > 180; // 30 min sessions, 3 min interval
        },
        action: (userId, events, preferences) => {
          const sessionDurations = this.calculateAverageSessionDuration(events);
          const optimalInterval = Math.max(120, Math.min(300, sessionDurations * 4)); // 2-5 minutes
          
          return { refreshInterval: optimalInterval };
        },
        confidence: 0.7,
        category: 'timing',
        enabled: true
      },
      {
        id: 'animation-preference-learning',
        name: 'Learn Animation Preferences',
        description: 'Disable animations for users who interact very quickly',
        condition: (events, preferences) => {
          const quickInteractions = events.filter(e => 
            e.eventType === 'click' && 
            e.duration && 
            e.duration < 100 // Very quick clicks
          ).length;
          
          return quickInteractions > 20 && preferences.enableAnimations;
        },
        action: (userId, events, preferences) => {
          return { enableAnimations: false };
        },
        confidence: 0.6,
        category: 'interaction',
        enabled: true
      },
      {
        id: 'compact-mode-suggestion',
        name: 'Suggest Compact Mode',
        description: 'Suggest compact mode for users who scroll frequently',
        condition: (events, preferences) => {
          const scrollEvents = events.filter(e => e.eventType === 'scroll').length;
          const totalEvents = events.length;
          
          return scrollEvents / totalEvents > 0.3 && !preferences.compactMode;
        },
        action: (userId, events, preferences) => {
          return { compactMode: true };
        },
        confidence: 0.65,
        category: 'layout',
        enabled: true
      }
    ];
  }

  // Start periodic learning process
  private startPeriodicLearning(): void {
    // Run learning every 30 minutes
    setInterval(() => {
      if (this.learningEnabled) {
        this.runLearningCycle();
      }
    }, 30 * 60 * 1000);
  }

  // Run learning cycle for all active users
  private async runLearningCycle(): Promise<void> {
    // In a real implementation, this would get active users from an API
    // For now, we'll check localStorage for users with behavior data
    const users = this.getActiveUsers();
    
    for (const userId of users) {
      await this.runUserLearning(userId);
    }
  }

  // Run learning for a specific user
  async runUserLearning(userId: string): Promise<LearningSession> {
    const session: LearningSession = {
      userId,
      startTime: new Date(),
      rulesApplied: [],
      changesProposed: []
    };

    try {
      const events = userBehaviorTrackingService.getUserBehaviorData(userId);
      const preferences = dashboardCustomizationService.getPreferences(userId);
      
      // Apply learning rules
      for (const rule of this.learningRules.filter(r => r.enabled)) {
        if (rule.condition(events, preferences)) {
          const proposedChanges = rule.action(userId, events, preferences);
          
          session.rulesApplied.push(rule.id);
          session.changesProposed.push({
            rule: rule.id,
            change: proposedChanges,
            confidence: rule.confidence,
            applied: false
          });

          // Auto-apply high-confidence changes
          if (rule.confidence >= this.confidenceThreshold) {
            await this.applyPreferenceChanges(userId, proposedChanges, rule.id);
            session.changesProposed[session.changesProposed.length - 1].applied = true;
          }
        }
      }

      session.endTime = new Date();
      this.activeSessions.set(userId, session);
      
      return session;
    } catch (error) {
      console.error('Error in user learning:', error);
      session.endTime = new Date();
      return session;
    }
  }

  // Apply preference changes
  private async applyPreferenceChanges(
    userId: string, 
    changes: Partial<DashboardPreferences>,
    ruleId: string
  ): Promise<void> {
    try {
      const currentPreferences = dashboardCustomizationService.getPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...changes };
      
      dashboardCustomizationService.savePreferences(updatedPreferences);
      
      // Track the change for feedback
      this.trackPreferenceChange(userId, ruleId, changes);
    } catch (error) {
      console.error('Error applying preference changes:', error);
    }
  }

  // Get user preference inference
  getUserPreferenceInference(userId: string): PreferenceInference {
    return userBehaviorTrackingService.inferUserPreferences(userId);
  }

  // Validate preferences with user feedback
  validatePreferences(
    userId: string,
    feedback: Array<{ category: string; preference: string; isCorrect: boolean }>
  ): number {
    const inference = this.getUserPreferenceInference(userId);
    return userBehaviorTrackingService.validatePreferences(userId, inference, feedback);
  }

  // Submit user feedback on preference changes
  submitFeedback(
    userId: string,
    changeId: string,
    feedback: 'helpful' | 'not_helpful' | 'annoying',
    comment?: string
  ): void {
    const feedbackEntry: PreferenceFeedback = {
      userId,
      changeId,
      feedback,
      comment,
      timestamp: new Date()
    };

    this.feedbackHistory.push(feedbackEntry);
    this.updateRuleConfidence(changeId, feedback);
    
    // Store feedback
    try {
      localStorage.setItem('preferenceFeedback', JSON.stringify(this.feedbackHistory));
    } catch (error) {
      console.error('Error storing feedback:', error);
    }
  }

  // Update rule confidence based on feedback
  private updateRuleConfidence(ruleId: string, feedback: string): void {
    const rule = this.learningRules.find(r => r.id === ruleId);
    if (!rule) return;

    const adjustment = feedback === 'helpful' ? 0.05 : 
                     feedback === 'not_helpful' ? -0.03 : 
                     -0.1; // annoying

    rule.confidence = Math.max(0.1, Math.min(1.0, rule.confidence + adjustment));
  }

  // Get learning session for user
  getLearningSession(userId: string): LearningSession | null {
    return this.activeSessions.get(userId) || null;
  }

  // Get all learning rules
  getLearningRules(): LearningRule[] {
    return [...this.learningRules];
  }

  // Enable/disable specific learning rule
  toggleLearningRule(ruleId: string, enabled: boolean): void {
    const rule = this.learningRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  // Set confidence threshold
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0.1, Math.min(1.0, threshold));
  }

  // Enable/disable learning system
  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  // Get feedback history
  getFeedbackHistory(userId?: string): PreferenceFeedback[] {
    return userId 
      ? this.feedbackHistory.filter(f => f.userId === userId)
      : [...this.feedbackHistory];
  }

  // Helper methods
  private getActiveUsers(): string[] {
    const users: string[] = [];
    
    // Check localStorage for users with behavior data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('userBehaviorData_')) {
        const userId = key.replace('userBehaviorData_', '');
        users.push(userId);
      }
    }
    
    return users;
  }

  private analyzeWidgetInteractions(events: UserBehaviorEvent[]): Array<{ widgetId: string; interactionCount: number }> {
    const widgetCounts = events?.filter(e => e.context === 'dashboard')
      .reduce((acc, event) => {
        const widgetId = event.target;
        acc[widgetId] = (acc[widgetId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(widgetCounts)
      .map(([widgetId, interactionCount]) => ({ widgetId, interactionCount }))
      .sort((a, b) => b.interactionCount - a.interactionCount);
  }

  private isWidgetInLowerPosition(widgetId: string, layout: any): boolean {
    const widget = layout.widgets.find((w: DashboardWidget) => w.id === widgetId);
    return widget ? widget.position.y > 2 : false; // Consider y > 2 as lower position
  }

  private analyzeHourlyActivity(events: UserBehaviorEvent[]): { morning: number; afternoon: number; evening: number } {
    const activity = { morning: 0, afternoon: 0, evening: 0 };
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (hour >= 6 && hour < 12) activity.morning++;
      else if (hour >= 12 && hour < 18) activity.afternoon++;
      else if (hour >= 18 && hour < 24) activity.evening++;
    });
    
    return activity;
  }

  private calculateAverageSessionDuration(events: UserBehaviorEvent[]): number {
    const sessionGroups = events.reduce((acc, event) => {
      if (!acc[event.sessionId]) acc[event.sessionId] = [];
      acc[event.sessionId].push(event);
      return acc;
    }, {} as Record<string, UserBehaviorEvent[]>);

    const durations = Object.values(sessionGroups).map(sessionEvents => {
      if (sessionEvents.length < 2) return 0;
      
      const sorted = sessionEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const start = sorted[0].timestamp.getTime();
      const end = sorted[sorted.length - 1].timestamp.getTime();
      
      return (end - start) / 1000 / 60; // Duration in minutes
    });

    return durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
  }

  private trackPreferenceChange(userId: string, ruleId: string, changes: Partial<DashboardPreferences>): void {
    const changeRecord = {
      userId,
      ruleId,
      changes,
      timestamp: new Date(),
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    try {
      const existing = JSON.parse(localStorage.getItem('preferenceChanges') || '[]');
      existing.push(changeRecord);
      localStorage.setItem('preferenceChanges', JSON.stringify(existing.slice(-100))); // Keep last 100
    } catch (error) {
      console.error('Error tracking preference change:', error);
    }
  }
}

export const preferenceLearningService = new PreferenceLearningService();