'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import ModerationQueue from '@/components/admin/ModerationQueue';
import { ModerationStats } from '@/components/admin/ModerationStats';
import { AdvancedBulkModeration } from '@/components/admin/AdvancedBulkModeration';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ModerationStats as ModerationStatsType } from '@/types/moderation';

export default function ModerationPage() {
  const [stats, setStats] = useState<ModerationStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/moderation/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <PageHeader 
        title="Content Moderation" 
        description="Review and moderate user-generated content"
      >
        <button 
          onClick={handleRefresh}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark"
        >
          <Shield className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </PageHeader>

      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Review
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.pending}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Flagged Content
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.flagged}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Avg Response Time
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.avgResponseTime.toFixed(1)}h
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Reports
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalReports}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Bulk Moderation Tools */}
        <AdvancedBulkModeration onRefresh={handleRefresh} />

        {/* Moderation Queue */}
        <div className="bg-white rounded-lg shadow">
          <ModerationQueue key={refreshKey} onRefresh={handleRefresh} />
        </div>
      </div>
    </>
  );
}