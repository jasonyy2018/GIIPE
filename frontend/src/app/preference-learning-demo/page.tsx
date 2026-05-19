'use client';

import React, { useState } from 'react';
import { usePreferenceLearning } from '@/hooks/usePreferenceLearning';
import PreferenceLearningSettings from '@/components/settings/PreferenceLearningSettings';
import PreferenceFeedbackModal from '@/components/dashboard/PreferenceFeedbackModal';
import PreferenceValidationPanel from '@/components/dashboard/PreferenceValidationPanel';

export default function PreferenceLearningDemo() {
  const [userId] = useState('demo-user-123');
  const [activeDemo, setActiveDemo] = useState<'tracking' | 'learning' | 'feedback' | 'validation' | 'settings'>('tracking');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showValidationPanel, setShowValidationPanel] = useState(false);

  const {
    inference,
    learningSession,
    isLearning,
    hasNewSuggestions,
    validationScore,
    trackWidgetInteraction,
    trackContentEngagement,
    trackNavigation,
    trackSearch,
    runLearningCycle,
    getBehaviorAnalytics,
    submitFeedback
  } = usePreferenceLearning({
    userId,
    enableAutoTracking: true,
    trackingContext: 'demo'
  });

  const simulateUserBehavior = () => {
    // Simulate various user interactions
    const interactions = [
      () => trackWidgetInteraction('stats-overview', 'view', { widgetType: 'stats' }),
      () => trackWidgetInteraction('upcoming-events', 'click', { widgetType: 'events' }),
      () => trackContentEngagement('article-123', 'article', 'view', 30000),
      () => trackContentEngagement('event-456', 'event', 'bookmark'),
      () => trackNavigation('/dashboard', '/events', 'click'),
      () => trackSearch('machine learning', { category: 'tech' }, 15, 'article-789'),
      () => trackWidgetInteraction('saved-content', 'view', { widgetType: 'content' }),
      () => trackContentEngagement('article-789', 'article', 'share')
    ];

    // Execute interactions with delays
    interactions.forEach((interaction, index) => {
      setTimeout(interaction, index * 500);
    });
  };

  const renderTrackingDemo = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Behavior Tracking Demo</h3>
        <p className="text-gray-600 mb-4">
          This demo shows how user behavior is tracked and analyzed for preference learning.
        </p>

        <div className="space-y-4">
          <button
            onClick={simulateUserBehavior}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Simulate User Behavior
          </button>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">
                {getBehaviorAnalytics().totalEvents}
              </div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {getBehaviorAnalytics().uniqueSessions}
              </div>
              <div className="text-sm text-gray-600">Sessions</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(getBehaviorAnalytics().averageSessionDuration)}m
              </div>
              <div className="text-sm text-gray-600">Avg Session</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {getBehaviorAnalytics().topInteractions.length}
              </div>
              <div className="text-sm text-gray-600">Interaction Types</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Interactions</h3>

        <div className="space-y-2">
          {getBehaviorAnalytics().topInteractions.slice(0, 5).map((interaction, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-900 capitalize">{interaction.type}</span>
              <span className="text-sm text-gray-600">{interaction.count} times</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLearningDemo = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Preference Learning Demo</h3>
        <p className="text-gray-600 mb-4">
          This shows how the system learns from user behavior and makes preference inferences.
        </p>

        <div className="space-y-4">
          <button
            onClick={runLearningCycle}
            disabled={isLearning}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLearning ? 'Learning...' : 'Run Learning Cycle'}
          </button>

          {inference && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Inferred Preferences</h4>

              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">Content Types:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {inference.inferredPreferences.contentTypes.map((type, index) => (
                      <span key={index} className="px-2 py-1 bg-light text-primary-dark text-xs rounded-full">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Interaction Styles:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {inference.inferredPreferences.interactionStyles.map((style, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {style}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-700">Layout Preferences:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {inference.inferredPreferences.layoutPreferences.map((pref, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Confidence Score:</span>
                  <span className="text-lg font-bold text-primary">
                    {Math.round(inference.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {learningSession && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Learning Session Results</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rules Applied:</span>
              <span className="font-medium">{learningSession.rulesApplied.length}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Changes Proposed:</span>
              <span className="font-medium">{learningSession.changesProposed.length}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Session Duration:</span>
              <span className="font-medium">
                {learningSession.endTime && learningSession.startTime
                  ? `${Math.round((learningSession.endTime.getTime() - learningSession.startTime.getTime()) / 1000)}s`
                  : 'In progress'
                }
              </span>
            </div>
          </div>

          {hasNewSuggestions && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium text-yellow-800">
                  New preference suggestions available!
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderFeedbackDemo = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Feedback System Demo</h3>
        <p className="text-gray-600 mb-4">
          Users can provide feedback on preference changes to improve the learning system.
        </p>

        <button
          onClick={() => setShowFeedbackModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          Open Feedback Modal
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Validation Score</h3>

        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">
            {validationScore ? Math.round(validationScore * 100) : 'N/A'}%
          </div>
          <p className="text-gray-600">
            Current preference prediction accuracy
          </p>
        </div>
      </div>
    </div>
  );

  const renderValidationDemo = () => (
    <div className="bg-white border border-gray-200 rounded-lg">
      <PreferenceValidationPanel
        userId={userId}
        onValidationComplete={(score) => {
          console.log('Validation completed with score:', score);
        }}
      />
    </div>
  );

  const renderSettingsDemo = () => (
    <div>
      <PreferenceLearningSettings userId={userId} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Preference Learning System Demo
          </h1>
          <p className="text-gray-600">
            Explore how the system learns user preferences through behavior tracking,
            inference algorithms, and feedback loops.
          </p>
        </div>

        {/* Navigation */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <nav className="flex space-x-8 p-4">
            {[
              { id: 'tracking', label: 'Behavior Tracking', icon: '📊' },
              { id: 'learning', label: 'Preference Learning', icon: '🧠' },
              { id: 'feedback', label: 'Feedback System', icon: '💬' },
              { id: 'validation', label: 'Validation', icon: '✓' },
              { id: 'settings', label: 'Settings', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemo(tab.id as any)}
                className={`flex items-center px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  activeDemo === tab.id
                    ? 'bg-light text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Demo Content */}
        <div className="mb-8">
          {activeDemo === 'tracking' && renderTrackingDemo()}
          {activeDemo === 'learning' && renderLearningDemo()}
          {activeDemo === 'feedback' && renderFeedbackDemo()}
          {activeDemo === 'validation' && renderValidationDemo()}
          {activeDemo === 'settings' && renderSettingsDemo()}
        </div>

        {/* System Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${isLearning ? 'bg-yellow-400' : 'bg-green-400'}`} />
                <span className="text-sm text-gray-600">
                  Learning System: {isLearning ? 'Active' : 'Ready'}
                </span>
              </div>

              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${hasNewSuggestions ? 'bg-blue-400' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">
                  Suggestions: {hasNewSuggestions ? 'Available' : 'None'}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              Demo User: {userId}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFeedbackModal && (
        <PreferenceFeedbackModal
          userId={userId}
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onFeedbackSubmitted={(feedback) => {
            console.log('Feedback submitted:', feedback);
            setShowFeedbackModal(false);
          }}
        />
      )}
    </div>
  );
}
