'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface LazyLoadSectionProps {
  children: ReactNode;
  /** 提前多少像素开始加载（默认200px） */
  rootMargin?: string;
  /** 是否立即加载（用于首屏内容） */
  eager?: boolean;
  /** 加载时的占位符 */
  placeholder?: ReactNode;
  /** 最小高度（避免布局抖动） */
  minHeight?: string;
  /** 加载完成回调 */
  onLoad?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 懒加载区域组件
 * 使用 Intersection Observer API 检测元素是否进入视口
 * 只有当元素接近视口时才开始渲染内容
 */
export default function LazyLoadSection({
  children,
  rootMargin = '200px',
  eager = false,
  placeholder,
  minHeight,
  onLoad,
  className = '',
}: LazyLoadSectionProps) {
  const [isVisible, setIsVisible] = useState(eager);
  const [hasLoaded, setHasLoaded] = useState(eager);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 如果设置为立即加载，确保立即显示
    if (eager) {
      setIsVisible(true);
      setHasLoaded(true);
      onLoad?.();
      return;
    }

    // 如果已经加载，直接返回
    if (hasLoaded) {
      return;
    }

    // Ensure we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    // Check if IntersectionObserver is available
    if (!('IntersectionObserver' in window)) {
      // Fallback: if IntersectionObserver is not available, show content immediately
      setIsVisible(true);
      setHasLoaded(true);
      onLoad?.();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // 延迟设置hasLoaded，确保内容已渲染
            setTimeout(() => {
              setHasLoaded(true);
              onLoad?.();
            }, 100);
            // 一旦加载，就不再需要观察
            observer.disconnect();
          }
        });
      },
      {
        rootMargin, // 提前加载的距离
        threshold: 0.01, // 只要1%可见就触发
      }
    );

    // Check immediately if element is already in viewport (before observer is set up)
    // This handles the case where the element is already visible on first load
    if (sectionRef.current) {
      // Use a small delay to ensure DOM is ready
      const checkImmediately = () => {
        if (sectionRef.current) {
          const rect = sectionRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight || document.documentElement.clientHeight;
          const windowWidth = window.innerWidth || document.documentElement.clientWidth;
          
          // Check if element is in viewport (with rootMargin consideration)
          const rootMarginValue = parseInt(rootMargin) || 200;
          const isInViewport = (
            rect.top < windowHeight + rootMarginValue &&
            rect.bottom > -rootMarginValue &&
            rect.left < windowWidth + rootMarginValue &&
            rect.right > -rootMarginValue
          );
          
          if (isInViewport) {
            setIsVisible(true);
            setTimeout(() => {
              setHasLoaded(true);
              onLoad?.();
            }, 100);
            return; // Don't set up observer if already visible
          }
        }
        
        // If not in viewport, set up observer
        if (sectionRef.current) {
          observer.observe(sectionRef.current);
        }
      };
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        checkImmediately();
      });
    }

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, eager, hasLoaded, onLoad]);

  // 默认占位符
  const defaultPlaceholder = (
    <div 
      style={{ minHeight: minHeight || '200px' }}
      className="flex items-center justify-center"
    >
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  );

  return (
    <div ref={sectionRef} className={className}>
      {isVisible ? (
        <div style={{ minHeight: minHeight }}>
          {children}
        </div>
      ) : (
        <div style={{ minHeight: minHeight || '200px' }}>
          {placeholder || defaultPlaceholder}
        </div>
      )}
    </div>
  );
}

