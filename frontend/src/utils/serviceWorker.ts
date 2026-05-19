// Service Worker registration and management utilities

export interface ServiceWorkerConfig {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(config?: ServiceWorkerConfig) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available
              console.log('New content available, please refresh');
              config?.onUpdate?.(registration);
            } else {
              // Content is cached for offline use
              console.log('Content is cached for offline use');
              config?.onSuccess?.(registration);
            }
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    config?.onError?.(error as Error);
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    console.log('Service Worker unregistered');
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
  }
}

/**
 * Update service worker
 */
export async function updateServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log('Service Worker update triggered');
  } catch (error) {
    console.error('Service Worker update failed:', error);
  }
}

/**
 * Skip waiting for new service worker
 */
export async function skipWaiting() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Send message to service worker
 */
export function sendMessageToServiceWorker(message: any) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

/**
 * Clear all caches via service worker
 */
export function clearServiceWorkerCaches() {
  sendMessageToServiceWorker({ type: 'CLEAR_CACHE' });
}

/**
 * Send performance metrics to service worker
 */
export function sendPerformanceMetrics(metrics: any) {
  sendMessageToServiceWorker({
    type: 'PERFORMANCE_METRICS',
    metrics,
  });
}

/**
 * Check if app is running in standalone mode (PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if service worker is supported and active
 */
export function isServiceWorkerActive(): boolean {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  return navigator.serviceWorker.controller !== null;
}

/**
 * Get service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

/**
 * Hook for service worker management
 */
export function useServiceWorker(config?: ServiceWorkerConfig) {
  const [isActive, setIsActive] = React.useState(false);
  const [hasUpdate, setHasUpdate] = React.useState(false);
  const [registration, setRegistration] = React.useState<ServiceWorkerRegistration | null>(null);

  React.useEffect(() => {
    const register = async () => {
      const reg = await registerServiceWorker({
        ...config,
        onUpdate: (registration) => {
          setHasUpdate(true);
          config?.onUpdate?.(registration);
        },
        onSuccess: (registration) => {
          setIsActive(true);
          setRegistration(registration);
          config?.onSuccess?.(registration);
        },
      });
      
      if (reg) {
        setRegistration(reg);
        setIsActive(isServiceWorkerActive());
      }
    };

    register();
  }, []);

  const update = React.useCallback(async () => {
    if (registration) {
      await registration.update();
    }
  }, [registration]);

  const skipWaitingAndReload = React.useCallback(async () => {
    await skipWaiting();
    window.location.reload();
  }, []);

  return {
    isActive,
    hasUpdate,
    registration,
    update,
    skipWaitingAndReload,
    clearCaches: clearServiceWorkerCaches,
    sendMetrics: sendPerformanceMetrics,
  };
}

/**
 * Service worker update notification component
 */
export function ServiceWorkerUpdateNotification() {
  const { hasUpdate, skipWaitingAndReload } = useServiceWorker();

  if (!hasUpdate) return null;

  return React.createElement('div', {
    className: "fixed bottom-4 right-4 bg-primary text-white p-4 rounded-lg shadow-lg z-50"
  }, React.createElement('div', {
    className: "flex items-center space-x-3"
  }, [
    React.createElement('div', { key: 'content' }, [
      React.createElement('p', { 
        key: 'title',
        className: "font-medium" 
      }, "New version available!"),
      React.createElement('p', { 
        key: 'subtitle',
        className: "text-sm opacity-90" 
      }, "Click to update and reload")
    ]),
    React.createElement('button', {
      key: 'button',
      onClick: skipWaitingAndReload,
      className: "bg-white text-primary px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
    }, "Update")
  ]));
}

// Import React for hooks
import React from 'react';