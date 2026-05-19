import { createLazyComponent, ComponentPreloader } from '../../utils/lazyLoading';
import { LoadingSpinner, Skeleton } from './ui/LoadingStates';

// Create skeleton components
const SkeletonCard = () => (
  <div className="bg-white p-6 rounded-lg border border-gray-200">
    <Skeleton className="h-4 w-1/3 mb-4" />
    <Skeleton className="h-8 w-1/2 mb-2" />
    <Skeleton className="h-3 w-full" />
  </div>
);

const SkeletonTable = () => (
  <div className="bg-white rounded-lg border border-gray-200">
    <div className="p-4 border-b">
      <Skeleton className="h-6 w-1/4" />
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 w-1/6" />
        </div>
      ))}
    </div>
  </div>
);

// Lazy load admin components with appropriate fallbacks

// Dashboard Components
export const LazyDashboardMetrics = createLazyComponent(
  () => import('./DashboardMetrics'),
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const LazySystemHealthMonitor = createLazyComponent(
  () => import('./SystemHealthDashboard'),
  <SkeletonCard />
);

export const LazyRealtimeMetrics = createLazyComponent(
  () => import('./RealTimeMetricsCard'),
  <SkeletonCard />
);

// User Management Components
export const LazyUserManagementTable = createLazyComponent(
  () => import('./EnhancedUserList'),
  <SkeletonTable />
);

export const LazyBulkUserOperations = createLazyComponent(
  () => import('./BulkUserOperations'),
  <SkeletonCard />
);

export const LazyUserProfileModal = createLazyComponent(
  () => import('./UserProfileModal'),
  <LoadingSpinner />
);

// Content Moderation Components
export const LazyModerationQueue = createLazyComponent(
  () => import('./ModerationQueue'),
  <SkeletonTable />
);

export const LazySensitiveWordManager = createLazyComponent(
  () => import('./SensitiveWordManager'),
  <SkeletonCard />
);

export const LazyContentModerationTools = createLazyComponent(
  () => import('./ModerationQueue'),
  <SkeletonCard />
);

// Event Management Components
export const LazyEventManagementInterface = createLazyComponent(
  () => import('./EventWorkflowManager'),
  <SkeletonTable />
);

export const LazyEventAnalytics = createLazyComponent(
  () => import('./EventAnalyticsDashboard'),
  <SkeletonCard />
);

export const LazyEventRegistrationManager = createLazyComponent(
  () => import('./EventRegistrationManager'),
  <SkeletonTable />
);

// Analytics Components
export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('./InteractiveAnalyticsDashboard'),
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const LazyReportGenerator = createLazyComponent(
  () => import('./ReportGenerator'),
  <SkeletonCard />
);

export const LazyCustomizableDashboard = createLazyComponent(
  () => import('./CustomizableDashboard'),
  <SkeletonCard />
);

// System Configuration Components
export const LazySystemSettings = createLazyComponent(
  () => import('./SystemSettingsManager'),
  <SkeletonCard />
);

export const LazyMaintenanceTools = createLazyComponent(
  () => import('./SystemMaintenanceTools'),
  <SkeletonCard />
);

// Security Components
export const LazySecurityMonitoringDashboard = createLazyComponent(
  () => import('./SecurityMonitoringDashboard'),
  <SkeletonCard />
);

export const LazyAuditLogViewer = createLazyComponent(
  () => import('./AuditLogInterface'),
  <SkeletonTable />
);

export const LazySecurityAlertSystem = createLazyComponent(
  () => import('./SecurityAlertSystem'),
  <SkeletonCard />
);

// Notification Components
export const LazyNotificationCenter = createLazyComponent(
  () => import('./NotificationCenter'),
  <SkeletonCard />
);

export const LazyNotificationPreferences = createLazyComponent(
  () => import('./NotificationPreferences'),
  <SkeletonCard />
);

// UI Components
export const LazyInteractiveChart = createLazyComponent(
  () => import('./ui/InteractiveChart'),
  <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
);

export const LazyDataTable = createLazyComponent(
  () => import('./DataTable'),
  <SkeletonTable />
);

/**
 * Preload critical admin components
 */
export function preloadCriticalComponents() {
  // Preload dashboard components (most likely to be accessed first)
  ComponentPreloader.preload('dashboard-metrics', () => import('./DashboardMetrics'));
  ComponentPreloader.preload('system-health', () => import('./SystemHealthDashboard'));
  ComponentPreloader.preload('realtime-metrics', () => import('./RealTimeMetricsCard'));
  
  // Preload user management (second most common)
  ComponentPreloader.preload('user-table', () => import('./EnhancedUserList'));
}

/**
 * Preload components based on user role and permissions
 */
export function preloadByRole(userRole: string, permissions: string[]) {
  if (userRole === 'ADMIN') {
    // Preload all admin components
    ComponentPreloader.preload('security-dashboard', () => import('./SecurityMonitoringDashboard'));
    ComponentPreloader.preload('audit-logs', () => import('./AuditLogInterface'));
    ComponentPreloader.preload('system-settings', () => import('./SystemSettingsManager'));
  }
  
  if (permissions.includes('MANAGE_USERS')) {
    ComponentPreloader.preload('user-management', () => import('./EnhancedUserList'));
    ComponentPreloader.preload('bulk-operations', () => import('./BulkUserOperations'));
  }
  
  if (permissions.includes('MODERATE_CONTENT')) {
    ComponentPreloader.preload('moderation-queue', () => import('./ModerationQueue'));
    ComponentPreloader.preload('sensitive-words', () => import('./SensitiveWordManager'));
  }
  
  if (permissions.includes('MANAGE_EVENTS')) {
    ComponentPreloader.preload('event-management', () => import('./EventWorkflowManager'));
    ComponentPreloader.preload('event-analytics', () => import('./EventAnalyticsDashboard'));
  }
}

/**
 * Preload components based on navigation patterns
 */
export function preloadByNavigation(currentPath: string) {
  const pathPreloadMap: Record<string, () => void> = {
    '/admin/dashboard': () => {
      ComponentPreloader.preload('user-table', () => import('./EnhancedUserList'));
      ComponentPreloader.preload('analytics', () => import('./InteractiveAnalyticsDashboard'));
    },
    '/admin/users': () => {
      ComponentPreloader.preload('bulk-operations', () => import('./BulkUserOperations'));
      ComponentPreloader.preload('user-profile', () => import('./UserProfileModal'));
    },
    '/admin/moderation': () => {
      ComponentPreloader.preload('sensitive-words', () => import('./SensitiveWordManager'));
      ComponentPreloader.preload('content-tools', () => import('./ModerationQueue'));
    },
    '/admin/events': () => {
      ComponentPreloader.preload('event-analytics', () => import('./EventAnalyticsDashboard'));
      ComponentPreloader.preload('registration-manager', () => import('./EventRegistrationManager'));
    },
    '/admin/analytics': () => {
      ComponentPreloader.preload('report-generator', () => import('./ReportGenerator'));
      ComponentPreloader.preload('custom-dashboard', () => import('./CustomizableDashboard'));
    },
    '/admin/security': () => {
      ComponentPreloader.preload('audit-logs', () => import('./AuditLogInterface'));
      ComponentPreloader.preload('security-alerts', () => import('./SecurityAlertSystem'));
    },
  };

  const preloadFn = pathPreloadMap[currentPath];
  if (preloadFn) {
    // Delay preloading to avoid blocking current page
    setTimeout(preloadFn, 100);
  }
}

/**
 * Hook for intelligent component preloading
 */
export function useIntelligentPreloading() {
  React.useEffect(() => {
    // Preload critical components on mount
    preloadCriticalComponents();
    
    // Preload based on user interaction patterns
    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href^="/admin/"]');
      
      if (link) {
        const href = link.getAttribute('href');
        if (href) {
          preloadByNavigation(href);
        }
      }
    };

    // Add hover listeners for predictive loading
    document.addEventListener('mouseenter', handleMouseEnter, true);
    
    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
    };
  }, []);
}

/**
 * Component for managing lazy loading state
 */
export function LazyLoadingManager({ 
  children,
  userRole,
  permissions,
  currentPath 
}: {
  children: React.ReactNode;
  userRole?: string;
  permissions?: string[];
  currentPath?: string;
}) {
  useIntelligentPreloading();
  
  React.useEffect(() => {
    if (userRole && permissions) {
      preloadByRole(userRole, permissions);
    }
  }, [userRole, permissions]);
  
  React.useEffect(() => {
    if (currentPath) {
      preloadByNavigation(currentPath);
    }
  }, [currentPath]);
  
  return <>{children}</>;
}

// Import React for hooks
import React from 'react';