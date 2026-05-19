'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { dashboardAnalyticsService } from '@/services/dashboardAnalyticsService';
import { FeatureUsageEvent } from '@/types/analytics';

interface UseFeatureAnalyticsProps {
  featureId: string;
  featureName: string;
  userId: string;
  enabled?: boolean;
}

interface FeatureAnalyticsHook {
  trackAccess: (entryPoint?: string, metadata?: Record<string, any>) => void;
  trackComplete: (completionData?: Record<string, any>) => void;
  trackAbandon: (reason?: string, progress?: number) => void;
  trackError: (error: string, context?: Record<string, any>) => void;
  trackStep: (stepName: string, stepNumber: number, totalSteps: number) => void;
  startFeatureSession: (entryPoint?: string) => void;
  endFeatureSession: (outcome: 'complete' | 'abandon', data?: Record<string, any>) => void;
}

export function useFeatureAnalytics({
  featureId,
  featureName,
  userId,
  enabled = true
}: UseFeatureAnalyticsProps): FeatureAnalyticsHook {
  const sessionStartTime = useRef<number | null>(null);
  const currentSteps = useRef<number>(0);
  const totalSteps = useRef<number>(0);
  const isSessionActive = useRef(false);

  // Track feature access
  const trackAccess = useCallback((entryPoint?: string, metadata: Record<string, any> = {}) => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackFeatureUsage(
      userId,
      featureId,
      featureName,
      'access',
      {
        entryPoint: entryPoint || 'direct',
        accessTimestamp: Date.now(),
        ...metadata
      }
    );
  }, [enabled, userId, featureId, featureName]);

  // Track feature completion
  const trackComplete = useCallback((completionData: Record<string, any> = {}) => {
    if (!enabled) return;
    
    const duration = sessionStartTime.current 
      ? (Date.now() - sessionStartTime.current) / 1000: undefined;

    dashboardAnalyticsService.trackFeatureUsage(
      userId,
      featureId,
      featureName,
      'complete',
      {
        completionTimestamp: Date.now(),
        stepsCompleted: currentSteps.current,
        totalSteps: totalSteps.current,
        completionRate: totalSteps.current > 0 ? currentSteps.current / totalSteps.current : 1,
        ...completionData
      },
      duration
    );
  }, [enabled, userId, featureId, featureName]);

  // Track feature abandonment
  const trackAbandon = useCallback((reason?: string, progress?: number) => {
    if (!enabled) return;
    
    const duration = sessionStartTime.current 
      ? (Date.now() - sessionStartTime.current) / 1000: undefined;

    const calculatedProgress = progress !== undefined 
      ? progress: totalSteps.current > 0 
        ? currentSteps.current / totalSteps.current: 0;

    dashboardAnalyticsService.trackFeatureUsage(
      userId,
      featureId,
      featureName,
      'abandon',
      {
        abandonReason: reason || 'unknown',
        abandonTimestamp: Date.now(),
        stepsCompleted: currentSteps.current,
        totalSteps: totalSteps.current,
        progress: calculatedProgress,
        exitPoint: `step-${currentSteps.current}`
      },
      duration
    );
  }, [enabled, userId, featureId, featureName]);

  // Track feature errors
  const trackError = useCallback((error: string, context: Record<string, any> = {}) => {
    if (!enabled) return;
    
    dashboardAnalyticsService.trackFeatureUsage(
      userId,
      featureId,
      featureName,
      'error',
      {
        errorType: error,
        errorTimestamp: Date.now(),
        errorContext: context,
        currentStep: currentSteps.current,
        totalSteps: totalSteps.current
      }
    );
  }, [enabled, userId, featureId, featureName]);

  // Track individual steps within a feature
  const trackStep = useCallback((stepName: string, stepNumber: number, totalStepsCount: number) => {
    if (!enabled) return;
    
    currentSteps.current = stepNumber;
    totalSteps.current = totalStepsCount;
    
    dashboardAnalyticsService.trackFeatureUsage(
      userId,
      featureId,
      featureName,
      'access', // Using access as the base action for step tracking
      {
        stepName,
        stepNumber,
        totalSteps: totalStepsCount,
        stepTimestamp: Date.now(),
        isStepTracking: true
      }
    );
  }, [enabled, userId, featureId, featureName]);

  // Start a feature usage session
  const startFeatureSession = useCallback((entryPoint?: string) => {
    if (!enabled || isSessionActive.current) return;
    
    sessionStartTime.current = Date.now();
    currentSteps.current = 0;
    totalSteps.current = 0;
    isSessionActive.current = true;
    
    trackAccess(entryPoint, {
      sessionStart: true,
      sessionId: `${featureId}-${Date.now()}`
    });
  }, [enabled, featureId, trackAccess]);

  // End a feature usage session
  const endFeatureSession = useCallback((
    outcome: 'complete' | 'abandon', 
    data: Record<string, any> = {}
  ) => {
    if (!enabled || !isSessionActive.current) return;
    
    if (outcome === 'complete') {
      trackComplete({
        sessionEnd: true,
        ...data
      });
    } else {
      trackAbandon(data.reason, data.progress);
    }
    
    sessionStartTime.current = null;
    currentSteps.current = 0;
    totalSteps.current = 0;
    isSessionActive.current = false;
  }, [enabled, trackComplete, trackAbandon]);

  // Auto-start session when component mounts
  useEffect(() => {
    if (enabled) {
      startFeatureSession('auto');
    }
    
    return () => {
      if (enabled && isSessionActive.current) {
        endFeatureSession('abandon', { reason: 'component-unmount' });
      }
    };
  }, [enabled, startFeatureSession, endFeatureSession]);

  // Handle page visibility changes
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isSessionActive.current) {
        endFeatureSession('abandon', { reason: 'page-hidden' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, endFeatureSession]);

  return {
    trackAccess,
    trackComplete,
    trackAbandon,
    trackError,
    trackStep,
    startFeatureSession,
    endFeatureSession
  };
}

// Higher-order component for automatic feature analytics
export function withFeatureAnalytics<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureId: string,
  featureName: string
) {
  return function AnalyticsWrappedFeature(props: P & { userId: string }) {
    const { userId, ...otherProps } = props;
    
    const analytics = useFeatureAnalytics({
      featureId,
      featureName,
      userId
    });

    // Add analytics methods to props
    const enhancedProps = {
      ...otherProps,
      featureAnalytics: analytics
    } as P;

    return React.createElement(WrappedComponent, enhancedProps);
  };
}

// Hook for tracking multi-step processes
export function useMultiStepFeatureAnalytics({
  featureId,
  featureName,
  userId,
  steps,
  enabled = true
}: UseFeatureAnalyticsProps & { steps: string[] }) {
  const analytics = useFeatureAnalytics({ featureId, featureName, userId, enabled });
  const currentStepIndex = useRef(0);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      currentStepIndex.current = stepIndex;
      analytics.trackStep(steps[stepIndex], stepIndex + 1, steps.length);
    }
  }, [analytics, steps]);

  const nextStep = useCallback(() => {
    const nextIndex = currentStepIndex.current + 1;
    if (nextIndex < steps.length) {
      goToStep(nextIndex);
      return true;
    }
    return false;
  }, [goToStep, steps.length]);

  const previousStep = useCallback(() => {
    const prevIndex = currentStepIndex.current - 1;
    if (prevIndex >= 0) {
      goToStep(prevIndex);
      return true;
    }
    return false;
  }, [goToStep]);

  const completeStep = useCallback(() => {
    const isLastStep = currentStepIndex.current === steps.length - 1;
    
    if (isLastStep) {
      analytics.endFeatureSession('complete', {
        allStepsCompleted: true,
        finalStep: steps[currentStepIndex.current]
      });
    } else {
      nextStep();
    }
    
    return isLastStep;
  }, [analytics, nextStep, steps]);

  const abandonAtCurrentStep = useCallback((reason?: string) => {
    analytics.endFeatureSession('abandon', {
      reason: reason || 'user-abandon',
      abandonedAtStep: steps[currentStepIndex.current],
      stepIndex: currentStepIndex.current
    });
  }, [analytics, steps]);

  return {
    ...analytics,
    currentStep: currentStepIndex.current,
    currentStepName: steps[currentStepIndex.current],
    totalSteps: steps.length,
    goToStep,
    nextStep,
    previousStep,
    completeStep,
    abandonAtCurrentStep,
    isFirstStep: currentStepIndex.current === 0,
    isLastStep: currentStepIndex.current === steps.length - 1
  };
}