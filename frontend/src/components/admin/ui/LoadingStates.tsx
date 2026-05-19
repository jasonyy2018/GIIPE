'use client';

import { ReactNode } from 'react';
import { useReducedMotion } from '../AccessibilityUtils';

// Skeleton Components
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

export function Skeleton({ 
  className = '', 
  width, 
  height, 
  rounded = false, 
  animate = true 
}: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`
        bg-gray-200 
        ${shouldAnimate ? 'animate-pulse' : ''}
        ${rounded ? 'rounded-full' : 'rounded'}
        ${className}
      `}
      style={style}
      aria-hidden="true"
    />
  );
}

// Card Skeleton
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="space-y-4">
        <Skeleton height={20} width="60%" />
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="80%" />
        <div className="flex space-x-2 mt-4">
          <Skeleton height={32} width={80} />
          <Skeleton height={32} width={80} />
        </div>
      </div>
    </div>
  );
}

// Table Skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className = '' }: TableSkeletonProps) {
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} height={16} width={`${Math.random() * 40 + 60}px`} />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  height={16} 
                  width={`${Math.random() * 60 + 40}px`} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="space-y-4">
        <Skeleton height={20} width="40%" />
        <div className="h-64 bg-gray-100 rounded flex items-end justify-between p-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton 
              key={i} 
              width={24} 
              height={Math.random() * 150 + 50} 
              className="bg-gray-300"
            />
          ))}
        </div>
        <div className="flex justify-between">
          <Skeleton height={12} width={60} />
          <Skeleton height={12} width={60} />
        </div>
      </div>
    </div>
  );
}

// List Skeleton
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export function ListSkeleton({ items = 5, showAvatar = false, className = '' }: ListSkeletonProps) {
  return (
    <div className={`bg-white rounded-lg shadow divide-y divide-gray-200 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-4 flex items-center space-x-4">
          {showAvatar && <Skeleton width={40} height={40} rounded />}
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="60%" />
            <Skeleton height={14} width="40%" />
          </div>
          <Skeleton height={32} width={80} />
        </div>
      ))}
    </div>
  );
}

// Loading Spinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'text-primary', 
  className = '' 
}: LoadingSpinnerProps) {
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  if (prefersReducedMotion) {
    return (
      <div className={`${sizeClasses[size]} ${color} ${className}`}>
        <i className="fas fa-circle-notch" aria-hidden="true" />
      </div>
    );
  }

  return (
    <svg
      className={`${sizeClasses[size]} ${color} animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Loading Overlay
interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  message = 'Loading...', 
  className = '' 
}: LoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Progress Bar
interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({ 
  value, 
  max = 100, 
  size = 'md', 
  color = 'primary', 
  showLabel = false, 
  label,
  className = '' 
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  };

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {label || `${Math.round(percentage)}%`}
          </span>
          {showLabel && !label && (
            <span className="text-sm text-gray-500">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

// Pulse Loading
interface PulseLoadingProps {
  lines?: number;
  className?: string;
}

export function PulseLoading({ lines = 3, className = '' }: PulseLoadingProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton height={16} width={`${Math.random() * 40 + 60}%`} />
        </div>
      ))}
    </div>
  );
}