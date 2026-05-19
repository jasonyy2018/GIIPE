'use client';

import { ReactNode, useState, useEffect } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

interface BreakpointInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  width: number;
  height: number;
}

export const useBreakpoint = (): BreakpointInfo => {
  const [breakpoint, setBreakpoint] = useState<BreakpointInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setBreakpoint({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024 && width < 1280,
        isLargeDesktop: width >= 1280,
        width,
        height,
      });
    };

    // Initial check
    updateBreakpoint();

    // Add event listener
    window.addEventListener('resize', updateBreakpoint);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
};

export default function ResponsiveContainer({ children, className = '' }: ResponsiveContainerProps) {
  const breakpoint = useBreakpoint();

  return (
    <div 
      className={`responsive-container ${className}`}
      data-mobile={breakpoint.isMobile}
      data-tablet={breakpoint.isTablet}
      data-desktop={breakpoint.isDesktop}
      data-large-desktop={breakpoint.isLargeDesktop}
    >
      {children}
    </div>
  );
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    largeDesktop?: number;
  };
  gap?: string;
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { mobile: 1, tablet: 2, desktop: 3, largeDesktop: 4 },
  gap = 'gap-4',
  className = ''
}: ResponsiveGridProps) {
  const gridCols = `
    grid-cols-${cols.mobile || 1}
    md:grid-cols-${cols.tablet || 2}
    lg:grid-cols-${cols.desktop || 3}
    xl:grid-cols-${cols.largeDesktop || 4}
  `;

  return (
    <div className={`grid ${gridCols} ${gap} ${className}`}>
      {children}
    </div>
  );
}

// Responsive Stack Component
interface ResponsiveStackProps {
  children: ReactNode;
  direction?: {
    mobile?: 'row' | 'col';
    tablet?: 'row' | 'col';
    desktop?: 'row' | 'col';
  };
  gap?: string;
  className?: string;
}

export function ResponsiveStack({ 
  children, 
  direction = { mobile: 'col', tablet: 'row', desktop: 'row' },
  gap = 'gap-4',
  className = ''
}: ResponsiveStackProps) {
  const flexDirection = `
    flex-${direction.mobile || 'col'}
    md:flex-${direction.tablet || 'row'}
    lg:flex-${direction.desktop || 'row'}
  `;

  return (
    <div className={`flex ${flexDirection} ${gap} ${className}`}>
      {children}
    </div>
  );
}