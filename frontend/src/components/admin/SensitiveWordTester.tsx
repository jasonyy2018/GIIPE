'use client';

import { useState } from 'react';
import { 
  TestTube, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Shield,
  Lightbulb
} from 'lucide-react';

interface TestResult {
  isClean: boolean;
  detectedWords: Array<{
    word: string;
    level: number;
    category: string;
    positions: number[];
  }>;
  maxLevel: number;
  filteredContent: string;
  highlightedContent: string;
  recommendations: Array<{
    action: string;
    reason: string;
    confidence: string;
  }>;
}

export function SensitiveWordTester() {
  const [content, setContent] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHighlighted, setShowHighlighted] = useState(true);

  const handleTest = async () => {
    if (!content.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/sensitive-words/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);
      } else {
        console.error('Failed to test content');
      }
    } catch (error) {
      console.error('Error testing content:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level: number) => {
    const badges = {
      1: { class: 'bg-green-100 text-green-800', label: 'Low' },
      2: { class: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      3: { class: 'bg-orange-100 text-orange-800', label: 'High' },
      4: { class: 'bg-red-100 text-red-800', label: 'Critical' },
      5: { class: 'bg-purple-100 text-purple-800', label: 'Severe' },
    };
    return badges[level as keyof typeof badges] || { class: 'bg-gray-100 text-gray-800', label: 'Unknown' };
  };

  const getRecommendationIcon = (action: string) => {
    switch (action) {
      case 'approve':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'reject':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'flag':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'review':
        return <Eye className="h-4 w-4 text-primary" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRecommendationColor = (action: string) => {
    switch (action) {
      case 'approve':
        return 'bg-green-50 border-green-200';
      case 'reject':
        return 'bg-red-50 border-red-200';
      case 'flag':
        return 'bg-yellow-50 border-yellow-200';
      case 'review':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Input */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <TestTube className="h-5 w-5 mr-2" />
            Content Tester
          </h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Test Content
              </label>
              <textarea
                id="content"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter content to test against sensitive word filters..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {content.length} characters
              </div>
              <button
                onClick={handleTest}
                disabled={!content.trim() || loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {loading ? 'Testing...' : 'Test Content'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="space-y-6">
          {/* Overall Result */}
          <div className={`rounded-lg border-2 p-6 ${
            testResult.isClean 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {testResult.isClean ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                )}
              </div>
              <div className="ml-4">
                <h3 className={`text-lg font-medium ${
                  testResult.isClean ? 'text-green-900' : 'text-red-900'
                }`}>
                  {testResult.isClean ? 'Content is Clean' : 'Sensitive Content Detected'}
                </h3>
                <p className={`text-sm ${
                  testResult.isClean ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResult.isClean 
                    ? 'No sensitive words found in the content.'
                    : `${testResult.detectedWords.length} sensitive word(s) detected with max severity level ${testResult.maxLevel}.`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Detected Words */}
          {testResult.detectedWords.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Detected Words ({testResult.detectedWords.length})
                </h3>
                
                <div className="space-y-3">
                  {testResult.detectedWords.map((word, index) => {
                    const badge = getLevelBadge(word.level);
                    return (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {word.word}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
                              {badge.label} ({word.level})
                            </span>
                            <span className="text-sm text-gray-600 capitalize">
                              {word.category.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {word.positions.length} occurrence{word.positions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Positions:</span> {word.positions.join(', ')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Content Preview */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Content Preview
                </h3>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showHighlighted}
                      onChange={(e) => setShowHighlighted(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show highlights</span>
                  </label>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-gray-50">
                <div 
                  className="text-sm text-gray-900 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: showHighlighted ? testResult.highlightedContent : content
                  }}
                />
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {testResult.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Moderation Recommendations
                </h3>
                
                <div className="space-y-3">
                  {testResult.recommendations.map((rec, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${getRecommendationColor(rec.action)}`}>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getRecommendationIcon(rec.action)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {rec.action} Content
                          </div>
                          <div className="text-sm text-gray-600">
                            {rec.reason}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Confidence: {rec.confidence}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}