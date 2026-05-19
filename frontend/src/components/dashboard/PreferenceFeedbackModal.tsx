'use client';

import React, { useState, useEffect } from 'react';
import { preferenceLearningService, type LearningSession, type PreferenceFeedback } from '@/services/preferenceLearningService';

interface PreferenceFeedbackModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onFeedbackSubmitted?: (feedback: PreferenceFeedback) => void;
}

interface PendingChange {
  id: string;
  rule: string;
  description: string;
  change: any;
  confidence: number;
  applied: boolean;
}

export default function PreferenceFeedbackModal({
  userId,
  isOpen,
  onClose,
  onFeedbackSubmitted
}: PreferenceFeedbackModalProps) {
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [selectedChange, setSelectedChange] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | 'annoying' | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadLearningSession();
    }
  }, [isOpen, userId]);

  const loadLearningSession = () => {
    const session = preferenceLearningService.getLearningSession(userId);
    setLearningSession(session);
    
    if (session) {
      const changes = session.changesProposed.map((change, index) => ({
        id: `${session.userId}-${index}`,
        rule: change.rule,
        description: getRuleDescription(change.rule),
        change: change.change,
        confidence: change.confidence,
        applied: change.applied
      }));
      setPendingChanges(changes);
    }
  };

  const getRuleDescription = (ruleId: string): string => {
    const rules = preferenceLearningService.getLearningRules();
    const rule = rules.find(r => r.id === ruleId);
    return rule?.description || 'Unknown preference change';
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedChange || !feedback) return;
    
    setIsSubmitting(true);
    
    try {
      preferenceLearningService.submitFeedback(
        userId,
        selectedChange,
        feedback,
        comment.trim() || undefined
      );

      const feedbackEntry: PreferenceFeedback = {
        userId,
        changeId: selectedChange,
        feedback,
        comment: comment.trim() || undefined,
        timestamp: new Date()
      };

      onFeedbackSubmitted?.(feedbackEntry);
      
      // Reset form
      setSelectedChange(null);
      setFeedback(null);
      setComment('');
      
      // Close modal if no more changes to review
      const remainingChanges = pendingChanges.filter(c => c.id !== selectedChange);
      if (remainingChanges.length === 0) {
        onClose();
      } else {
        setPendingChanges(remainingChanges);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatChangeDescription = (change: any): string => {
    const descriptions: string[] = [];
    
    if (change.currentTheme) {
      descriptions.push(`Changed theme to ${change.currentTheme}`);
    }
    if (change.compactMode !== undefined) {
      descriptions.push(`${change.compactMode ? 'Enabled' : 'Disabled'} compact mode`);
    }
    if (change.enableAnimations !== undefined) {
      descriptions.push(`${change.enableAnimations ? 'Enabled' : 'Disabled'} animations`);
    }
    if (change.refreshInterval) {
      descriptions.push(`Changed refresh interval to ${Math.floor(change.refreshInterval / 60)} minutes`);
    }
    if (change.hiddenWidgets && change.hiddenWidgets.length > 0) {
      descriptions.push(`Hid ${change.hiddenWidgets.length} unused widgets`);
    }
    if (change.customLayouts) {
      descriptions.push('Reorganized widget layout');
    }
    
    return descriptions.join(', ') || 'Made preference adjustments';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Dashboard Preference Feedback
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {pendingChanges.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Recent Changes
              </h3>
              <p className="text-gray-600">
                We haven't made any automatic preference adjustments recently.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-primary-dark">
                      Help Us Learn Your Preferences
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      We've made some automatic adjustments to your dashboard based on your usage patterns. 
                      Your feedback helps us improve future suggestions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {pendingChanges.map((change) => (
                  <div
                    key={change.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedChange === change.id
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedChange(change.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <input
                            type="radio"
                            checked={selectedChange === change.id}
                            onChange={() => setSelectedChange(change.id)}
                            className="mr-3"
                          />
                          <h4 className="font-medium text-gray-900">
                            {change.description}
                          </h4>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            change.applied 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {change.applied ? 'Applied' : 'Suggested'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 ml-6">
                          {formatChangeDescription(change.change)}
                        </p>
                        <div className="flex items-center mt-2 ml-6">
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">Confidence:</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${change.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 ml-2">
                              {Math.round(change.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedChange && (
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    How helpful was this change?
                  </h4>
                  
                  <div className="space-y-3 mb-4">
                    {[
                      { value: 'helpful', label: 'Helpful', icon: '👍', color: 'green' },
                      { value: 'not_helpful', label: 'Not Helpful', icon: '👎', color: 'yellow' },
                      { value: 'annoying', label: 'Annoying', icon: '😤', color: 'red' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          feedback === option.value
                            ? `border-${option.color}-500 bg-${option.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="feedback"
                          value={option.value}
                          checked={feedback === option.value}
                          onChange={(e) => setFeedback(e.target.value as any)}
                          className="sr-only"
                        />
                        <span className="text-2xl mr-3">{option.icon}</span>
                        <span className="font-medium">{option.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mb-6">
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Comments (Optional)
                    </label>
                    <textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Tell us more about your experience with this change..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setSelectedChange(null);
                        setFeedback(null);
                        setComment('');
                      }}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFeedbackSubmit}
                      disabled={!feedback || isSubmitting}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}