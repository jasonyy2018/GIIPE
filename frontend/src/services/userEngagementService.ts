'use client';

import { dashboardAnalyticsService } from './dashboardAnalyticsService';
import { UserEngagementMetrics, AnalyticsFilter } from '@/types/analytics';

// User engagement measurement and analysis service
export interface EngagementScore {
  overall: number;
  categories: {
    frequency: number;
    duration: number;
    diversity: number;
    retention: number;
    interaction: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  recommendations: string[];
}

export interface EngagementBenchmark {
  metric: keyof UserEngagementMetrics['metrics'];
  value: number;
  percentile: number;
  category: 'excellent' | 'good' | 'average' | 'below-average' | 'poor';
  benchmark: number;
}

export interface EngagementAlert {
  id: string;
  userId: string;
  type: 'drop' | 'spike' | 'pattern-change' | 'milestone';
  severity: 'low' | 'medium' | 'high';
  message: string;
  data: Record<string, any>;
  timestamp: Date;
  actionRequired: boolean;
}

export interface EngagementCohort {
  id: string;
  name: string;
  criteria: {
    engagementScoreMin?: number;
    engagementScoreMax?: number;
    sessionCountMin?: number;
    sessionCountMax?: number;
    retentionRateMin?: number;
    retentionRateMax?: number;
    joinDateAfter?: Date;
    joinDateBefore?: Date;
  };
  users: string[];
  averageMetrics: UserEngagementMetrics['metrics'];
  trends: {
    growth: number;
    churn: number;
    activation: number;
  };
}

class UserEngagementService {
  private alertSubscribers: Set<(alert: EngagementAlert) => void> = new Set();
  private benchmarks: Record<string, number> = {
    totalSessions: 10,
    averageSessionDuration: 15, // minutes
    widgetInteractions: 50,
    featureUsage: 20,
    returnVisits: 3,
    bounceRate: 0.3,
    engagementScore: 60
  };

  // Calculate comprehensive engagement score
  calculateEngagementScore(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'weekly'): EngagementScore {
    const metrics = dashboardAnalyticsService.getUserEngagementMetrics(userId, period);
    const historicalMetrics = this.getHistoricalMetrics(userId, period, 3); // Last 3 periods
    
    const categories = {
      frequency: this.calculateFrequencyScore(metrics.metrics),
      duration: this.calculateDurationScore(metrics.metrics),
      diversity: this.calculateDiversityScore(metrics.metrics),
      retention: this.calculateRetentionScore(metrics.metrics),
      interaction: this.calculateInteractionScore(metrics.metrics)
    };

    const overall = Object.values(categories).reduce((sum, score) => sum + score, 0) / Object.keys(categories).length;
    const trend = this.calculateTrend(historicalMetrics);
    const recommendations = this.generateRecommendations(categories, metrics.metrics);

    return {
      overall,
      categories,
      trend,
      recommendations
    };
  }

  // Compare user metrics against benchmarks
  benchmarkUserEngagement(userId: string, period: 'daily' | 'weekly' | 'monthly' = 'weekly'): EngagementBenchmark[] {
    const metrics = dashboardAnalyticsService.getUserEngagementMetrics(userId, period);
    const allUsers = this.getAllUserMetrics(period);
    
    return Object.entries(metrics.metrics).map(([metric, value]) => {
      const benchmark = this.benchmarks[metric] || 0;
      const percentile = this.calculatePercentile(value, allUsers.map(u => u.metrics[metric as keyof typeof u.metrics] as number));
      const category = this.categorizePerformance(percentile);
      
      return {
        metric: metric as keyof UserEngagementMetrics['metrics'],
        value: typeof value === 'number' ? value : 0,
        percentile,
        category,
        benchmark
      };
    });
  }

  // Detect engagement patterns and anomalies
  detectEngagementAnomalies(userId: string): EngagementAlert[] {
    const alerts: EngagementAlert[] = [];
    const currentMetrics = dashboardAnalyticsService.getUserEngagementMetrics(userId, 'weekly');
    const previousMetrics = this.getPreviousMetrics(userId, 'weekly');
    
    if (!previousMetrics) return alerts;

    // Engagement drop detection
    const engagementDrop = (previousMetrics.metrics.engagementScore - currentMetrics.metrics.engagementScore) / previousMetrics.metrics.engagementScore;
    if (engagementDrop > 0.3) {
      alerts.push({
        id: `engagement-drop-${userId}-${Date.now()}`,
        userId,
        type: 'drop',
        severity: engagementDrop > 0.5 ? 'high' : 'medium',
        message: `Engagement score dropped by ${(engagementDrop * 100).toFixed(1)}% this week`,
        data: {
          currentScore: currentMetrics.metrics.engagementScore,
          previousScore: previousMetrics.metrics.engagementScore,
          dropPercentage: engagementDrop
        },
        timestamp: new Date(),
        actionRequired: engagementDrop > 0.4
      });
    }

    // Session frequency drop
    const sessionDrop = (previousMetrics.metrics.totalSessions - currentMetrics.metrics.totalSessions) / previousMetrics.metrics.totalSessions;
    if (sessionDrop > 0.5) {
      alerts.push({
        id: `session-drop-${userId}-${Date.now()}`,
        userId,
        type: 'drop',
        severity: 'medium',
        message: `Session frequency dropped by ${(sessionDrop * 100).toFixed(1)}%`,
        data: {
          currentSessions: currentMetrics.metrics.totalSessions,
          previousSessions: previousMetrics.metrics.totalSessions
        },
        timestamp: new Date(),
        actionRequired: true
      });
    }

    // Bounce rate spike
    const bounceRateIncrease = currentMetrics.metrics.bounceRate - previousMetrics.metrics.bounceRate;
    if (bounceRateIncrease > 0.2) {
      alerts.push({
        id: `bounce-spike-${userId}-${Date.now()}`,
        userId,
        type: 'spike',
        severity: 'medium',
        message: `Bounce rate increased by ${(bounceRateIncrease * 100).toFixed(1)} percentage points`,
        data: {
          currentBounceRate: currentMetrics.metrics.bounceRate,
          previousBounceRate: previousMetrics.metrics.bounceRate
        },
        timestamp: new Date(),
        actionRequired: true
      });
    }

    // Milestone achievements
    if (currentMetrics.metrics.engagementScore >= 80 && previousMetrics.metrics.engagementScore < 80) {
      alerts.push({
        id: `milestone-high-engagement-${userId}-${Date.now()}`,
        userId,
        type: 'milestone',
        severity: 'low',
        message: 'Achieved high engagement score (80+)',
        data: {
          score: currentMetrics.metrics.engagementScore
        },
        timestamp: new Date(),
        actionRequired: false
      });
    }

    return alerts;
  }

  // Create and manage user cohorts
  createEngagementCohort(
    name: string,
    criteria: EngagementCohort['criteria']
  ): EngagementCohort {
    const allUsers = this.getAllUserMetrics('weekly');
    const matchingUsers = allUsers.filter(user => this.matchesCriteria(user, criteria));
    
    const averageMetrics = this.calculateAverageMetrics(matchingUsers);
    const trends = this.calculateCohortTrends(matchingUsers);
    
    const cohort: EngagementCohort = {
      id: `cohort-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      criteria,
      users: matchingUsers.map(u => u.userId),
      averageMetrics,
      trends
    };

    this.saveCohort(cohort);
    return cohort;
  }

  // Get engagement cohorts
  getEngagementCohorts(): EngagementCohort[] {
    try {
      const stored = localStorage.getItem('engagementCohorts');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading engagement cohorts:', error);
      return [];
    }
  }

  // Analyze cohort performance
  analyzeCohortPerformance(cohortId: string): {
    cohort: EngagementCohort;
    performance: {
      retentionRate: number;
      growthRate: number;
      engagementTrend: number;
      churnRisk: number;
    };
    recommendations: string[];
  } | null {
    const cohorts = this.getEngagementCohorts();
    const cohort = cohorts.find(c => c.id === cohortId);
    
    if (!cohort) return null;

    const currentMetrics = cohort.users.map(userId => 
      dashboardAnalyticsService.getUserEngagementMetrics(userId, 'weekly')
    );

    const performance = {
      retentionRate: this.calculateCohortRetention(cohort.users),
      growthRate: cohort.trends.growth,
      engagementTrend: this.calculateCohortEngagementTrend(currentMetrics),
      churnRisk: this.calculateChurnRisk(currentMetrics)
    };

    const recommendations = this.generateCohortRecommendations(cohort, performance);

    return {
      cohort,
      performance,
      recommendations
    };
  }

  // Predict user churn risk
  predictChurnRisk(userId: string): {
    riskScore: number; // 0-1
    riskLevel: 'low' | 'medium' | 'high';
    factors: { factor: string; impact: number; description: string }[];
    recommendations: string[];
  } {
    const metrics = dashboardAnalyticsService.getUserEngagementMetrics(userId, 'weekly');
    const historicalMetrics = this.getHistoricalMetrics(userId, 'weekly', 4);
    
    const factors = [
      {
        factor: 'Session Frequency',
        impact: this.calculateSessionFrequencyRisk(metrics.metrics, historicalMetrics),
        description: 'Declining session frequency indicates reduced interest'
      },
      {
        factor: 'Engagement Score',
        impact: this.calculateEngagementRisk(metrics.metrics, historicalMetrics),
        description: 'Low or declining engagement score suggests user dissatisfaction'
      },
      {
        factor: 'Feature Usage',
        impact: this.calculateFeatureUsageRisk(metrics.metrics, historicalMetrics),
        description: 'Reduced feature exploration indicates decreased platform value'
      },
      {
        factor: 'Session Duration',
        impact: this.calculateDurationRisk(metrics.metrics, historicalMetrics),
        description: 'Shorter sessions may indicate reduced engagement'
      },
      {
        factor: 'Bounce Rate',
        impact: this.calculateBounceRateRisk(metrics.metrics),
        description: 'High bounce rate suggests poor user experience'
      }
    ];

    const riskScore = factors.reduce((sum, f) => sum + f.impact, 0) / factors.length;
    const riskLevel = riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low';
    const recommendations = this.generateChurnPreventionRecommendations(riskScore, factors);

    return {
      riskScore,
      riskLevel,
      factors,
      recommendations
    };
  }

  // Generate engagement insights
  generateEngagementInsights(userId?: string): {
    summary: string;
    keyMetrics: { metric: string; value: number; trend: string }[];
    insights: { type: string; message: string; actionable: boolean }[];
    recommendations: string[];
  } {
    const report = dashboardAnalyticsService.generateUsageReport('weekly', undefined, undefined, userId);
    
    const keyMetrics = [
      {
        metric: 'Average Engagement Score',
        value: report.summary.averageEngagementScore,
        trend: this.calculateMetricTrend('engagementScore', userId)
      },
      {
        metric: 'Total Sessions',
        value: report.summary.totalSessions,
        trend: this.calculateMetricTrend('totalSessions', userId)
      },
      {
        metric: 'Retention Rate',
        value: report.summary.retentionRate * 100,
        trend: this.calculateMetricTrend('retentionRate', userId)
      }
    ];

    const insights = [
      {
        type: 'engagement',
        message: this.generateEngagementInsight(report.summary.averageEngagementScore),
        actionable: report.summary.averageEngagementScore < 60
      },
      {
        type: 'usage',
        message: this.generateUsageInsight(report.summary.mostUsedWidgets),
        actionable: false
      },
      {
        type: 'retention',
        message: this.generateRetentionInsight(report.summary.retentionRate),
        actionable: report.summary.retentionRate < 0.7
      }
    ];

    const recommendations = this.generateGeneralRecommendations(report);

    return {
      summary: this.generateSummary(report),
      keyMetrics,
      insights,
      recommendations
    };
  }

  // Subscribe to engagement alerts
  subscribeToAlerts(callback: (alert: EngagementAlert) => void): () => void {
    this.alertSubscribers.add(callback);
    return () => this.alertSubscribers.delete(callback);
  }

  // Private helper methods
  private calculateFrequencyScore(metrics: UserEngagementMetrics['metrics']): number {
    const benchmark = this.benchmarks.totalSessions;
    return Math.min((metrics.totalSessions / benchmark) * 100, 100);
  }

  private calculateDurationScore(metrics: UserEngagementMetrics['metrics']): number {
    const benchmark = this.benchmarks.averageSessionDuration;
    return Math.min((metrics.averageSessionDuration / benchmark) * 100, 100);
  }

  private calculateDiversityScore(metrics: UserEngagementMetrics['metrics']): number {
    const diversityFactor = (metrics.uniqueWidgetsUsed + metrics.uniqueFeaturesUsed) / 20; // Assuming 20 total features/widgets
    return Math.min(diversityFactor * 100, 100);
  }

  private calculateRetentionScore(metrics: UserEngagementMetrics['metrics']): number {
    return Math.max(0, (1 - metrics.bounceRate) * 100);
  }

  private calculateInteractionScore(metrics: UserEngagementMetrics['metrics']): number {
    const interactionRate = metrics.widgetInteractions / Math.max(1, metrics.totalSessions);
    return Math.min((interactionRate / 10) * 100, 100); // Assuming 10 interactions per session is excellent
  }

  private calculateTrend(historicalMetrics: UserEngagementMetrics[]): 'increasing' | 'decreasing' | 'stable' {
    if (historicalMetrics.length < 2) return 'stable';
    
    const recent = historicalMetrics[historicalMetrics.length - 1].metrics.engagementScore;
    const older = historicalMetrics[0].metrics.engagementScore;
    const change = (recent - older) / older;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private generateRecommendations(categories: EngagementScore['categories'], metrics: UserEngagementMetrics['metrics']): string[] {
    const recommendations: string[] = [];
    
    if (categories.frequency < 50) {
      recommendations.push('Increase platform usage frequency with personalized notifications');
    }
    
    if (categories.duration < 50) {
      recommendations.push('Improve session duration with more engaging content and features');
    }
    
    if (categories.diversity < 50) {
      recommendations.push('Explore more widgets and features to enhance your experience');
    }
    
    if (categories.retention < 50) {
      recommendations.push('Reduce bounce rate by improving initial user experience');
    }
    
    if (categories.interaction < 50) {
      recommendations.push('Increase interaction with dashboard widgets and features');
    }
    
    return recommendations;
  }

  private getHistoricalMetrics(userId: string, period: 'daily' | 'weekly' | 'monthly', count: number): UserEngagementMetrics[] {
    // This would be enhanced with actual historical data storage
    return [];
  }

  private getAllUserMetrics(period: 'daily' | 'weekly' | 'monthly'): UserEngagementMetrics[] {
    // This would be enhanced with actual user data retrieval
    return [];
  }

  private calculatePercentile(value: number, allValues: number[]): number {
    const sorted = allValues.sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return index >= 0 ? (index / sorted.length) * 100 : 100;
  }

  private categorizePerformance(percentile: number): 'excellent' | 'good' | 'average' | 'below-average' | 'poor' {
    if (percentile >= 90) return 'excellent';
    if (percentile >= 75) return 'good';
    if (percentile >= 50) return 'average';
    if (percentile >= 25) return 'below-average';
    return 'poor';
  }

  private getPreviousMetrics(userId: string, period: 'daily' | 'weekly' | 'monthly'): UserEngagementMetrics | null {
    // This would be enhanced with actual historical data retrieval
    return null;
  }

  private matchesCriteria(user: UserEngagementMetrics, criteria: EngagementCohort['criteria']): boolean {
    if (criteria.engagementScoreMin && user.metrics.engagementScore < criteria.engagementScoreMin) return false;
    if (criteria.engagementScoreMax && user.metrics.engagementScore > criteria.engagementScoreMax) return false;
    if (criteria.sessionCountMin && user.metrics.totalSessions < criteria.sessionCountMin) return false;
    if (criteria.sessionCountMax && user.metrics.totalSessions > criteria.sessionCountMax) return false;
    if (criteria.retentionRateMin && user.metrics.returnVisits < criteria.retentionRateMin) return false;
    if (criteria.retentionRateMax && user.metrics.returnVisits > criteria.retentionRateMax) return false;
    
    return true;
  }

  private calculateAverageMetrics(users: UserEngagementMetrics[]): UserEngagementMetrics['metrics'] {
    if (users.length === 0) {
      return {
        totalSessions: 0,
        totalDuration: 0,
        averageSessionDuration: 0,
        widgetInteractions: 0,
        featureUsage: 0,
        contentViews: 0,
        actionsPerformed: 0,
        uniqueWidgetsUsed: 0,
        uniqueFeaturesUsed: 0,
        returnVisits: 0,
        bounceRate: 0,
        engagementScore: 0
      };
    }

    const sums = users.reduce((acc, user) => {
      Object.keys(user.metrics).forEach(key => {
        const typedKey = key as keyof UserEngagementMetrics['metrics'];
        acc[typedKey] += user.metrics[typedKey] as number;
      });
      return acc;
    }, {
      totalSessions: 0,
      totalDuration: 0,
      averageSessionDuration: 0,
      widgetInteractions: 0,
      featureUsage: 0,
      contentViews: 0,
      actionsPerformed: 0,
      uniqueWidgetsUsed: 0,
      uniqueFeaturesUsed: 0,
      returnVisits: 0,
      bounceRate: 0,
      engagementScore: 0
    });

    Object.keys(sums).forEach(key => {
      const typedKey = key as keyof UserEngagementMetrics['metrics'];
      sums[typedKey] = sums[typedKey] / users.length;
    });

    return sums;
  }

  private calculateCohortTrends(users: UserEngagementMetrics[]): EngagementCohort['trends'] {
    // This would be enhanced with historical cohort data
    return {
      growth: 0.05,
      churn: 0.02,
      activation: 0.8
    };
  }

  private saveCohort(cohort: EngagementCohort): void {
    try {
      const existing = this.getEngagementCohorts();
      const updated = [...existing, cohort];
      localStorage.setItem('engagementCohorts', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving engagement cohort:', error);
    }
  }

  private calculateCohortRetention(userIds: string[]): number {
    // This would be enhanced with actual retention calculation
    return 0.75;
  }

  private calculateCohortEngagementTrend(metrics: UserEngagementMetrics[]): number {
    // This would be enhanced with trend calculation
    return 0.05;
  }

  private calculateChurnRisk(metrics: UserEngagementMetrics[]): number {
    const avgEngagement = metrics.reduce((sum, m) => sum + m.metrics.engagementScore, 0) / metrics.length;
    return Math.max(0, (60 - avgEngagement) / 60); // Risk increases as engagement drops below 60
  }

  private generateCohortRecommendations(cohort: EngagementCohort, performance: any): string[] {
    const recommendations: string[] = [];
    
    if (performance.retentionRate < 0.7) {
      recommendations.push('Implement targeted retention campaigns for this cohort');
    }
    
    if (performance.engagementTrend < 0) {
      recommendations.push('Focus on re-engagement strategies to reverse declining trend');
    }
    
    if (performance.churnRisk > 0.3) {
      recommendations.push('Prioritize churn prevention measures for high-risk users');
    }
    
    return recommendations;
  }

  private calculateSessionFrequencyRisk(current: UserEngagementMetrics['metrics'], historical: UserEngagementMetrics[]): number {
    if (historical.length === 0) return current.totalSessions < 5 ? 0.6 : 0.2;
    
    const avgHistorical = historical.reduce((sum, h) => sum + h.metrics.totalSessions, 0) / historical.length;
    const decline = (avgHistorical - current.totalSessions) / avgHistorical;
    
    return Math.max(0, Math.min(1, decline));
  }

  private calculateEngagementRisk(current: UserEngagementMetrics['metrics'], historical: UserEngagementMetrics[]): number {
    if (current.engagementScore < 30) return 0.8;
    if (current.engagementScore < 50) return 0.5;
    
    if (historical.length === 0) return 0.2;
    
    const avgHistorical = historical.reduce((sum, h) => sum + h.metrics.engagementScore, 0) / historical.length;
    const decline = (avgHistorical - current.engagementScore) / avgHistorical;
    
    return Math.max(0, Math.min(1, decline));
  }

  private calculateFeatureUsageRisk(current: UserEngagementMetrics['metrics'], historical: UserEngagementMetrics[]): number {
    const diversityScore = (current.uniqueWidgetsUsed + current.uniqueFeaturesUsed) / 20;
    return Math.max(0, 1 - diversityScore);
  }

  private calculateDurationRisk(current: UserEngagementMetrics['metrics'], historical: UserEngagementMetrics[]): number {
    if (current.averageSessionDuration < 5) return 0.7;
    if (current.averageSessionDuration < 10) return 0.4;
    return 0.1;
  }

  private calculateBounceRateRisk(current: UserEngagementMetrics['metrics']): number {
    return Math.min(1, current.bounceRate);
  }

  private generateChurnPreventionRecommendations(riskScore: number, factors: any[]): string[] {
    const recommendations: string[] = [];
    
    if (riskScore > 0.7) {
      recommendations.push('Immediate intervention required - contact user directly');
      recommendations.push('Offer personalized onboarding or support session');
    }
    
    if (riskScore > 0.4) {
      recommendations.push('Send targeted re-engagement campaign');
      recommendations.push('Provide feature tutorials and tips');
    }
    
    const highImpactFactors = factors.filter(f => f.impact > 0.6);
    highImpactFactors.forEach(factor => {
      switch (factor.factor) {
        case 'Session Frequency':
          recommendations.push('Send usage reminders and notifications');
          break;
        case 'Engagement Score':
          recommendations.push('Improve user experience and feature discoverability');
          break;
        case 'Feature Usage':
          recommendations.push('Provide guided feature tours and tutorials');
          break;
      }
    });
    
    return recommendations;
  }

  private calculateMetricTrend(metric: string, userId?: string): string {
    // This would be enhanced with actual trend calculation
    return 'stable';
  }

  private generateEngagementInsight(score: number): string {
    if (score >= 80) return 'Excellent engagement - users are highly active and satisfied';
    if (score >= 60) return 'Good engagement - users are moderately active';
    if (score >= 40) return 'Average engagement - room for improvement';
    return 'Low engagement - immediate attention needed';
  }

  private generateUsageInsight(mostUsedWidgets: any[]): string {
    if (mostUsedWidgets.length === 0) return 'No significant widget usage patterns detected';
    return `Most popular widget: ${mostUsedWidgets[0].widgetType} with ${mostUsedWidgets[0].usage} interactions`;
  }

  private generateRetentionInsight(retentionRate: number): string {
    if (retentionRate >= 0.8) return 'Excellent user retention';
    if (retentionRate >= 0.6) return 'Good user retention';
    if (retentionRate >= 0.4) return 'Average user retention - consider improvement strategies';
    return 'Poor user retention - urgent action needed';
  }

  private generateGeneralRecommendations(report: any): string[] {
    const recommendations: string[] = [];
    
    if (report.summary.averageEngagementScore < 60) {
      recommendations.push('Focus on improving overall user engagement');
    }
    
    if (report.summary.retentionRate < 0.7) {
      recommendations.push('Implement user retention strategies');
    }
    
    if (report.summary.totalSessions < 100) {
      recommendations.push('Increase user acquisition and activation');
    }
    
    return recommendations;
  }

  private generateSummary(report: any): string {
    return `Dashboard analytics show ${report.summary.totalUsers} active users with an average engagement score of ${report.summary.averageEngagementScore.toFixed(1)}. Retention rate is ${(report.summary.retentionRate * 100).toFixed(1)}%.`;
  }
}

export const userEngagementService = new UserEngagementService();