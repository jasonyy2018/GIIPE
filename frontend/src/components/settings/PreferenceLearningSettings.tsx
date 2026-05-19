'use client';

import React, { useState, useEffect } from 'react';
import { usePreferenceLearning } from '@/hooks/usePreferenceLearning';
import { preferenceLearningService, type LearningRule } from '@/services/preferenceLearningService';
import PreferenceValidationPanel from '@/components/dashboard/PreferenceValidationPanel';
import PreferenceFeedbackModal from '@/components/dashboard/PreferenceFeedbackModal';

interface PreferenceLearningSettingsProps {
  userId: string;
}

export default function PreferenceLearningSettings({ userId }: PreferenceLearningSettingsProps) {
  const {
    inference,
    learningSession,
    validationScore,
    feedbackHistory,
    getBehaviorAnalytics,
    getLearningRules,
    setLearningEnabled,
    toggleLearningRule,
    setConfidenceThreshold
  } = usePreferenceLearning({ userId, enableAutoTracking: false });

  const [learningRules, setLearningRules] = useState<LearningRule[]>([]);
  const [isLearningEnabled, setIsLearningEnabledState] = useState(true);
  const [confidenceThreshold, setConfidenceThresholdState] = useState(0.6);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [behaviorAnalytics, setBehaviorAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'validation' | 'analytics'>('overview');

  useEffect(() => {
    loadSettings();
    loadAnalytics();
  }, []);

  const loadSettings = () => {
    const rules = getLearningRules();
    setLearningRules(rules);
  };

  const loadAnalytics = () => {
    const analytics = getBehaviorAnalytics();
    setBehaviorAnalytics(analytics);
  };

  const handleLearningToggle = (enabled: boolean) => {
    setLearningEnabled(enabled);
    setIsLearningEnabledState(enabled);
  };

  const handleRuleToggle = (ruleId: string, enabled: boolean) => {
    toggleLearningRule(ruleId, enabled);
    setLearningRules(prev => 
      prev.map(rule => 
        rule.id === ruleId ? { ...rule, enabled } : rule
      )
    );
  };

  const handleConfidenceChange = (threshold: number) => {
    setConfidenceThreshold(threshold);
    setConfidenceThresholdState(threshold);
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      layout: '🎨',
      theme: '🌙',
      widgets: '📊',
      timing: '⏰',
      interaction: '👆'
    };
    return icons[category as keyof typeof icons] || '⚙️';
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Learning Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Learning System Status</h3>
          <div className="flex items-center">
            <span className="mr-3 text-sm text-gray-600">Enable Learning</span>
            <button
              onClick={() => handleLearningToggle(!isLearningEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isLearningEnabled ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isLearningEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {inference?.confidence ? formatConfidence(inference.confidence) : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Learning Confidence</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {validationScore ? formatConfidence(validationScore) : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Validation Score</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {learningSession?.rulesApplied.length || 0}
            </div>
            <div className="text-sm text-gray-600">Active Rules</div>
          </div>
        </div>
      </div>

      {/* Confidence Threshold */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Auto-Apply Threshold</h3>
        <p className="text-sm text-gray-600 mb-4">
          Changes with confidence above this threshold will be applied automatically.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 w-20">Conservative</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 w-20">Aggressive</span>
          </div>
          
          <div className="text-center">
            <span className="text-lg font-medium text-primary">
              {formatConfidence(confidenceThreshold)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {learningSession && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Learning Activity</h3>
          
          {learningSession.changesProposed.length > 0 ? (
            <div className="space-y-3">
              {learningSession.changesProposed.slice(0, 3).map((change, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{change.rule}</div>
                    <div className="text-sm text-gray-600">
                      Confidence: {formatConfidence(change.confidence)}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    change.applied 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {change.applied ? 'Applied' : 'Pending'}
                  </span>
                </div>
              ))}
              
              {learningSession.changesProposed.length > 3 && (
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="text-primary hover:text-blue-700 text-sm font-medium"
                >
                  View all {learningSession.changesProposed.length} changes
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-600">No recent learning activity.</p>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setShowValidationPanel(true)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="font-medium text-gray-900">Validate Preferences</div>
            <div className="text-sm text-gray-600">Help us learn your preferences better</div>
          </button>
          
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="font-medium text-gray-900">Provide Feedback</div>
            <div className="text-sm text-gray-600">Rate recent preference changes</div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderRulesTab = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-primary-dark">Learning Rules</h3>
            <p className="text-sm text-blue-700 mt-1">
              These rules analyze your behavior and suggest preference changes. You can enable or disable individual rules.
            </p>
          </div>
        </div>
      </div>

      {learningRules.map((rule) => (
        <div key={rule.id} className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">{getCategoryIcon(rule.category)}</span>
                <div>
                  <h3 className="font-medium text-gray-900">{rule.name}</h3>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {rule.category}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-2">Confidence:</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${rule.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatConfidence(rule.confidence)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="ml-4">
              <button
                onClick={() => handleRuleToggle(rule.id, !rule.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  rule.enabled ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rule.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderValidationTab = () => (
    <div>
      <PreferenceValidationPanel
        userId={userId}
        onValidationComplete={(score) => {
          console.log('Validation completed with score:', score);
        }}
      />
    </div>
  );

  const renderAnalyticsTab = () => {
    return (
      <div className="space-y-6">
        {behaviorAnalytics && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Behavior Summary</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {behaviorAnalytics.totalEvents}
                  </div>
                  <div className="text-sm text-gray-600">Total Events</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {behaviorAnalytics.uniqueSessions}
                  </div>
                  <div className="text-sm text-gray-600">Sessions</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(behaviorAnalytics.averageSessionDuration)}m
                  </div>
                  <div className="text-sm text-gray-600">Avg Session</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {behaviorAnalytics.mostActiveHours.length}
                  </div>
                  <div className="text-sm text-gray-600">Active Hours</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Interactions</h3>
              
              <div className="space-y-3">
                {behaviorAnalytics.topInteractions.slice(0, 5).map((interaction: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-900 capitalize">{interaction.type}</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ 
                            width: `${(interaction.count / behaviorAnalytics.topInteractions[0].count) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{interaction.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Content Engagement</h3>
              
              <div className="space-y-3">
                {behaviorAnalytics.contentEngagement.slice(0, 5).map((content: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-900 capitalize">{content.category}</span>
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ 
                            width: `${Math.min((content.score / 3) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{content.score.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Preference Learning Settings
        </h1>
        <p className="text-gray-600">
          Configure how the system learns and adapts to your preferences.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'rules', label: 'Learning Rules', icon: '⚙️' },
            { id: 'validation', label: 'Validation', icon: '✓' },
            { id: 'analytics', label: 'Analytics', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'rules' && renderRulesTab()}
      {activeTab === 'validation' && renderValidationTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}

      {/* Modals */}
      {showFeedbackModal && (
        <PreferenceFeedbackModal
          userId={userId}
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onFeedbackSubmitted={(feedback) => {
            console.log('Feedback submitted:', feedback);
          }}
        />
      )}
    </div>
  );
}