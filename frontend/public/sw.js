// Service Worker for performance optimization and caching

const CACHE_NAME = 'admin-interface-v1';
const STATIC_CACHE_NAME = 'static-v1';
const DYNAMIC_CACHE_NAME = 'dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/admin/dashboard',
  '/manifest.json',
  // Add critical CSS and JS files here
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/admin/dashboard/metrics',
  '/api/admin/users/stats',
  '/api/admin/events/stats',
  '/api/admin/system/health',
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine caching strategy based on request type
  let strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  
  if (isStaticAsset(url)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
  } else if (isAPIRequest(url)) {
    if (isCacheableAPI(url.pathname)) {
      strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
    } else {
      strategy = CACHE_STRATEGIES.NETWORK_ONLY;
    }
  } else if (isAdminPage(url)) {
    strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  event.respondWith(handleRequest(request, strategy));
});

// Handle requests based on caching strategy
async function handleRequest(request, strategy) {
  const url = new URL(request.url);
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);
    
    case CACHE_STRATEGIES.CACHE_ONLY:
      return caches.match(request);
    
    default:
      return networkFirst(request);
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(getCacheName(request));
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first failed:', error);
    return new Response('Network error', { status: 408 });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(getCacheName(request));
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Network error and no cache available', { status: 408 });
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // Start network request in background
  const networkResponsePromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(getCacheName(request));
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.error('Background fetch failed:', error);
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cache, wait for network
  return networkResponsePromise;
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/);
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isCacheableAPI(pathname) {
  return CACHEABLE_APIS.some(api => pathname.startsWith(api));
}

function isAdminPage(url) {
  return url.pathname.startsWith('/admin/');
}

function getCacheName(request) {
  const url = new URL(request.url);
  
  if (isStaticAsset(url)) {
    return STATIC_CACHE_NAME;
  }
  
  return DYNAMIC_CACHE_NAME;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline actions when connection is restored
  console.log('Background sync triggered');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: data.data,
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action) {
    // Handle action clicks
    handleNotificationAction(event.action, event.notification.data);
  } else {
    // Handle notification click
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/admin/dashboard')
    );
  }
});

function handleNotificationAction(action, data) {
  switch (action) {
    case 'view':
      clients.openWindow(data?.url || '/admin/dashboard');
      break;
    case 'dismiss':
      // Just close the notification
      break;
    default:
      console.log('Unknown notification action:', action);
  }
}

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_METRICS') {
    // Store performance metrics for later analysis
    storePerformanceMetrics(event.data.metrics);
  }
});

async function storePerformanceMetrics(metrics) {
  try {
    const cache = await caches.open('performance-metrics');
    const key = `metrics-${Date.now()}`;
    const response = new Response(JSON.stringify(metrics));
    await cache.put(key, response);
  } catch (error) {
    console.error('Failed to store performance metrics:', error);
  }
}

// Cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearCaches());
  }
});

async function clearCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('All caches cleared');
}