'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { userBehaviorTrackingService, type UserBehaviorEvent, type PreferenceInference } from '@/services/userBehaviorTrackingService';
import { preferenceLearningService, type LearningSession, type PreferenceFeedback } from '@/services/preferenceLearningService';

interface UsePreferenceLearningOptions {
  userId: string;
  enableAutoTracking?: boolean;
  trackingContext?: string;
  learningEnabled?: boolean;
}

interface PreferenceLearningState {
  inference: PreferenceInference | null;
  learningSession: LearningSession | null;
  isLearning: boolean;
  hasNewSuggestions: boolean;
  validationScore: number | null;
  feedbackHistory: PreferenceFeedback[];
}

export function usePreferenceLearning({
  userId,
  enableAutoTracking = true,
  trackingContext = 'dashboard',
  learningEnabled = true
}: UsePreferenceLearningOptions) {
  const [state, setState] = useState<PreferenceLearningState>({
    inference: null,
    learningSession: null,
    isLearning: false,
    hasNewSuggestions: false,
    validationScore: null,
    feedbackHistory: []
  });

  const trackingRef = useRef<{
    startTime: number;
    interactions: number;
    lastActivity: number;
  }>({
    startTime: Date.now(),
    interactions: 0,
    lastActivity: Date.now()
  });

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadPreferenceData();
    }
  }, [userId]);

  // Set up behavior tracking
  useEffect(() => {
    if (!enableAutoTracking || !userId) return;

    const unsubscribe = userBehaviorTrackingService.subscribe((event: UserBehaviorEvent) => {
      if (event.userId === userId) {
        trackingRef.current.interactions++;
        trackingRef.current.lastActivity = Date.now();
        
        // Trigger learning after significant activity
        if (trackingRef.current.interactions % 20 === 0) {
          runLearningCycle();
        }
      }
    });

    return unsubscribe;
  }, [enableAutoTracking, userId]);

  // Periodic learning check
  useEffect(() => {
    if (!learningEnabled || !userId) return;

    const interval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - trackingRef.current.lastActivity;
      
      // Run learning if user has been inactive for 5 minutes but had recent activity
      if (timeSinceLastActivity > 5 * 60 * 1000 && trackingRef.current.interactions > 0) {
        runLearningCycle();
        trackingRef.current.interactions = 0; // Reset counter
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, [learningEnabled, userId]);

  const loadPreferenceData = useCallback(async () => {
    try {
      const inference = preferenceLearningService.getUserPreferenceInference(userId);
      const learningSession = preferenceLearningService.getLearningSession(userId);
      const feedbackHistory = preferenceLearningService.getFeedbackHistory(userId);
      
      setState(prev => ({
        ...prev,
        inference,
        learningSession,
        feedbackHistory,
        hasNewSuggestions: (learningSession?.changesProposed?.length || 0) > 0
      }));
    } catch (error) {
      console.error('Error loading preference data:', error);
    }
  }, [userId]);

  const runLearningCycle = useCallback(async () => {
    if (!learningEnabled || state.isLearning) return;

    setState(prev => ({ ...prev, isLearning: true }));

    try {
      const session = await preferenceLearningService.runUserLearning(userId);
      
      setState(prev => ({
        ...prev,
        learningSession: session,
        hasNewSuggestions: (session.changesProposed?.length || 0) > 0,
        isLearning: false
      }));
    } catch (error) {
      console.error('Error running learning cycle:', error);
      setState(prev => ({ ...prev, isLearning: false }));
    }
  }, [userId, learningEnabled, state.isLearning]);

  // Tracking functions
  const trackWidgetInteraction = useCallback((
    widgetId: string,
    action: 'view' | 'click' | 'resize' | 'move' | 'configure',
    metadata: Record<string, any> = {}
  ) => {
    if (!enableAutoTracking) return;
    
    userBehaviorTrackingService.trackWidgetInteraction(
      userId,
      widgetId,
      action,
      { ...metadata, context: trackingContext }
    );
  }, [userId, enableAutoTracking, trackingContext]);

  const trackContentEngagement = useCallback((
    contentId: string,
    contentType: string,
    engagementType: 'view' | 'click' | 'bookmark' | 'share',
    duration?: number
  ) => {
    if (!enableAutoTracking) return;
    
    userBehaviorTrackingService.trackContentEngagement(
      userId,
      contentId,
      contentType,
      engagementType,
      duration
    );
  }, [userId, enableAutoTracking]);

  const trackNavigation = useCallback((
    fromPath: string,
    toPath: string,
    method: 'click' | 'search' | 'direct' | 'back'
  ) => {
    if (!enableAutoTracking) return;
    
    userBehaviorTrackingService.trackNavigation(userId, fromPath, toPath, method);
  }, [userId, enableAutoTracking]);

  const trackSearch = useCallback((
    query: string,
    filters: Record<string, any>,
    resultsCount: number,
    selectedResult?: string
  ) => {
    if (!enableAutoTracking) return;
    
    userBehaviorTrackingService.trackSearch(userId, query, filters, resultsCount, selectedResult);
  }, [userId, enableAutoTracking]);

  const trackCustomEvent = useCallback((
    eventType: UserBehaviorEvent['eventType'],
    target: string,
    metadata: Record<string, any> = {},
    duration?: number
  ) => {
    if (!enableAutoTracking) return;
    
    userBehaviorTrackingService.trackEvent(
      userId,
      eventType,
      target,
      trackingContext,
      metadata,
      duration
    );
  }, [userId, enableAutoTracking, trackingContext]);

  // Feedback functions
  const submitFeedback = useCallback((
    changeId: string,
    feedback: 'helpful' | 'not_helpful' | 'annoying',
    comment?: string
  ) => {
    preferenceLearningService.submitFeedback(userId, changeId, feedback, comment);
    
    // Reload feedback history
    const updatedHistory = preferenceLearningService.getFeedbackHistory(userId);
    setState(prev => ({ ...prev, feedbackHistory: updatedHistory }));
  }, [userId]);

  const validatePreferences = useCallback((
    validationData: Array<{ category: string; preference: string; isCorrect: boolean }>
  ) => {
    const score = preferenceLearningService.validatePreferences(userId, validationData);
    setState(prev => ({ ...prev, validationScore: score }));
    return score;
  }, [userId]);

  // Preference management
  const refreshInference = useCallback(() => {
    const inference = preferenceLearningService.getUserPreferenceInference(userId);
    setState(prev => ({ ...prev, inference }));
  }, [userId]);

  const clearSuggestions = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      hasNewSuggestions: false,
      learningSession: null 
    }));
  }, []);

  // Analytics functions
  const getBehaviorAnalytics = useCallback(() => {
    return userBehaviorTrackingService.analyzeUserBehavior(userId);
  }, [userId]);

  const getPreferencePatterns = useCallback(() => {
    return userBehaviorTrackingService.getUserPreferencePatterns(userId);
  }, [userId]);

  const getLearningRules = useCallback(() => {
    return preferenceLearningService.getLearningRules();
  }, []);

  // Configuration functions
  const setLearningEnabled = useCallback((enabled: boolean) => {
    preferenceLearningService.setLearningEnabled(enabled);
  }, []);

  const toggleLearningRule = useCallback((ruleId: string, enabled: boolean) => {
    preferenceLearningService.toggleLearningRule(ruleId, enabled);
  }, []);

  const setConfidenceThreshold = useCallback((threshold: number) => {
    preferenceLearningService.setConfidenceThreshold(threshold);
  }, []);

  return {
    // State
    ...state,
    
    // Tracking functions
    trackWidgetInteraction,
    trackContentEngagement,
    trackNavigation,
    trackSearch,
    trackCustomEvent,
    
    // Learning functions
    runLearningCycle,
    refreshInference,
    clearSuggestions,
    
    // Feedback functions
    submitFeedback,
    validatePreferences,
    
    // Analytics functions
    getBehaviorAnalytics,
    getPreferencePatterns,
    getLearningRules,
    
    // Configuration functions
    setLearningEnabled,
    toggleLearningRule,
    setConfidenceThreshold,
    
    // Utility functions
    loadPreferenceData
  };
}