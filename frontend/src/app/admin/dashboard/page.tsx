'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/types/dashboard-widgets';
import CustomizableDashboard from '@/components/admin/CustomizableDashboard';
import AdminGuard from '@/components/AdminGuard';

export default function AdminDashboardPage() {
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(null);
  const [savedLayouts, setSavedLayouts] = useState<DashboardLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved layouts on component mount
  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard/widgets');
      
      if (!response.ok) {
        throw new Error('Failed to load dashboard layouts');
      }
      
      const layouts = await response.json();
      setSavedLayouts(layouts);
      
      // Set default layout as current
      const defaultLayout = layouts.find((l: DashboardLayout) => l.isDefault);
      if (defaultLayout) {
        setCurrentLayout(defaultLayout);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load layouts');
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = async (layout: DashboardLayout) => {
    try {
      // Save layout to backend
      const response = await fetch('/api/admin/dashboard/widgets', {
        method: currentLayout?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(layout)
      });

      if (!response.ok) {
        throw new Error('Failed to save layout');
      }

      const savedLayout = await response.json();
      setCurrentLayout(savedLayout);
      
      // Update saved layouts list
      setSavedLayouts(prev => {
        const index = prev.findIndex(l => l.id === savedLayout.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = savedLayout;
          return updated;
        } else {
          return [...prev, savedLayout];
        }
      });
    } catch (err) {
      console.error('Failed to save layout:', err);
      // You might want to show a toast notification here
    }
  };

  const handleLayoutSelect = (layout: DashboardLayout) => {
    setCurrentLayout(layout);
  };

  const handleCreateNewLayout = () => {
    const newLayout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name: `Dashboard ${savedLayouts.length + 1}`,
      isDefault: false,
      widgets: [],
      gridSettings: {
        cols: 12,
        rowHeight: 60,
        margin: [16, 16]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setCurrentLayout(newLayout);
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminGuard>
    );
  }

  if (error) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <i className="fas fa-exclamation-triangle text-4xl"></i>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadLayouts}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">G</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-sm text-gray-500">Customizable Analytics & Monitoring</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Layout Selector */}
                {savedLayouts.length > 1 && (
                  <select
                    value={currentLayout?.id || ''}
                    onChange={(e) => {
                      const layout = savedLayouts.find(l => l.id === e.target.value);
                      if (layout) handleLayoutSelect(layout);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {savedLayouts.map(layout => (
                      <option key={layout.id} value={layout.id}>
                        {layout.name} {layout.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                )}
                
                <button
                  onClick={handleCreateNewLayout}
                  className="px-3 py-2 text-sm font-medium text-primary bg-light rounded-md hover:bg-light/80 transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  New Layout
                </button>
                
                <a
                  href="/admin"
                  className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Back to Admin
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {currentLayout ? (
              <CustomizableDashboard
                initialLayout={currentLayout}
                onLayoutChange={handleLayoutChange}
                enableEditing={true}
              />
            ) : (
              <div className="text-center py-12">
                <i className="fas fa-th-large text-4xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Dashboard Layout</h3>
                <p className="text-gray-600 mb-4">
                  Create your first dashboard layout to get started.
                </p>
                <button
                  onClick={handleCreateNewLayout}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Create Dashboard
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}