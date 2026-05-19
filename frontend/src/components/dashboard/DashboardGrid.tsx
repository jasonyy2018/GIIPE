'use client';

import { ReactNode } from 'react';

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export default function DashboardGrid({ children, className = '' }: DashboardGridProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ${className}`}>
      {children}
    </div>
  );
}

export function DashboardRow({ children, className = '' }: DashboardGridProps) {
  return (
    <div className={`col-span-full ${className}`}>
      {children}
    </div>
  );
}

export function DashboardColumn({ children, className = '', span = 1 }: DashboardGridProps & { span?: number }) {
  const spanClass = {
    1: 'col-span-1',
    2: 'lg:col-span-2',
    3: 'xl:col-span-3',
    'full': 'col-span-full'
  };

  return (
    <div className={`${spanClass[span as keyof typeof spanClass] || 'col-span-1'} ${className}`}>
      {children}
    </div>
  );
}