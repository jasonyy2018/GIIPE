'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/admin/PageHeader';
import { SensitiveWordsManager } from '@/components/admin/SensitiveWordsManager';
import { SensitiveWordsStats } from '@/components/admin/SensitiveWordsStats';
import { SensitiveWordTester } from '@/components/admin/SensitiveWordTester';
import { Shield, Plus, TestTube } from 'lucide-react';

export default function SensitiveWordsPage() {
  const [activeTab, setActiveTab] = useState<'manage' | 'stats' | 'test'>('manage');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabs = [
    { id: 'manage', label: 'Manage Words', icon: Shield },
    { id: 'stats', label: 'Statistics', icon: Shield },
    { id: 'test', label: 'Test Content', icon: TestTube },
  ];

  return (
    <>
      <PageHeader 
        title="Sensitive Words Management" 
        description="Manage content filtering and sensitive word detection"
      >
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Shield className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button 
            onClick={() => {
              // Trigger add form in SensitiveWordsManager via refresh
              setRefreshKey(prev => prev + 1);
            }}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Word
          </button>
        </div>
      </PageHeader>

      <div className="p-6">
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
        <div className="space-y-6">
          {activeTab === 'manage' && (
            <SensitiveWordsManager key={refreshKey} onRefresh={handleRefresh} />
          )}
          
          {activeTab === 'stats' && (
            <SensitiveWordsStats key={refreshKey} />
          )}
          
          {activeTab === 'test' && (
            <SensitiveWordTester />
          )}
        </div>
      </div>
    </>
  );
}