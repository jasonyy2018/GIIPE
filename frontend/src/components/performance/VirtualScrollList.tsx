'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface VirtualScrollItem {
  id: string | number;
  height?: number;
  data: any;
}

export interface VirtualScrollProps<T extends VirtualScrollItem> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;
  className?: string;
  estimatedItemHeight?: number;
  horizontal?: boolean;
  getItemKey?: (item: T, index: number) => string | number;
}

/**
 * Virtual Scroll List Component for Large Data Sets
 * Optimizes rendering performance by only rendering visible items
 */
export default function VirtualScrollList<T extends VirtualScrollItem>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onScroll,
  onItemsRendered,
  className = '',
  estimatedItemHeight = 50,
  horizontal = false,
  getItemKey
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());
  const totalHeightRef = useRef(0);

  // Calculate item heights
  const getItemHeight = useCallback((item: T, index: number): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(item, index);
    }
    return itemHeight;
  }, [itemHeight]);

  // Memoize item positions for performance
  const itemPositions = useMemo(() => {
    const positions: number[] = [];
    let totalHeight = 0;

    for (let i = 0; i < items.length; i++) {
      positions[i] = totalHeight;
      const height = itemHeightsRef.current.get(i) || getItemHeight(items[i], i);
      totalHeight += height;
    }

    totalHeightRef.current = totalHeight;
    return positions;
  }, [items, getItemHeight]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (items.length === 0) {
      return { start: 0, end: 0 };
    }

    const scrollPosition = horizontal ? scrollLeft : scrollTop;
    const containerSize = horizontal ? containerRef.current?.clientWidth || 0 : containerHeight;

    // Binary search for start index
    let start = 0;
    let end = items.length - 1;
    
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      const position = itemPositions[mid];
      
      if (position < scrollPosition) {
        start = mid + 1;
      } else {
        end = mid - 1;
      }
    }
    
    const startIndex = Math.max(0, end - overscan);
    
    // Find end index
    let endIndex = startIndex;
    let currentPosition = itemPositions[startIndex] || 0;
    
    while (endIndex < items.length && currentPosition < scrollPosition + containerSize) {
      const height = itemHeightsRef.current.get(endIndex) || getItemHeight(items[endIndex], endIndex);
      currentPosition += height;
      endIndex++;
    }
    
    endIndex = Math.min(items.length - 1, endIndex + overscan);

    return { start: startIndex, end: endIndex };
  }, [items.length, itemPositions, scrollTop, scrollLeft, containerHeight, overscan, getItemHeight, horizontal]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const newScrollTop = target.scrollTop;
    const newScrollLeft = target.scrollLeft;

    setScrollTop(newScrollTop);
    setScrollLeft(newScrollLeft);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    onScroll?.(newScrollTop, newScrollLeft);
  }, [onScroll]);

  // Notify about rendered items
  useEffect(() => {
    onItemsRendered?.(visibleRange.start, visibleRange.end);
  }, [visibleRange.start, visibleRange.end, onItemsRendered]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const items_to_render = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i >= items.length) break;
      
      const item = items[i];
      const position = itemPositions[i] || 0;
      const height = getItemHeight(item, i);
      
      const style: React.CSSProperties = horizontal ? {
        position: 'absolute',
        left: position,
        width: height,
        height: '100%'
      } : {
        position: 'absolute',
        top: position,
        height: height,
        width: '100%'
      };

      const key = getItemKey ? getItemKey(item, i) : item.id || i;

      items_to_render.push(
        <div key={key} style={style}>
          {renderItem(item, i, style)}
        </div>
      );
    }
    
    return items_to_render;
  }, [visibleRange, items, itemPositions, getItemHeight, renderItem, getItemKey, horizontal]);

  // Scroll to specific item
  const scrollToItem = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!containerRef.current || index < 0 || index >= items.length) {
      return;
    }

    const position = itemPositions[index] || 0;
    const itemSize = getItemHeight(items[index], index);
    const containerSize = horizontal ? containerRef.current.clientWidth : containerRef.current.clientHeight;

    let scrollPosition = position;

    if (align === 'center') {
      scrollPosition = position - (containerSize - itemSize) / 2;
    } else if (align === 'end') {
      scrollPosition = position - containerSize + itemSize;
    }

    scrollPosition = Math.max(0, Math.min(scrollPosition, totalHeightRef.current - containerSize));

    if (horizontal) {
      containerRef.current.scrollLeft = scrollPosition;
    } else {
      containerRef.current.scrollTop = scrollPosition;
    }
  }, [items, itemPositions, getItemHeight, horizontal]);

  // Scroll methods are available via containerRef.current directly
  // No need for useImperativeHandle since component doesn't use forwardRef

  const containerStyle: React.CSSProperties = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative'
  };

  const innerStyle: React.CSSProperties = horizontal ? {
    width: totalHeightRef.current,
    height: '100%',
    position: 'relative'
  } : {
    height: totalHeightRef.current,
    width: '100%',
    position: 'relative'
  };

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={containerStyle}
      onScroll={handleScroll}
    >
      <div className="virtual-scroll-inner" style={innerStyle}>
        {visibleItems}
      </div>
      
      {/* Scrolling indicator */}
      {isScrolling && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
          Scrolling...
        </div>
      )}
    </div>
  );
}

/**
 * Hook for virtual scroll with dynamic item heights
 */
export function useVirtualScroll<T extends VirtualScrollItem>(
  items: T[],
  estimatedItemHeight: number = 50
) {
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const [totalHeight, setTotalHeight] = useState(0);

  const measureItem = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      const newHeights = new Map(prev);
      newHeights.set(index, height);
      return newHeights;
    });
  }, []);

  const getItemHeight = useCallback((index: number): number => {
    return itemHeights.get(index) || estimatedItemHeight;
  }, [itemHeights, estimatedItemHeight]);

  // Calculate total height when item heights change
  useEffect(() => {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i);
    }
    setTotalHeight(total);
  }, [items.length, itemHeights, getItemHeight]);

  return {
    measureItem,
    getItemHeight,
    totalHeight,
    itemHeights
  };
}

/**
 * Virtualized Grid Component
 */
interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  overscan?: number;
  gap?: number;
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  overscan = 5,
  gap = 0
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);
  const totalHeight = rowsCount * (itemHeight + gap) - gap;
  const totalWidth = columnsCount * (itemWidth + gap) - gap;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const endRow = Math.min(
      rowsCount - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
    );
    
    const startCol = Math.max(0, Math.floor(scrollLeft / (itemWidth + gap)) - overscan);
    const endCol = Math.min(
      columnsCount - 1,
      Math.ceil((scrollLeft + containerWidth) / (itemWidth + gap)) + overscan
    );

    return { startRow, endRow, startCol, endCol };
  }, [scrollTop, scrollLeft, containerHeight, containerWidth, itemHeight, itemWidth, gap, overscan, rowsCount, columnsCount]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
  }, []);

  // Render visible items
  const visibleItems = useMemo(() => {
    const items_to_render = [];
    
    for (let row = visibleRange.startRow; row <= visibleRange.endRow; row++) {
      for (let col = visibleRange.startCol; col <= visibleRange.endCol; col++) {
        const index = row * columnsCount + col;
        
        if (index >= items.length) continue;
        
        const item = items[index];
        const x = col * (itemWidth + gap);
        const y = row * (itemHeight + gap);
        
        const style: React.CSSProperties = {
          position: 'absolute',
          left: x,
          top: y,
          width: itemWidth,
          height: itemHeight
        };

        items_to_render.push(
          <div key={index} style={style}>
            {renderItem(item, index, style)}
          </div>
        );
      }
    }
    
    return items_to_render;
  }, [visibleRange, items, columnsCount, itemWidth, itemHeight, gap, renderItem]);

  return (
    <div
      ref={containerRef}
      className="virtual-grid-container"
      style={{
        width: containerWidth,
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        className="virtual-grid-inner"
        style={{
          width: totalWidth,
          height: totalHeight,
          position: 'relative'
        }}
      >
        {visibleItems}
      </div>
    </div>
  );
}