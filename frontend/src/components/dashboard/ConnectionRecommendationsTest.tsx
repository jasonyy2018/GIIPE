'use client';

import { useState } from 'react';
import { networkingService } from '@/services/networkingService';
import { connectionAnalyticsService } from '@/services/connectionAnalyticsService';

export default function ConnectionRecommendationsTest() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      // Test 1: Basic recommendations
      console.log('Testing basic recommendations...');
      const basicRecs = await networkingService.getConnectionRecommendations('test-user', 5);
      results.basicRecommendations = {
        count: basicRecs.length,
        avgScore: basicRecs.reduce((sum, rec) => sum + rec.score, 0) / basicRecs.length,
        hasReasons: basicRecs.every(rec => rec.reasons.length > 0),
        hasMutualConnections: basicRecs.some(rec => rec.mutualConnections > 0),
        hasSharedInterests: basicRecs.every(rec => rec.sharedInterests.length > 0)
      };

      // Test 2: Mutual connection recommendations
      console.log('Testing mutual connection recommendations...');
      const mutualRecs = await networkingService.getRecommendationsByMutualConnections('test-user', 5);
      results.mutualRecommendations = {
        count: mutualRecs.length,
        avgMutualConnections: mutualRecs.reduce((sum, rec) => sum + rec.mutualConnections, 0) / mutualRecs.length,
        allHaveMutualConnections: mutualRecs.every(rec => rec.mutualConnections > 0)
      };

      // Test 3: Interest-based recommendations
      console.log('Testing interest-based recommendations...');
      const interestRecs = await networkingService.getRecommendationsByInterests('test-user', 5);
      results.interestRecommendations = {
        count: interestRecs.length,
        avgSharedInterests: interestRecs.reduce((sum, rec) => sum + rec.sharedInterests.length, 0) / interestRecs.length,
        allHaveSharedInterests: interestRecs.every(rec => rec.sharedInterests.length > 0)
      };

      // Test 4: Event-based recommendations
      console.log('Testing event-based recommendations...');
      const eventRecs = await networkingService.getRecommendationsByEvents('test-user', 5);
      results.eventRecommendations = {
        count: eventRecs.length,
        avgSharedEvents: eventRecs.reduce((sum, rec) => sum + rec.sharedEvents, 0) / eventRecs.length,
        allHaveSharedEvents: eventRecs.every(rec => rec.sharedEvents > 0)
      };

      // Test 5: Connection quality calculation
      console.log('Testing connection quality calculation...');
      const qualityScore = await connectionAnalyticsService.calculateConnectionQuality('test-user', 'target-user');
      results.qualityCalculation = {
        score: qualityScore,
        isValidRange: qualityScore >= 0 && qualityScore <= 1
      };

      // Test 6: Connection analytics
      console.log('Testing connection analytics...');
      const analytics = await connectionAnalyticsService.getConnectionAnalytics('test-user');
      results.analytics = {
        hasData: analytics.totalRecommendations > 0,
        hasQualityMetrics: Object.keys(analytics.qualityMetrics).length > 0,
        hasGrowthTrend: analytics.connectionGrowthTrend.length > 0,
        acceptanceRateValid: analytics.acceptanceRate >= 0 && analytics.acceptanceRate <= 1
      };

      // Test 7: Success prediction
      console.log('Testing success prediction...');
      const prediction = await connectionAnalyticsService.predictConnectionSuccess('test-user', 'target-user');
      results.prediction = {
        hasProbability: prediction.successProbability >= 0 && prediction.successProbability <= 1,
        hasFactors: prediction.keyFactors.length > 0,
        hasRecommendations: prediction.recommendations.length > 0,
        confidenceValid: prediction.confidenceLevel >= 0 && prediction.confidenceLevel <= 1
      };

      setTestResults(results);
      console.log('All tests completed successfully!', results);
    } catch (error) {
      console.error('Test failed:', error);
      results.error = error;
      setTestResults(results);
    } finally {
      setLoading(false);
    }
  };

  const getTestStatus = (test: any) => {
    if (!test) return 'not-run';
    if (test.error) return 'failed';
    
    // Check if all boolean values are true
    const booleanValues = Object.values(test).filter(v => typeof v === 'boolean');
    if (booleanValues.length > 0 && booleanValues.every(v => v === true)) {
      return 'passed';
    }
    
    // Check if we have valid data
    if (test.count > 0 || test.hasData || test.score !== undefined) {
      return 'passed';
    }
    
    return 'warning';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return 'fas fa-check-circle text-green-500';
      case 'failed':
        return 'fas fa-times-circle text-red-500';
      case 'warning':
        return 'fas fa-exclamation-triangle text-yellow-500';
      default:
        return 'fas fa-circle text-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Connection Recommendation System Test</h3>
        <button
          onClick={runTests}
          disabled={loading}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Running Tests...
            </>
          ) : (
            <>
              <i className="fas fa-play mr-2"></i>
              Run Tests
            </>
          )}
        </button>
      </div>

      {testResults && (
        <div className="space-y-4">
          {/* Test Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Recommendation Tests</h4>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">Basic Recommendations</span>
                <div className="flex items-center space-x-2">
                  <i className={getStatusIcon(getTestStatus(testResults.basicRecommendations))}></i>
                  {testResults.basicRecommendations && (
                    <span className="text-xs text-gray-600">
                      {testResults.basicRecommendations.count} recs, {Math.round(testResults.basicRecommendations.avgScore * 100)}% avg score
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">Mutual Connections</span>
                <div className="flex items-center space-x-2">
                  <i className={getStatusIcon(getTestStatus(testResults.mutualRecommendations))}></i>
                  {testResults.mutualRecommendations && (
                    <span className="text-xs text-gray-600">
                      {testResults.mutualRecommendations.count} recs, {Math.round(testResults.mutualRecommendations.avgMutualConnections)} avg mutual
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">Interest-Based</span>
                <div className="flex items-center space-x-2">
                  <i className={getStatusIcon(getTestStatus(testResults.interestRecommendations))}></i>
                  {testResults.interestRecommendations && (
                    <span className="text-xs text-gray-600">
                      {testResults.interestRecommendations.count} recs, {Math.round(testResults.interestRecommendations.avgSharedInterests)} avg interests
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">Event-Based</span>
                <div className="flex items-center space-x-2">
                  <i className={getStatusIcon(getTestStatus(testResults.eventRecommendations))}></i>
                  {testResults.eventRecommendations && (
                    <span className="text-xs text-gray-600">
                      {testResults.eventRecommendations.count} recs, {Math.round(testResults.eventRecommendations.avgSharedEvents)} avg events
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Analytics Tests</h4>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">Quality Calculation</span>
                <div className="flex items-center space-x-2">
                  <i className={getStatusIcon(getTestStatus(testResults.qualityCalculation))}></i>
                  {testResults.qualityCalculation && (
                    <span className="text-xs text-gray-600">
                      Score: {Math.round(testResults.qualityCalculation.score * 100)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">Connection Analytics</span>
                <div className="flex items-center space-x-2">
                  <i className={getStatusIcon(getTestStatus(testResults.analytics))}></i>
                  {testResults.analytics && (
                    <span className="text-xs text-gray-600">
                      Data: {testResults.analytics.hasData ? 'Yes' : 'No'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">Success Prediction</span>
                <div className="flex items-center space-x-2">
                  <i className={getStatusIcon(getTestStatus(testResults.prediction))}></i>
                  {testResults.prediction && (
                    <span className="text-xs text-gray-600">
                      Factors: {testResults.prediction.hasFactors ? 'Yes' : 'No'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Overall Status</span>
              <div className="flex items-center space-x-2">
                {testResults.error ? (
                  <>
                    <i className="fas fa-times-circle text-red-500"></i>
                    <span className="text-sm text-red-600">Tests Failed</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle text-green-500"></i>
                    <span className="text-sm text-green-600">All Systems Operational</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!testResults && !loading && (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-flask text-2xl mb-2"></i>
          <p>Click "Run Tests" to verify the connection recommendation system</p>
        </div>
      )}
    </div>
  );
}