'use client'

import { useEffect } from 'react';

export default function PreloadResources() {
  useEffect(() => {
    // Only preload if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    // Remove API preloading - it's not needed and can slow down initial load
    // Data will be fetched when needed via lazy loading
    
    // DNS prefetch only for production API (if needed)
    // Font Awesome is already loaded via CDN link in layout
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_API_URL) {
      try {
        const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL);
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = `${apiUrl.protocol}//${apiUrl.host}`;
        document.head.appendChild(link);
      } catch (e) {
        // Ignore URL parsing errors
      }
    }

  }, []);

  return null; // This component does not render any content
}
