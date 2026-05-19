'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatsCard from './StatsCard';
import { userStatsService, UserStats } from '../../services/userStatsService';

interface StatsOverviewProps {
  userId: string;
  onStatsLoad?: (stats: UserStats) => void;
}

export default function StatsOverview({ userId, onStatsLoad }: StatsOverviewProps) {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const userStats = await userStatsService.getUserStats(userId);
      setStats(userStats);
      onStatsLoad?.(userStats);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    userStatsService.clearCache();
    loadStats();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatsCard
            key={i}
            title=""
            value=""
            icon=""
            loading={true}
          />
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">
          <i className="fas fa-exclamation-triangle text-2xl"></i>
        </div>
        <p className="text-gray-600 mb-4">{error || 'No statistics available'}</p>
        <button
          onClick={handleRefresh}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Events Attended"
          value={stats.eventsAttended}
          icon="fas fa-calendar-check"
          color="primary"
          trend={{
            value: stats.monthlyGrowth.events,
            isPositive: stats.monthlyGrowth.events > 0,
            period: 'this month'
          }}
          subtitle="Total events participated"
          onClick={() => router.push('/events')}
        />
        
        <StatsCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          icon="fas fa-calendar-alt"
          color="blue"
          subtitle={stats.upcomingEvents > 0 ? 'Next event soon' : 'No upcoming events'}
          onClick={() => router.push('/events')}
        />
        
        <StatsCard
          title="Saved Content"
          value={stats.savedArticles}
          icon="fas fa-bookmark"
          color="green"
          trend={{
            value: stats.monthlyGrowth.content,
            isPositive: stats.monthlyGrowth.content > 0,
            period: 'this month'
          }}
          subtitle="Articles and resources"
          onClick={() => router.push('/bookmarks')}
        />
        
        <StatsCard
          title="Network"
          value={stats.networkConnections}
          icon="fas fa-users"
          color="purple"
          trend={{
            value: stats.monthlyGrowth.connections,
            isPositive: stats.monthlyGrowth.connections > 0,
            period: 'this month'
          }}
          subtitle="Professional connections"
          onClick={() => router.push('/users')}
        />
      </div>

      {/* Engagement Score */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Engagement Score</h4>
          <button
            onClick={handleRefresh}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {userStatsService.formatEngagementScore(stats.totalEngagement)}
              </span>
              <span className="text-sm text-gray-500">
                {stats.totalEngagement}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full bg-${userStatsService.getEngagementColor(stats.totalEngagement)}-500`}
                style={{ width: `${stats.totalEngagement}%` }}
              ></div>
            </div>
            {stats.monthlyGrowth.engagement > 0 && (
              <p className="text-sm text-green-600 mt-2">
                <i className="fas fa-arrow-up mr-1"></i>
                +{stats.monthlyGrowth.engagement}% this month
              </p>
            )}
          </div>
          
          <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-${userStatsService.getEngagementColor(stats.totalEngagement)}-100`}>
            <i className={`fas fa-chart-line text-2xl text-${userStatsService.getEngagementColor(stats.totalEngagement)}-600`}></i>
          </div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Weekly Activity</h4>
        <div className="grid grid-cols-7 gap-2">
          {stats.weeklyActivity.map((day, index) => {
            const totalActivity = day.events + day.content + day.connections;
            const maxActivity = Math.max(...stats.weeklyActivity.map(d => d.events + d.content + d.connections));
            const height = maxActivity > 0 ? (totalActivity / maxActivity) * 100 : 0;
            
            return (
              <div key={index} className="text-center">
                <div className="h-20 flex items-end justify-center mb-2">
                  <div
                    className="w-8 bg-primary rounded-t transition-all duration-300 hover:bg-primary-dark"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${totalActivity} activities on ${new Date(day.date).toLocaleDateString()}`}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-primary rounded mr-2"></div>
            <span>Daily Activity</span>
          </div>
        </div>
      </div>
    </div>
  );
}