const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  
  // Performance optimizations
  images: {
    // CRITICAL: disable Next image optimization (server-side fetch) to prevent
    // ETIMEDOUT/EHOSTUNREACH crashes in restricted networks (-> 504).
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/api/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'backend',
        port: '3001',
        pathname: '/api/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'backend',
        port: '3001',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'conference_backend',
        port: '3001',
        pathname: '/api/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'conference_backend',
        port: '3001',
        pathname: '/uploads/**',
      },
      // No external image hosts (unsplash/picsum removed) - unoptimized: true avoids any SSR fetch.
    ],
  },
  
  // Compression
  compress: true,
  
  // Bundle analyzer (enable in development)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
      if (!dev && !isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze/client.html',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
  
  // API rewrites for Docker environment
  async rewrites() {
    // Use server-side environment variable for API rewrites (Docker container name)
    // Priority:
    // 1. SERVER_API_URL (Docker: http://backend:3001)
    // 2. In production Docker, use container name
    // 3. NEXT_PUBLIC_API_URL (for local development)
    // 4. localhost:3001 (fallback)
    let serverApiUrl = process.env.SERVER_API_URL;
    
    // If SERVER_API_URL is not set, try to detect Docker environment
    if (!serverApiUrl) {
      // In Docker production, use container name
      if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL?.includes('localhost')) {
        serverApiUrl = 'http://backend:3001';
      } else {
        serverApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      }
    }
    
    return [
      {
        source: '/api/:path*',
        destination: `${serverApiUrl}/api/:path*`,
      },
    ];
  },

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
    ];
  },
  
  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle splitting (only for production client builds)
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            reuseExistingChunk: true,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
          charts: {
            test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
            name: 'charts',
            chunks: 'all',
            priority: 15,
            reuseExistingChunk: true,
          },
        },
      };
      
      // Tree shaking optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    
    // Resolve optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    return config;
  },
  
  // Output configuration
  output: 'standalone',
  
  // Power by header
  poweredByHeader: false,
  
  // React strict mode
  reactStrictMode: true,
  
  // Enable TypeScript checking during build
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Turbopack configuration (Next.js 16 requires this when a webpack config is present)
  turbopack: {
    // You can add turbopack-specific aliases or rules here if needed
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
}

module.exports = nextConfig