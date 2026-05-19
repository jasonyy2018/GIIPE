'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  /** Skip Next.js image optimization (serve original file directly) */
  unoptimized?: boolean;
  /** 提前多少像素开始加载（默认50px） */
  rootMargin?: string;
  /** 占位符颜色 */
  placeholderColor?: string;
}

/**
 * 懒加载图片组件
 * 使用 Intersection Observer API 检测图片是否进入视口
 * 只有当图片接近视口时才开始加载
 */
export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  unoptimized = false,
  rootMargin = '50px',
  placeholderColor = 'bg-gray-200',
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 如果设置了priority，立即显示
    if (priority) {
      setIsVisible(true);
      return;
    }
    
    // 如果已经可见，直接返回
    if (isVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, rootMargin, isVisible]);

  return (
    <div
      ref={imgRef}
      className={`relative ${className}`}
      style={{ width, height }}
    >
      {isVisible && !hasError ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`.trim()}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 200px"
          quality={85}
          unoptimized={unoptimized}
        />
      ) : hasError ? (
        <div
          className={`${placeholderColor} flex items-center justify-center text-gray-400 text-xs`}
          style={{ width, height }}
          title={alt}
          aria-label={alt}
        />
      ) : (
        <div
          className={`${placeholderColor} animate-pulse`}
          style={{ width, height }}
          aria-label={`Loading ${alt}`}
        />
      )}
    </div>
  );
}

