'use client';

import React, { useState, useEffect } from 'react';
import { preferenceLearningService } from '@/services/preferenceLearningService';
import { userBehaviorTrackingService, type PreferenceInference } from '@/services/userBehaviorTrackingService';

interface PreferenceValidationPanelProps {
  userId: string;
  onValidationComplete?: (score: number) => void;
}

interface ValidationQuestion {
  id: string;
  category: keyof PreferenceInference['inferredPreferences'];
  question: string;
  options: string[];
  correctAnswer?: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

export default function PreferenceValidationPanel({
  userId,
  onValidationComplete
}: PreferenceValidationPanelProps) {
  const [inference, setInference] = useState<PreferenceInference | null>(null);
  const [validationQuestions, setValidationQuestions] = useState<ValidationQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [validationScore, setValidationScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadPreferenceInference();
    }
  }, [userId]);

  const loadPreferenceInference = () => {
    setIsLoading(true);
    
    try {
      const userInference = preferenceLearningService.getUserPreferenceInference(userId);
      setInference(userInference);
      
      if (userInference) {
        generateValidationQuestions(userInference);
      }
    } catch (error) {
      console.error('Error loading preference inference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateValidationQuestions = (inference: PreferenceInference) => {
    const questions: ValidationQuestion[] = [];

    // Content type preferences
    if (inference.inferredPreferences.contentTypes.length > 0) {
      questions.push({
        id: 'content-types',
        category: 'contentTypes',
        question: 'Which types of content do you find most interesting?',
        options: [
          'Technical articles and tutorials',
          'Industry news and updates',
          'Event announcements',
          'Community discussions',
          'Research papers',
          'Product updates'
        ]
      });
    }

    // Interaction style preferences
    if (inference.inferredPreferences.interactionStyles.length > 0) {
      questions.push({
        id: 'interaction-styles',
        category: 'interactionStyles',
        question: 'How do you prefer to interact with the dashboard?',
        options: [
          'Quick clicks and fast navigation',
          'Detailed exploration and reading',
          'Frequent searching and filtering',
          'Bookmarking and saving for later',
          'Sharing and social interactions',
          'Customizing and organizing'
        ]
      });
    }

    // Layout preferences
    if (inference.inferredPreferences.layoutPreferences.length > 0) {
      questions.push({
        id: 'layout-preferences',
        category: 'layoutPreferences',
        question: 'What dashboard layout do you prefer?',
        options: [
          'Compact with lots of information',
          'Spacious with clear sections',
          'Widget-focused with customization',
          'List-based with minimal graphics',
          'Card-based with visual elements',
          'Grid-based with equal spacing'
        ]
      });
    }

    // Timing patterns
    if (inference.inferredPreferences.timingPatterns.length > 0) {
      questions.push({
        id: 'timing-patterns',
        category: 'timingPatterns',
        question: 'When are you most active on the platform?',
        options: [
          'Early morning (6-9 AM)',
          'Mid-morning (9-12 PM)',
          'Afternoon (12-5 PM)',
          'Evening (5-8 PM)',
          'Late evening (8-11 PM)',
          'Throughout the day'
        ]
      });
    }

    // Navigation patterns
    if (inference.inferredPreferences.navigationPatterns.length > 0) {
      questions.push({
        id: 'navigation-patterns',
        category: 'navigationPatterns',
        question: 'How do you typically navigate the platform?',
        options: [
          'Using search to find specific content',
          'Browsing through categories',
          'Following recommendations',
          'Direct links and bookmarks',
          'Social connections and mentions',
          'Recent activity and history'
        ]
      });
    }

    setValidationQuestions(questions);
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < validationQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      completeValidation();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const completeValidation = () => {
    if (!inference) return;

    // Convert answers to validation format
    const validationData = validationQuestions.map(question => {
      const userAnswer = answers[question.id];
      const inferredPrefs = inference.inferredPreferences[question.category];
      
      // Simple matching logic - in a real implementation, this would be more sophisticated
      const isCorrect = Array.isArray(inferredPrefs) && 
                       userAnswer && 
                       inferredPrefs.some(pref => 
                         userAnswer.toLowerCase().includes(pref.toLowerCase()) ||
                         pref.toLowerCase().includes(userAnswer.toLowerCase())
                       );

      return {
        category: question.category,
        preference: userAnswer || '',
        isCorrect: Boolean(isCorrect)
      };
    });

    // Submit validation
    const score = preferenceLearningService.validatePreferences(userId, validationData);
    setValidationScore(score);
    setIsComplete(true);
    onValidationComplete?.(score);
  };

  const restartValidation = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsComplete(false);
    setValidationScore(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading preference analysis...</span>
      </div>
    );
  }

  if (!inference || validationQuestions.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="text-gray-500 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Not Enough Data
        </h3>
        <p className="text-gray-600">
          We need more interaction data to analyze your preferences. 
          Keep using the dashboard and we'll learn your preferences over time.
        </p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="text-center p-8">
        <div className="mb-6">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
            validationScore && validationScore > 0.7 
              ? 'bg-green-100 text-green-600' 
              : validationScore && validationScore > 0.4
              ? 'bg-yellow-100 text-yellow-600'
              : 'bg-red-100 text-red-600'
          }`}>
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {validationScore && validationScore > 0.7 ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Validation Complete
          </h3>
          
          <div className="text-3xl font-bold mb-2">
            {validationScore ? Math.round(validationScore * 100) : 0}%
          </div>
          
          <p className="text-gray-600 mb-4">
            {validationScore && validationScore > 0.7 
              ? 'Great! We understand your preferences well.'
              : validationScore && validationScore > 0.4
              ? 'Good! We\'re learning your preferences.'
              : 'We need to improve our understanding of your preferences.'
            }
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">What this means:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>�?Your feedback helps us improve future suggestions</li>
            <li>�?Higher scores mean better personalized experiences</li>
            <li>�?We'll continue learning from your interactions</li>
          </ul>
        </div>

        <button
          onClick={restartValidation}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          Take Validation Again
        </button>
      </div>
    );
  }

  const currentQuestion = validationQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / validationQuestions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            Preference Validation
          </h2>
          <span className="text-sm text-gray-500">
            {currentQuestionIndex + 1} of {validationQuestions.length}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {currentQuestion.question}
        </h3>
        
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                answers[currentQuestion.id] === option
                  ? 'border-primary bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name={currentQuestion.id}
                value={option}
                checked={answers[currentQuestion.id] === option}
                onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                className="mr-3"
              />
              <span className="text-gray-900">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        
        <button
          onClick={handleNext}
          disabled={!answers[currentQuestion.id]}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentQuestionIndex === validationQuestions.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
}