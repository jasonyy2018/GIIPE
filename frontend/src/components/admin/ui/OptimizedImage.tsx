import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useIntersectionObserver } from '../../../utils/lazyLoading';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  lazyLoad?: boolean;
  threshold?: number;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  loading = 'lazy',
  onLoad,
  onError,
  fallbackSrc = '/images/placeholder.png',
  lazyLoad = true,
  threshold = 0.1,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazyLoad || priority);
  const imageRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading
  const observerRef = useIntersectionObserver(
    () => setShouldLoad(true),
    { threshold }
  );

  // Set ref for intersection observer
  useEffect(() => {
    if (imageRef.current && lazyLoad && !priority) {
      observerRef(imageRef.current);
    }
  }, [observerRef, lazyLoad, priority]);

  // Handle image load
  const handleLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setImageError(true);
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
    onError?.();
  };

  // Generate blur placeholder
  const generateBlurDataURL = (width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, width, height);
    }
    return canvas.toDataURL();
  };

  // Auto-generate blur placeholder if not provided
  const effectiveBlurDataURL = blurDataURL || 
    (placeholder === 'blur' && width && height 
      ? generateBlurDataURL(Math.min(width, 40), Math.min(height, 40))
      : undefined);

  // Responsive sizes based on common breakpoints
  const responsiveSizes = sizes || `
    (max-width: 640px) 100vw,
    (max-width: 768px) 50vw,
    (max-width: 1024px) 33vw,
    25vw
  `;

  if (!shouldLoad) {
    return (
      <div
        ref={imageRef}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{
          width: width || '100%',
          height: height || '200px',
          aspectRatio: width && height ? `${width}/${height}` : undefined,
        }}
      />
    );
  }

  return (
    <div
      ref={imageRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: fill ? '100%' : width,
        height: fill ? '100%' : height,
      }}
    >
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ zIndex: 1 }}
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Error placeholder */}
      {imageError && imageSrc === fallbackSrc && (
        <div
          className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400"
          style={{ zIndex: 1 }}
        >
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* Actual image */}
      <Image
        src={imageSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={effectiveBlurDataURL}
        sizes={responsiveSizes}
        className={`transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          objectFit: fill ? objectFit : undefined,
          objectPosition: fill ? objectPosition : undefined,
        }}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

/**
 * Optimized avatar component
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className = '',
  fallbackInitials,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: number;
  fallbackInitials?: string;
}) {
  const [showFallback, setShowFallback] = useState(false);

  if (showFallback || !src) {
    return (
      <div
        className={`
          flex items-center justify-center bg-gray-300 text-gray-600 font-medium rounded-full
          ${className}
        `}
        style={{ width: size, height: size }}
      >
        {fallbackInitials || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      {...props}
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={() => setShowFallback(true)}
    />
  );
}

/**
 * Gallery component with optimized images
 */
export function OptimizedImageGallery({
  images,
  columns = 3,
  gap = 4,
  className = '',
  onImageClick,
}: {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  columns?: number;
  gap?: number;
  className?: string;
  onImageClick?: (image: any, index: number) => void;
}) {
  return (
    <div
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {images.map((image, index) => (
        <div
          key={index}
          className="aspect-square cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onImageClick?.(image, index)}
        >
          <OptimizedImage
            {...image}
            fill
            className="rounded-lg"
            sizes={`(max-width: 768px) ${100 / Math.min(columns, 2)}vw, ${100 / columns}vw`}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Progressive image loading hook
 */
export function useProgressiveImage(src: string, placeholderSrc?: string) {
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setCurrentSrc(src);
      setLoading(false);
    };
    img.src = src;
  }, [src]);

  return { src: currentSrc, loading };
}