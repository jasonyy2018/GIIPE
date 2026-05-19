'use client';

import { useState } from 'react';
import NavigationLayout from '@/components/navigation/NavigationLayout';
import BreadcrumbNavigation from '@/components/navigation/BreadcrumbNavigation';
import PersonalizedNavigationMenu from '@/components/navigation/PersonalizedNavigationMenu';
import RecentlyAccessedContent from '@/components/navigation/RecentlyAccessedContent';
import NavigationSettings from '@/components/settings/NavigationSettings';
import { useNavigationTracking } from '@/hooks/useNavigationTracking';

export default function NavigationDemoPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Track this page visit
  useNavigationTracking({
    pageTitle: 'Navigation Features Demo',
    pageType: 'page',
    pageDescription: 'Demonstration of navigation optimization features',
    pageCategory: 'demo'
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-eye' },
    { id: 'breadcrumbs', label: 'Breadcrumbs', icon: 'fas fa-route' },
    { id: 'personalized', label: 'Personalized Menu', icon: 'fas fa-user-cog' },
    { id: 'recent', label: 'Recently Accessed', icon: 'fas fa-clock' },
    { id: 'layout', label: 'Navigation Layout', icon: 'fas fa-layout' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary to-primary-dark rounded-lg p-6 text-white">
              <h1 className="text-3xl font-bold mb-2">Navigation Optimization Features</h1>
              <p className="text-primary-light">
                Explore the advanced navigation features that enhance user experience and improve content discovery.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'Breadcrumb Navigation',
                  description: 'Context-aware breadcrumbs that help users understand their location and navigate efficiently.',
                  icon: 'fas fa-route',
                  features: ['Auto-generated from URL', 'Custom breadcrumb support', 'Responsive design', 'Truncation for long paths']
                },
                {
                  title: 'Recently Accessed Content',
                  description: 'Track and display recently visited pages, articles, and resources for quick access.',
                  icon: 'fas fa-clock',
                  features: ['Automatic tracking', 'Search functionality', 'Category filtering', 'Persistent storage']
                },
                {
                  title: 'Personalized Navigation',
                  description: 'Adaptive navigation menu that learns from user behavior and preferences.',
                  icon: 'fas fa-user-cog',
                  features: ['Usage analytics', 'Favorite items', 'Custom ordering', 'Category grouping']
                }
              ].map((feature, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                      <i className={`${feature.icon} text-primary text-xl`}></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <ul className="space-y-1">
                    {feature.features.map((item, i) => (
                      <li key={i} className="text-sm text-gray-500 flex items-center">
                        <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );

      case 'breadcrumbs':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Breadcrumb Navigation</h2>
              <p className="text-gray-600">
                Breadcrumbs provide contextual navigation and help users understand their current location.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Breadcrumbs</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <BreadcrumbNavigation />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Breadcrumbs</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <BreadcrumbNavigation
                    customItems={[
                      { label: 'Home', href: '/dashboard', icon: 'fas fa-home' },
                      { label: 'Features', href: '/features', icon: 'fas fa-star' },
                      { label: 'Navigation', href: '/features/navigation', icon: 'fas fa-compass' },
                      { label: 'Demo', href: '/navigation-demo', icon: 'fas fa-play', isActive: true }
                    ]}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Truncated Breadcrumbs</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <BreadcrumbNavigation
                    customItems={[
                      { label: 'Home', href: '/', icon: 'fas fa-home' },
                      { label: 'Level 1', href: '/level1', icon: 'fas fa-folder' },
                      { label: 'Level 2', href: '/level1/level2', icon: 'fas fa-folder' },
                      { label: 'Level 3', href: '/level1/level2/level3', icon: 'fas fa-folder' },
                      { label: 'Level 4', href: '/level1/level2/level3/level4', icon: 'fas fa-folder' },
                      { label: 'Current Page', href: '/current', icon: 'fas fa-file', isActive: true }
                    ]}
                    maxItems={4}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'personalized':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personalized Navigation Menu</h2>
              <p className="text-gray-600">
                Adaptive navigation that learns from user behavior and provides personalized experiences.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Horizontal Layout</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <PersonalizedNavigationMenu
                    orientation="horizontal"
                    showCategories={false}
                    maxItems={6}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vertical Layout with Categories</h3>
                <div className="bg-gray-50 rounded-lg p-4 h-96 overflow-y-auto">
                  <PersonalizedNavigationMenu
                    orientation="vertical"
                    showCategories={true}
                    showFrequentlyUsed={true}
                    showRecentlyUsed={true}
                    maxItems={12}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'recent':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Recently Accessed Content</h2>
              <p className="text-gray-600">
                Track and display recently visited content for quick access and improved user experience.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Accessed Widget</h3>
              <RecentlyAccessedContent
                maxItems={10}
                showSearch={true}
                showClearAll={true}
                groupByType={false}
              />
            </div>
          </div>
        );

      case 'layout':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Navigation Layout</h2>
              <p className="text-gray-600">
                Complete navigation layout with sidebar, breadcrumbs, and recently accessed content.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Layout Controls</h3>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  {sidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <NavigationLayout
                  showBreadcrumbs={true}
                  showPersonalizedNav={true}
                  showRecentlyAccessed={true}
                  showSidebar={true}
                  sidebarCollapsed={sidebarCollapsed}
                  onSidebarToggle={setSidebarCollapsed}
                >
                  <div className="p-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-4">Main Content Area</h4>
                    <p className="text-gray-600 mb-4">
                      This is the main content area within the navigation layout. The sidebar can be collapsed
                      or expanded, and all navigation features are integrated seamlessly.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-2">Feature 1</h5>
                        <p className="text-sm text-gray-600">Sample content to demonstrate the layout.</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-900 mb-2">Feature 2</h5>
                        <p className="text-sm text-gray-600">More sample content for the demo.</p>
                      </div>
                    </div>
                  </div>
                </NavigationLayout>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <NavigationSettings />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Navigation Features Demo</h1>
            </div>
            <BreadcrumbNavigation />
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>
    </div>
  );
}