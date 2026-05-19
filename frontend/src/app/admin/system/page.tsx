'use client';

import { useState } from 'react';
import SystemSettingsManager from '@/components/admin/SystemSettingsManager';
import SensitiveWordManager from '@/components/admin/SensitiveWordManager';
import SystemMaintenanceTools from '@/components/admin/SystemMaintenanceTools';

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState('settings');

  const tabs = [
    { id: 'settings', name: 'System Settings', icon: 'fas fa-cog' },
    { id: 'sensitive-words', name: 'Sensitive Words', icon: 'fas fa-filter' },
    { id: 'maintenance', name: 'Maintenance', icon: 'fas fa-tools' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Configuration</h1>
          <p className="mt-2 text-gray-600">
            Manage system settings, sensitive word filters, and maintenance tools
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`${tab.icon} mr-2`}></i>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'settings' && <SystemSettingsManager />}
          {activeTab === 'sensitive-words' && <SensitiveWordManager />}
          {activeTab === 'maintenance' && <SystemMaintenanceTools />}
        </div>
      </div>
    </div>
  );
}