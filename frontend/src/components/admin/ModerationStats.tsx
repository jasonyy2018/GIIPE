'use client';

import { ModerationStats as ModerationStatsType } from '@/types/moderation';
import { Shield, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface ModerationStatsProps {
  stats: ModerationStatsType;
}

export function ModerationStats({ stats }: ModerationStatsProps) {
  return (
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
            <Shield className="h-8 w-8 text-red-600" />
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
            <Clock className="h-8 w-8 text-primary" />
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
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                Moderation Rate
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {stats.moderationRate.toFixed(1)}/day
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}