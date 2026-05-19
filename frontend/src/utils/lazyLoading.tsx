import React, { Suspense, ComponentType } from 'react';
import { LoadingSpinner } from '../components/admin/ui/LoadingStates';

/**
 * Higher-order component for lazy loading with custom loading state
 */
export function withLazyLoading<T extends Record<string, any>>(
  Component: React.LazyExoticComponent<ComponentType<T>>,
  fallback?: React.ReactNode
) {
  return function LazyComponent(props: T) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <Component {...(props as any)} />
      </Suspense>
    );
  };
}

/**
 * Create a lazy-loaded component with error boundary
 */
export function createLazyComponent<T extends {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = React.lazy(importFn);
  return withLazyLoading(LazyComponent, fallback);
}

/**
 * Preload a lazy component
 */
export function preloadComponent(importFn: () => Promise<any>) {
  const componentImport = importFn();
  return componentImport;
}

/**
 * Lazy loading with retry mechanism
 */
export function createRetryableLazyComponent<T extends {}>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  maxRetries: number = 3,
  fallback?: React.ReactNode
) {
  const retryImport = async (retryCount = 0): Promise<{ default: ComponentType<T> }> => {
    try {
      return await importFn();
    } catch (error) {
      if (retryCount < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return retryImport(retryCount + 1);
      }
      throw error;
    }
  };

  const LazyComponent = React.lazy(retryImport);
  return withLazyLoading(LazyComponent, fallback);
}

/**
 * Component preloader for predictive loading
 */
export class ComponentPreloader {
  private static preloadedComponents = new Set<string>();
  private static preloadPromises = new Map<string, Promise<any>>();

  static preload(key: string, importFn: () => Promise<any>) {
    if (this.preloadedComponents.has(key)) {
      return this.preloadPromises.get(key);
    }

    const promise = importFn().then(module => {
      this.preloadedComponents.add(key);
      return module;
    });

    this.preloadPromises.set(key, promise);
    return promise;
  }

  static isPreloaded(key: string): boolean {
    return this.preloadedComponents.has(key);
  }

  static getPreloadPromise(key: string): Promise<any> | undefined {
    return this.preloadPromises.get(key);
  }

  static clear() {
    this.preloadedComponents.clear();
    this.preloadPromises.clear();
  }
}

/**
 * Hook for intersection observer based lazy loading
 */
export function useIntersectionObserver(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const [ref, setRef] = React.useState<Element | null>(null);

  React.useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(ref);

    return () => observer.disconnect();
  }, [ref, callback, options]);

  return setRef;
}

/**
 * Lazy component with intersection observer
 */
export function LazyIntersectionComponent<T extends Record<string, any>>({
  importFn,
  fallback,
  ...props
}: {
  importFn: () => Promise<{ default: ComponentType<T> }>;
  fallback?: React.ReactNode;
} & T) {
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [Component, setComponent] = React.useState<ComponentType<T> | null>(null);

  const observerRef = useIntersectionObserver(() => {
    setShouldLoad(true);
  });

  React.useEffect(() => {
    if (shouldLoad && !Component) {
      importFn().then(module => {
        setComponent(() => module.default);
      });
    }
  }, [shouldLoad, Component, importFn]);

  if (!shouldLoad) {
    return <div ref={observerRef} style={{ minHeight: '200px' }} />;
  }

  if (!Component) {
    return fallback || <LoadingSpinner />;
  }

  return <Component {...(props as unknown as T)} />;
}