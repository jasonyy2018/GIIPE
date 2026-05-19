import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { LoadingSpinner } from './LoadingStates';

export interface VirtualScrollTableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: number;
  minWidth?: number;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface VirtualScrollTableProps<T> {
  data: T[];
  columns: VirtualScrollTableColumn<T>[];
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  loading?: boolean;
  onRowClick?: (item: T, index: number) => void;
  onSort?: (column: keyof T | string, direction: 'asc' | 'desc') => void;
  sortColumn?: keyof T | string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
  rowClassName?: (item: T, index: number) => string;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

export function VirtualScrollTable<T extends Record<string, any>>({
  data,
  columns,
  itemHeight = 50,
  containerHeight = 400,
  overscan = 5,
  loading = false,
  onRowClick,
  onSort,
  sortColumn,
  sortDirection,
  className = '',
  rowClassName,
  emptyMessage = 'No data available',
  stickyHeader = true,
}: VirtualScrollTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(data.length, start + visibleCount + overscan * 2);
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, data.length]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [data, visibleRange]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Handle sort
  const handleSort = useCallback((column: keyof T | string) => {
    if (!onSort) return;
    
    const newDirection = 
      sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column, newDirection);
  }, [onSort, sortColumn, sortDirection]);

  // Sync header scroll with table scroll
  useEffect(() => {
    const container = containerRef.current;
    const header = headerRef.current;
    
    if (!container || !header) return;

    const syncScroll = () => {
      header.scrollLeft = container.scrollLeft;
    };

    container.addEventListener('scroll', syncScroll);
    return () => container.removeEventListener('scroll', syncScroll);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const totalHeight = data.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div className={`virtual-scroll-table ${className}`}>
      {/* Header */}
      {stickyHeader && (
        <div
          ref={headerRef}
          className="sticky top-0 z-10 bg-white border-b border-gray-200 overflow-hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex min-w-full">
            {columns.map((column, index) => (
              <div
                key={String(column.key)}
                className={`
                  flex items-center px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                  ${column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''}
                  ${index === 0 ? 'sticky left-0 bg-white z-20' : ''}
                `}
                style={{
                  width: column.width || 'auto',
                  minWidth: column.minWidth || 100,
                  flexShrink: 0,
                }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <span>{column.header}</span>
                {column.sortable && sortColumn === column.key && (
                  <span className="ml-1">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Virtual scrolling container */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Total height spacer */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map(({ item, index }) => (
              <div
                key={index}
                className={`
                  flex border-b border-gray-200 hover:bg-gray-50 transition-colors
                  ${onRowClick ? 'cursor-pointer' : ''}
                  ${rowClassName ? rowClassName(item, index) : ''}
                `}
                style={{ height: itemHeight }}
                onClick={() => onRowClick?.(item, index)}
              >
                {columns.map((column, colIndex) => (
                  <div
                    key={String(column.key)}
                    className={`
                      flex items-center px-4 py-2 text-sm text-gray-900
                      ${colIndex === 0 ? 'sticky left-0 bg-white z-10' : ''}
                    `}
                    style={{
                      width: column.width || 'auto',
                      minWidth: column.minWidth || 100,
                      flexShrink: 0,
                    }}
                  >
                    {column.render
                      ? column.render(item, index)
                      : String(item[column.key] || '')
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for virtual scrolling with infinite loading
 */
export function useVirtualScrollInfinite<T>({
  data,
  hasMore,
  loadMore,
  threshold = 5,
}: {
  data: T[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  threshold?: number;
}) {
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const handleScroll = useCallback(
    async (visibleRange: { start: number; end: number }) => {
      if (
        !hasMore ||
        loading ||
        loadingRef.current ||
        data.length - visibleRange.end > threshold
      ) {
        return;
      }

      loadingRef.current = true;
      setLoading(true);

      try {
        await loadMore();
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [data.length, hasMore, loading, loadMore, threshold]
  );

  return {
    loading,
    handleScroll,
  };
}

/**
 * Virtual scroll table with infinite loading
 */
export function InfiniteVirtualScrollTable<T extends Record<string, any>>(
  props: VirtualScrollTableProps<T> & {
    hasMore?: boolean;
    loadMore?: () => Promise<void>;
    loadingMore?: boolean;
  }
) {
  const { hasMore = false, loadMore, loadingMore = false, ...tableProps } = props;
  
  const { loading: infiniteLoading, handleScroll } = useVirtualScrollInfinite({
    data: props.data,
    hasMore,
    loadMore: loadMore || (() => Promise.resolve()),
  });

  // Enhanced scroll handler
  const enhancedHandleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      const containerHeight = e.currentTarget.clientHeight;
      const itemHeight = tableProps.itemHeight || 50;
      
      const visibleStart = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const visibleEnd = visibleStart + visibleCount;

      handleScroll({ start: visibleStart, end: visibleEnd });
    },
    [handleScroll, tableProps.itemHeight]
  );

  return (
    <div className="relative">
      <VirtualScrollTable {...tableProps} />
      
      {/* Loading indicator for infinite scroll */}
      {(infiniteLoading || loadingMore) && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-4 bg-white bg-opacity-90">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-600">Loading more...</span>
        </div>
      )}
    </div>
  );
}