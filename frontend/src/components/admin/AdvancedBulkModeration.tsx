'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Play, 
  BarChart3, 
  Filter, 
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users
} from 'lucide-react';
import { CommentStatus, CommentTargetType, ModerationFilters } from '@/types/moderation';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: CommentStatus;
  isActive: boolean;
}

interface ModerationPerformance {
  period: string;
  totalModerated: number;
  breakdown: {
    approved: number;
    rejected: number;
    flagged: number;
  };
  avgResponseTime: number;
  moderationRate: number;
  moderatorStats: Array<{
    moderatorId: string;
    moderator: {
      username: string;
      firstName?: string;
      lastName?: string;
    };
    totalModerated: number;
    breakdown: {
      approved: number;
      rejected: number;
      flagged: number;
    };
  }>;
}

interface AdvancedBulkModerationProps {
  onRefresh?: () => void;
}

export function AdvancedBulkModeration({ onRefresh }: AdvancedBulkModerationProps) {
  const [activeTab, setActiveTab] = useState<'filters' | 'automation' | 'performance'>('filters');
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [performance, setPerformance] = useState<ModerationPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [bulkFilters, setBulkFilters] = useState<ModerationFilters>({
    status: CommentStatus.PENDING,
    targetType: undefined,
    category: '',
    search: '',
  });
  const [bulkAction, setBulkAction] = useState<CommentStatus>(CommentStatus.APPROVED);
  const [bulkNote, setBulkNote] = useState('');

  useEffect(() => {
    if (activeTab === 'automation') {
      fetchAutomationRules();
    } else if (activeTab === 'performance') {
      fetchPerformance();
    }
  }, [activeTab]);

  const fetchAutomationRules = async () => {
    try {
      const response = await fetch('/api/admin/moderation/automation-rules');
      if (response.ok) {
        const data = await response.json();
        setAutomationRules(data);
      }
    } catch (error) {
      console.error('Error fetching automation rules:', error);
    }
  };

  const fetchPerformance = async () => {
    try {
      const response = await fetch('/api/admin/moderation/performance');
      if (response.ok) {
        const data = await response.json();
        setPerformance(data);
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  const handleBulkModerationByFilters = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/moderation/bulk-by-filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: bulkFilters,
          action: bulkAction,
          moderationNote: bulkNote,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Bulk moderation result:', result);
        
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('Failed to perform bulk moderation');
      }
    } catch (error) {
      console.error('Error performing bulk moderation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAutomation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/moderation/apply-automation', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Automation result:', result);
        
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('Failed to apply automation');
      }
    } catch (error) {
      console.error('Error applying automation:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'filters', label: 'Filter-based Moderation', icon: Filter },
    { id: 'automation', label: 'Automation Rules', icon: Zap },
    { id: 'performance', label: 'Performance Metrics', icon: BarChart3 },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Advanced Bulk Moderation Tools
        </h3>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'filters' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Filter-based Bulk Moderation</h4>
              <p className="text-sm text-blue-700">
                Apply moderation actions to all comments matching specific criteria.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900">Filter Criteria</h5>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    value={bulkFilters.status || ''}
                    onChange={(e) => setBulkFilters(prev => ({ 
                      ...prev, 
                      status: e.target.value as CommentStatus || undefined 
                    }))}
                  >
                    <option value="">All Statuses</option>
                    <option value={CommentStatus.PENDING}>Pending</option>
                    <option value={CommentStatus.FLAGGED}>Flagged</option>
                    <option value={CommentStatus.APPROVED}>Approved</option>
                    <option value={CommentStatus.REJECTED}>Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    value={bulkFilters.targetType || ''}
                    onChange={(e) => setBulkFilters(prev => ({ 
                      ...prev, 
                      targetType: e.target.value as CommentTargetType || undefined 
                    }))}
                  >
                    <option value="">All Types</option>
                    <option value={CommentTargetType.EVENT}>Events</option>
                    <option value={CommentTargetType.NEWS}>News</option>
                    <option value={CommentTargetType.SUBMISSION}>Submissions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sensitive Word Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    value={bulkFilters.category || ''}
                    onChange={(e) => setBulkFilters(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">All Categories</option>
                    <option value="profanity">Profanity</option>
                    <option value="hate_speech">Hate Speech</option>
                    <option value="harassment">Harassment</option>
                    <option value="spam">Spam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Content
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Search in comment content..."
                    value={bulkFilters.search || ''}
                    onChange={(e) => setBulkFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-medium text-gray-900">Moderation Action</h5>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action to Apply
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as CommentStatus)}
                  >
                    <option value={CommentStatus.APPROVED}>Approve</option>
                    <option value={CommentStatus.REJECTED}>Reject</option>
                    <option value={CommentStatus.FLAGGED}>Flag for Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moderation Note
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Optional note for this bulk action..."
                    value={bulkNote}
                    onChange={(e) => setBulkNote(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleBulkModerationByFilters}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? 'Processing...' : 'Apply Bulk Action'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">Automation Rules</h4>
              <p className="text-sm text-yellow-700">
                Automatically moderate content based on predefined rules and conditions.
              </p>
            </div>

            <div className="space-y-4">
              {automationRules.map((rule) => (
                <div key={rule.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{rule.name}</h5>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                  
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Condition:</span> {rule.condition}
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Action:</span> {rule.action}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleApplyAutomation}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              <Zap className="h-4 w-4 mr-2" />
              {loading ? 'Applying...' : 'Apply Automation Rules'}
            </button>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {performance && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <BarChart3 className="h-8 w-8 text-primary" />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-500">Total Moderated</div>
                        <div className="text-lg font-semibold text-gray-900">{performance.totalModerated}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-500">Approved</div>
                        <div className="text-lg font-semibold text-gray-900">{performance.breakdown.approved}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <XCircle className="h-8 w-8 text-red-600" />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-500">Rejected</div>
                        <div className="text-lg font-semibold text-gray-900">{performance.breakdown.rejected}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-500">Flagged</div>
                        <div className="text-lg font-semibold text-gray-900">{performance.breakdown.flagged}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Response Time
                    </h5>
                    <div className="text-2xl font-semibold text-gray-900">
                      {performance.avgResponseTime.toFixed(1)}h
                    </div>
                    <div className="text-sm text-gray-500">Average response time</div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Moderation Rate
                    </h5>
                    <div className="text-2xl font-semibold text-gray-900">
                      {performance.moderationRate.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">Comments per day</div>
                  </div>
                </div>

                {performance.moderatorStats && performance.moderatorStats.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-4 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Moderator Performance
                    </h5>
                    <div className="space-y-3">
                      {performance.moderatorStats.map((moderator) => (
                        <div key={moderator.moderatorId} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium text-gray-900">
                                {moderator.moderator.firstName} {moderator.moderator.lastName}
                              </div>
                              <div className="text-sm text-gray-500">@{moderator.moderator.username}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-gray-900">
                                {moderator.totalModerated}
                              </div>
                              <div className="text-sm text-gray-500">total moderated</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-medium text-green-600">{moderator.breakdown.approved}</div>
                              <div className="text-gray-500">Approved</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-red-600">{moderator.breakdown.rejected}</div>
                              <div className="text-gray-500">Rejected</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-yellow-600">{moderator.breakdown.flagged}</div>
                              <div className="text-gray-500">Flagged</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}