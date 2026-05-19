'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3,
  Activity,
  Target
} from 'lucide-react';

interface SensitiveWordsStatsData {
  totalWords: number;
  activeWords: number;
  categoriesCount: number;
  recentDetections: number;
  categoryStats: Array<{
    category: string;
    wordCount: number;
    detectionCount: number;
    detectionRate: number;
  }>;
  topDetectedCategories: Array<{
    flags: string[];
    count: number;
  }>;
}

interface SensitiveWordsStatsProps {}

export function SensitiveWordsStats({}: SensitiveWordsStatsProps) {
  const [stats, setStats] = useState<SensitiveWordsStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/sensitive-words/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch sensitive words stats');
      }
    } catch (error) {
      console.error('Error fetching sensitive words stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-8 w-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Words
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.totalWords}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Words
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.activeWords}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Categories
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.categoriesCount}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Recent Detections
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.recentDetections}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Category Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Category Performance
            </h3>
            <div className="space-y-4">
              {stats.categoryStats.map((category) => (
                <div key={category.category} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {category.category.replace('_', ' ')}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {category.wordCount} words
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Detections (30d):</span>
                      <div className="font-medium text-gray-900">
                        {category.detectionCount}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Rate/day:</span>
                      <div className="font-medium text-gray-900">
                        {category.detectionRate.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Detection Rate Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Detection Rate</span>
                      <span>{((category.detectionRate / Math.max(...stats.categoryStats.map(c => c.detectionRate))) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(category.detectionRate / Math.max(...stats.categoryStats.map(c => c.detectionRate))) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Top Detected Categories
            </h3>
            <div className="space-y-3">
              {stats.topDetectedCategories.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-6 h-6 bg-light text-primary-dark rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {item.flags.length > 0 ? item.flags.join(', ') : 'No flags'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detection Trends */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Detection Insights
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {((stats.activeWords / stats.totalWords) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Words Active</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {(stats.recentDetections / 7).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Avg Detections/Day</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {(stats.totalWords / stats.categoriesCount).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Words per Category</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}