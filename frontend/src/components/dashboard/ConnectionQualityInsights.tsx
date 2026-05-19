'use client';

import { useState, useEffect } from 'react';
import { connectionAnalyticsService } from '@/services/connectionAnalyticsService';

interface ConnectionQualityInsightsProps {
  userId: string;
  targetUserId?: string;
  showPrediction?: boolean;
  compact?: boolean;
}

interface ConnectionAnalytics {
  userId: string;
  totalRecommendations: number;
  acceptanceRate: number;
  averageConnectionQuality: number;
  topRecommendationSources: string[];
  connectionGrowthTrend: number[];
  qualityMetrics: {
    responseRate: number;
    engagementLevel: number;
    mutualConnectionStrength: number;
    interestAlignment: number;
    activityCompatibility: number;
    professionalRelevance: number;
  };
}

export default function ConnectionQualityInsights({
  userId,
  targetUserId,
  showPrediction = false,
  compact = false
}: ConnectionQualityInsightsProps) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ConnectionAnalytics | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
    if (showPrediction && targetUserId) {
      loadPrediction();
    }
  }, [userId, targetUserId, showPrediction]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await connectionAnalyticsService.getConnectionAnalytics(userId);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading connection analytics:', error);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadPrediction = async () => {
    if (!targetUserId) return;
    
    try {
      const predictionData = await connectionAnalyticsService.predictConnectionSuccess(userId, targetUserId);
      setPrediction(predictionData);
    } catch (error) {
      console.error('Error loading connection prediction:', error);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-primary bg-light';
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
  };

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-6">
        <div className="text-red-500 mb-2">
          <i className="fas fa-exclamation-triangle text-xl"></i>
        </div>
        <p className="text-gray-600 text-sm">{error || 'No analytics available'}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Connection Quality</h4>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getQualityColor(analytics.averageConnectionQuality)}`}>
            {getQualityLabel(analytics.averageConnectionQuality)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Acceptance Rate</span>
            <div className="font-medium">{formatPercentage(analytics.acceptanceRate)}</div>
          </div>
          <div>
            <span className="text-gray-600">Recommendations</span>
            <div className="font-medium">{analytics.totalRecommendations}</div>
          </div>
        </div>

        {prediction && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Success Probability</span>
              <span className={`text-sm font-medium ${
                prediction.successProbability > 0.7 ? 'text-green-600' : 
                prediction.successProbability > 0.5 ? 'text-primary' : 'text-yellow-600'
              }`}>
                {formatPercentage(prediction.successProbability)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Connection Quality Insights</h3>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getQualityColor(analytics.averageConnectionQuality)}`}>
          {getQualityLabel(analytics.averageConnectionQuality)} Quality
        </span>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="fas fa-chart-line text-blue-500 text-xl"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Acceptance Rate</p>
              <p className="text-lg font-bold text-blue-900">{formatPercentage(analytics.acceptanceRate)}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="fas fa-users text-green-500 text-xl"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Total Recommendations</p>
              <p className="text-lg font-bold text-green-900">{analytics.totalRecommendations}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="fas fa-star text-purple-500 text-xl"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900">Avg Quality Score</p>
              <p className="text-lg font-bold text-purple-900">{formatPercentage(analytics.averageConnectionQuality)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">Quality Breakdown</h4>
        <div className="space-y-3">
          {Object.entries(analytics.qualityMetrics).map(([metric, value]) => {
            const label = metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return (
              <div key={metric} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        value >= 0.8 ? 'bg-green-500' :
                        value >= 0.6 ? 'bg-blue-500' :
                        value >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${value * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {formatPercentage(value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Recommendation Sources */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Top Recommendation Sources</h4>
        <div className="flex flex-wrap gap-2">
          {analytics.topRecommendationSources.map((source, index) => (
            <span 
              key={source}
              className={`px-3 py-1 text-sm rounded-full ${
                index === 0 ? 'bg-primary text-white' :
                index === 1 ? 'bg-light text-primary-dark' :
                'bg-gray-100 text-gray-700'
              }`}
            >
              {source}
            </span>
          ))}
        </div>
      </div>

      {/* Connection Growth Trend */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Connection Growth (Last 6 Months)</h4>
        <div className="flex items-end space-x-2 h-20">
          {analytics.connectionGrowthTrend.map((value, index) => {
            const maxValue = Math.max(...analytics.connectionGrowthTrend);
            const height = (value / maxValue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-primary rounded-t"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-1">{value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connection Success Prediction */}
      {prediction && (
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Connection Success Prediction</h4>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Success Probability</span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${
                      prediction.successProbability > 0.7 ? 'bg-green-500' :
                      prediction.successProbability > 0.5 ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${prediction.successProbability * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatPercentage(prediction.successProbability)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Key Success Factors:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {prediction.keyFactors.map((factor: string, index: number) => (
                  <li key={index} className="flex items-center space-x-2">
                    <i className="fas fa-check-circle text-green-500 text-xs"></i>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Recommendations:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {prediction.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="flex items-start space-x-2">
                    <i className="fas fa-lightbulb text-yellow-500 text-xs mt-0.5"></i>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}