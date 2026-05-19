'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: string;
  isActive?: boolean;
}

interface BreadcrumbNavigationProps {
  customItems?: BreadcrumbItem[];
  showHome?: boolean;
  maxItems?: number;
  className?: string;
}

export default function BreadcrumbNavigation({ 
  customItems, 
  showHome = true, 
  maxItems = 5,
  className = '' 
}: BreadcrumbNavigationProps) {
  const pathname = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    if (customItems) {
      setBreadcrumbs(customItems);
      return;
    }

    // Generate breadcrumbs from pathname
    const pathSegments = pathname.split('/').filter(segment => segment !== '');
    const items: BreadcrumbItem[] = [];

    if (showHome) {
      items.push({
        label: 'Home',
        href: '/dashboard',
        icon: 'fas fa-home'
      });
    }

    // Map path segments to readable labels
    const segmentLabels: Record<string, { label: string; icon?: string }> = {
      'dashboard': { label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
      'events': { label: 'Events', icon: 'fas fa-calendar' },
      'news': { label: 'News', icon: 'fas fa-newspaper' },
      'bookmarks': { label: 'Bookmarks', icon: 'fas fa-bookmark' },
      'messages': { label: 'Messages', icon: 'fas fa-envelope' },
      'profile': { label: 'Profile', icon: 'fas fa-user' },
      'settings': { label: 'Settings', icon: 'fas fa-cog' },
      'search': { label: 'Search', icon: 'fas fa-search' },
      'connections': { label: 'Connections', icon: 'fas fa-users' },
      'recommendations': { label: 'Recommendations', icon: 'fas fa-lightbulb' },
      'social': { label: 'Social', icon: 'fas fa-comments' },
      'mentions': { label: 'Mentions', icon: 'fas fa-at' },
      'analytics': { label: 'Analytics', icon: 'fas fa-chart-line' }
    };

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const segmentInfo = segmentLabels[segment];
      
      items.push({
        label: segmentInfo?.label || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
        icon: segmentInfo?.icon,
        isActive: index === pathSegments.length - 1
      });
    });

    // Limit breadcrumbs if maxItems is specified
    if (items.length > maxItems) {
      const truncatedItems = [
        items[0], // Always keep home
        {
          label: '...',
          href: '#',
          icon: 'fas fa-ellipsis-h'
        },
        ...items.slice(-2) // Keep last 2 items
      ];
      setBreadcrumbs(truncatedItems);
    } else {
      setBreadcrumbs(items);
    }
  }, [pathname, customItems, showHome, maxItems]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav 
      className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`}
      aria-label="Breadcrumb navigation"
    >
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <i className="fas fa-chevron-right text-gray-400 mx-2 text-xs"></i>
            )}
            
            {item.href === '#' ? (
              <span className="text-gray-400 flex items-center">
                {item.icon && <i className={`${item.icon} mr-1`}></i>}
                {item.label}
              </span>
            ) : item.isActive ? (
              <span 
                className="text-primary font-medium flex items-center"
                aria-current="page"
              >
                {item.icon && <i className={`${item.icon} mr-1`}></i>}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-gray-600 hover:text-primary transition-colors flex items-center"
              >
                {item.icon && <i className={`${item.icon} mr-1`}></i>}
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}