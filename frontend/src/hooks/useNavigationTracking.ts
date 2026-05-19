'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recentlyAccessedService } from '@/services/recentlyAccessedService';
import { personalizedNavigationService } from '@/services/personalizedNavigationService';

interface NavigationTrackingOptions {
  trackPageVisits?: boolean;
  trackNavigationClicks?: boolean;
  excludePatterns?: string[];
  pageTitle?: string;
  pageType?: 'event' | 'article' | 'news' | 'user' | 'page';
  pageDescription?: string;
  pageImage?: string;
  pageCategory?: string;
}

export function useNavigationTracking(options: NavigationTrackingOptions = {}) {
  const pathname = usePathname();
  
  const {
    trackPageVisits = true,
    trackNavigationClicks = true,
    excludePatterns = ['/api/', '/auth/', '/_next/', '/favicon', '/robots.txt'],
    pageTitle,
    pageType = 'page',
    pageDescription,
    pageImage,
    pageCategory
  } = options;

  useEffect(() => {
    if (!trackPageVisits) return;

    // Check if current path should be excluded
    const shouldExclude = excludePatterns.some(pattern => pathname.includes(pattern));
    if (shouldExclude) return;

    // Generate page title if not provided
    const title = pageTitle || generatePageTitle(pathname);
    
    // Track the page visit
    recentlyAccessedService.trackPageVisit(
      title,
      pathname,
      pageType,
      {
        description: pageDescription,
        image: pageImage,
        category: pageCategory,
        icon: getPageIcon(pathname)
      }
    );

    // Track navigation item access if it matches a navigation item
    const navigationItemId = getNavigationItemId(pathname);
    if (navigationItemId) {
      personalizedNavigationService.trackItemAccess(navigationItemId);
    }
  }, [pathname, trackPageVisits, pageTitle, pageType, pageDescription, pageImage, pageCategory]);

  const trackCustomPageVisit = (
    title: string,
    url: string,
    type: 'event' | 'article' | 'news' | 'user' | 'page' = 'page',
    options: {
      description?: string;
      image?: string;
      category?: string;
      icon?: string;
    } = {}
  ) => {
    recentlyAccessedService.trackPageVisit(title, url, type, options);
  };

  const trackNavigationItemClick = (itemId: string) => {
    if (trackNavigationClicks) {
      personalizedNavigationService.trackItemAccess(itemId);
    }
  };

  return {
    trackCustomPageVisit,
    trackNavigationItemClick
  };
}

function generatePageTitle(pathname: string): string {
  // Remove leading slash and split by slashes
  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);
  
  if (segments.length === 0) return 'Home';
  
  // Map common paths to readable titles
  const pathTitles: Record<string, string> = {
    'dashboard': 'Dashboard',
    'events': 'Events',
    'news': 'News',
    'bookmarks': 'Bookmarks',
    'messages': 'Messages',
    'profile': 'Profile',
    'settings': 'Settings',
    'search': 'Search',
    'connections': 'Connections',
    'recommendations': 'Recommendations',
    'social': 'Social',
    'mentions': 'Mentions',
    'analytics': 'Analytics'
  };

  // Build title from segments
  const titleParts = segments.map(segment => {
    return pathTitles[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  });

  return titleParts.join(' - ');
}

function getPageIcon(pathname: string): string {
  const iconMap: Record<string, string> = {
    '/dashboard': 'fas fa-tachometer-alt',
    '/events': 'fas fa-calendar',
    '/news': 'fas fa-newspaper',
    '/bookmarks': 'fas fa-bookmark',
    '/messages': 'fas fa-envelope',
    '/profile': 'fas fa-user',
    '/settings': 'fas fa-cog',
    '/search': 'fas fa-search',
    '/connections': 'fas fa-users',
    '/social': 'fas fa-comments',
    '/mentions': 'fas fa-at',
    '/analytics': 'fas fa-chart-line'
  };

  // Check for exact matches first
  if (iconMap[pathname]) {
    return iconMap[pathname];
  }

  // Check for partial matches
  for (const [path, icon] of Object.entries(iconMap)) {
    if (pathname.startsWith(path)) {
      return icon;
    }
  }

  return 'fas fa-file';
}

function getNavigationItemId(pathname: string): string | null {
  const navigationMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/events': 'events',
    '/news': 'news',
    '/bookmarks': 'bookmarks',
    '/messages': 'messages',
    '/profile': 'profile',
    '/settings': 'settings',
    '/search': 'search',
    '/connections': 'connections'
  };

  // Check for exact matches first
  if (navigationMap[pathname]) {
    return navigationMap[pathname];
  }

  // Check for partial matches
  for (const [path, itemId] of Object.entries(navigationMap)) {
    if (pathname.startsWith(path)) {
      return itemId;
    }
  }

  return null;
}