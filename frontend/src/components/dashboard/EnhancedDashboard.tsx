'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardWidget from './DashboardWidget';
import DashboardGrid, { DashboardRow, DashboardColumn } from './DashboardGrid';
import CustomizableDashboardGrid from './CustomizableDashboardGrid';
import DashboardCustomizer from './DashboardCustomizer';
import ThemeSelector from './ThemeSelector';
import StatsOverview from './StatsOverview';
import ActivityFeed from './ActivityFeed';
import PersonalAnalytics from './PersonalAnalytics';
import UpcomingEvents from './UpcomingEvents';
import EventQuickActions from './EventQuickActions';
import SavedContent from './SavedContent';
import ContentRecommendations from './ContentRecommendations';
import ContentDiscovery from './ContentDiscovery';
import NotificationBell from './NotificationBell';
import NotificationProvider from './NotificationProvider';
import SocialInteractions from './SocialInteractions';
import NetworkActivity from './NetworkActivity';
import ConnectionRecommendations from './ConnectionRecommendations';
import QuickActionsPanel from './QuickActionsPanel';
import { useKeyboardShortcuts } from '../../services/keyboardShortcutsService';
import { useVoiceCommands } from '../../services/voiceCommandsService';
import { useNavigationTracking } from '../../hooks/useNavigationTracking';
import { dashboardCustomizationService } from '@/services/dashboardCustomizationService';
import type { DashboardLayout, DashboardPreferences } from '@/types/dashboard';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinDate: string;
}

interface UserStats {
  eventsAttended: number;
  upcomingEvents: number;
  savedArticles: number;
  networkConnections: number;
  monthlyGrowth: {
    events: number;
    connections: number;
    content: number;
  };
}

interface DashboardData {
  user: User;
  stats: UserStats;
  upcomingEvents: any[];
  recentActivity: any[];
  savedContent: any[];
  notifications: any[];
}

interface EnhancedDashboardProps {
  initialData?: Partial<DashboardData>;
}

export default function EnhancedDashboard({ initialData }: EnhancedDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [useCustomLayout, setUseCustomLayout] = useState(true);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout | null>(null);
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences | null>(null);

  // Initialize keyboard shortcuts and voice commands
  const { registerDefaults: registerKeyboardDefaults } = useKeyboardShortcuts(router);
  const { registerDefaults: registerVoiceDefaults } = useVoiceCommands(router);
  
  // Track navigation automatically
  useNavigationTracking({
    trackPageVisits: true,
    pageTitle: 'Dashboard',
    pageType: 'page',
    pageDescription: 'Your personal dashboard and overview',
    pageCategory: 'dashboard'
  });

  useEffect(() => {
    loadDashboardData();
    loadCustomizationData();
    
    // Register default shortcuts and voice commands
    registerKeyboardDefaults();
    registerVoiceDefaults();

    // Subscribe to customization changes
    const unsubscribe = dashboardCustomizationService.subscribe(() => {
      loadCustomizationData();
    });

    return unsubscribe;
  }, [registerKeyboardDefaults, registerVoiceDefaults]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Refetch data to ensure synchronization
      const eventsResponse = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let upcomingEvents = [];
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        const events = eventsData.events || eventsData;
        
        upcomingEvents = events?.filter((event: any) => new Date(event.startDate) > new Date())
          .slice(0, 5)
          .map((event: any) => ({
            id: event.id,
            title: event.title,
            date: event.startDate,
            location: event.location || 'TBD',
            status: event.status
          }));
      }

      // Refetch data to ensure synchronization
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let userData = {
        id: '1',
        name: 'User',
        email: 'user@example.com',
        avatar: '/images/features/innovation.jpg',
        joinDate: '2024-01-01'
      };

      if (userResponse.ok) {
        const user = await userResponse.json();
        userData = {
          id: user.id || '1',
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || 'User',
          email: user.email || 'user@example.com',
          avatar: user.avatar || '/images/features/innovation.jpg',
          joinDate: user.createdAt || '2024-01-01'
        };
      }
      
      const dashboardData: DashboardData = {
        user: userData,
        stats: {
          eventsAttended: 0, // Refetch data to ensure synchronization
          upcomingEvents: upcomingEvents.length,
          savedArticles: 0,
          networkConnections: 0,
          monthlyGrowth: {
            events: 0,
            connections: 0,
            content: 0
          }
        },
        upcomingEvents,
        recentActivity: [],
        savedContent: [],
        notifications: []
      };

      setData({ ...dashboardData, ...initialData });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomizationData = () => {
    if (data?.user?.id) {
      const layout = dashboardCustomizationService.getCurrentLayout(data.user.id);
      const preferences = dashboardCustomizationService.getPreferences(data.user.id);
      
      setDashboardLayout(layout);
      setDashboardPreferences(preferences);
    }
  };

  // Load customization data when user data is available
  useEffect(() => {
    if (data?.user?.id) {
      loadCustomizationData();
    }
  }, [data?.user?.id]);

  const refreshWidget = async (widgetId: string) => {
    setRefreshing(prev => ({ ...prev, [widgetId]: true }));
    try {
      // Simulate widget refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      // In real app, this would refresh specific widget data
    } catch (error) {
      console.error(`Error refreshing widget ${widgetId}:`, error);
    } finally {
      setRefreshing(prev => ({ ...prev, [widgetId]: false }));
    }
  };

  const handleLayoutSave = (layout: DashboardLayout) => {
    setDashboardLayout(layout);
    setShowCustomizer(false);
  };

  const toggleCustomLayout = () => {
    setUseCustomLayout(!useCustomLayout);
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <NotificationProvider userId={data.user.id}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Welcome back, {data.user.name.split(' ')[0]}! 👋
              </h1>
              <p className="text-primary-light">
                Here's what's happening with your account today.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Dashboard Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowThemeSelector(!showThemeSelector)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  title="Change Theme"
                >
                  <i className="fas fa-palette"></i>
                </button>
                <button
                  onClick={toggleCustomLayout}
                  className={`p-2 rounded-lg transition-colors ${
                    useCustomLayout 
                      ? 'bg-white/30 text-white' 
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                  title={useCustomLayout ? 'Use Default Layout' : 'Use Custom Layout'}
                >
                  <i className="fas fa-th-large"></i>
                </button>
                <button
                  onClick={() => setShowCustomizer(true)}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                  title="Customize Dashboard"
                >
                  <i className="fas fa-cog"></i>
                </button>
              </div>
              
              <NotificationBell 
                userId={data.user.id}
                className="text-white hover:text-primary-light"
              />
              <div className="hidden md:block">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="fas fa-chart-line text-2xl"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Selector Dropdown */}
        {showThemeSelector && (
          <div className="relative">
            <div className="absolute top-0 right-0 z-50 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Choose Theme</h3>
                <button
                  onClick={() => setShowThemeSelector(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <ThemeSelector 
                userId={data.user.id}
                showPreview={true}
              />
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {useCustomLayout && dashboardLayout && dashboardPreferences ? (
          <CustomizableDashboardGrid
            userId={data.user.id}
            layout={dashboardLayout}
            preferences={dashboardPreferences}
            onLayoutChange={setDashboardLayout}
          />
        ) : (
          <>
            {/* Stats Overview */}
            <DashboardRow>
              <StatsOverview 
                userId={data.user.id}
                onStatsLoad={(stats) => {
                  setData(prev => prev ? { ...prev, stats } : prev);
                }}
              />
            </DashboardRow>

            {/* Main Content Grid */}
            <DashboardGrid>
              {/* Upcoming Events Widget */}
              <DashboardColumn span={2}>
                <DashboardWidget
                  id="upcoming-events"
                  title="Upcoming Events"
                  onRefresh={() => refreshWidget('upcoming-events')}
                  loading={refreshing['upcoming-events']}
                >
                  <UpcomingEvents userId={data.user.id} limit={5} />
                </DashboardWidget>
              </DashboardColumn>

              {/* Recent Activity Widget */}
              <DashboardColumn>
                <DashboardWidget
                  id="recent-activity"
                  title=""
                  onRefresh={() => refreshWidget('recent-activity')}
                  loading={refreshing['recent-activity']}
                >
                  <ActivityFeed userId={data.user.id} limit={5} />
                </DashboardWidget>
              </DashboardColumn>

              {/* Saved Content Widget */}
              <DashboardColumn>
                <DashboardWidget
                  id="saved-content"
                  title=""
                  onRefresh={() => refreshWidget('saved-content')}
                  loading={refreshing['saved-content']}
                >
                  <SavedContent userId={data.user.id} limit={5} showFilters={false} showBulkActions={false} />
                </DashboardWidget>
              </DashboardColumn>

              {/* Content Recommendations Widget */}
              <DashboardColumn>
                <DashboardWidget
                  id="content-recommendations"
                  title=""
                  onRefresh={() => refreshWidget('content-recommendations')}
                  loading={refreshing['content-recommendations']}
                >
                  <ContentRecommendations userId={data.user.id} limit={4} showPreferences={false} />
                </DashboardWidget>
              </DashboardColumn>

              {/* Social Interactions Widget */}
              <DashboardColumn span={2}>
                <DashboardWidget
                  id="social-interactions"
                  title=""
                  onRefresh={() => refreshWidget('social-interactions')}
                  loading={refreshing['social-interactions']}
                >
                  <SocialInteractions 
                    userId={data.user.id} 
                    limit={8} 
                    viewMode="compact"
                    autoRefresh={true}
                  />
                </DashboardWidget>
              </DashboardColumn>

              {/* Network Activity Widget */}
              <DashboardColumn>
                <DashboardWidget
                  id="network-activity"
                  title=""
                  onRefresh={() => refreshWidget('network-activity')}
                  loading={refreshing['network-activity']}
                >
                  <NetworkActivity userId={data.user.id} limit={5} />
                </DashboardWidget>
              </DashboardColumn>

              {/* Connection Recommendations Widget */}
              <DashboardColumn>
                <DashboardWidget
                  id="connection-recommendations"
                  title=""
                  onRefresh={() => refreshWidget('connection-recommendations')}
                  loading={refreshing['connection-recommendations']}
                >
                  <ConnectionRecommendations 
                    userId={data.user.id} 
                    limit={4} 
                    showScores={true}
                    showReasons={true}
                    allowDismiss={true}
                    onConnectionSent={(userId) => {
                      console.log(`Connection request sent to user ${userId}`);
                      // Could trigger a notification or update stats here
                    }}
                  />
                </DashboardWidget>
              </DashboardColumn>
            </DashboardGrid>

            {/* Personal Analytics Section */}
            <DashboardRow>
              <DashboardWidget
                id="personal-analytics"
                title=""
                onRefresh={() => refreshWidget('personal-analytics')}
                loading={refreshing['personal-analytics']}
              >
                <PersonalAnalytics userId={data.user.id} />
              </DashboardWidget>
            </DashboardRow>

            {/* Content Discovery Section */}
            <DashboardRow>
              <DashboardWidget
                id="content-discovery"
                title=""
                onRefresh={() => refreshWidget('content-discovery')}
                loading={refreshing['content-discovery']}
              >
                <ContentDiscovery 
                  userId={data.user.id} 
                  feedType="trending" 
                  limit={6} 
                  showTimeFilter={true} 
                />
              </DashboardWidget>
            </DashboardRow>

            {/* Event Quick Actions */}
            <DashboardRow>
              <DashboardWidget
                id="event-quick-actions"
                title="Event Quick Actions"
              >
                <EventQuickActions userId={data.user.id} />
              </DashboardWidget>
            </DashboardRow>

            {/* Enhanced Quick Actions Panel */}
            <DashboardRow>
              <DashboardWidget
                id="quick-actions"
                title=""
              >
                <QuickActionsPanel
                  userId={data.user.id}
                  showCategories={true}
                  maxActionsPerCategory={6}
                  enableCustomization={true}
                  enableKeyboardShortcuts={true}
                  enableVoiceCommands={true}
                />
              </DashboardWidget>
            </DashboardRow>
          </>
        )}
      </div>

      {/* Dashboard Customizer Modal */}
      {showCustomizer && data?.user?.id && (
        <DashboardCustomizer
          userId={data.user.id}
          isOpen={showCustomizer}
          onClose={() => setShowCustomizer(false)}
          onSave={handleLayoutSave}
        />
      )}
    </NotificationProvider>
  );
}