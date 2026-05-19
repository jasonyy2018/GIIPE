import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import PreloadResources from '@/components/performance/PreloadResources'
import GlobalErrorHandler from '@/components/error/GlobalErrorHandler'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://giip.info'),
  title: 'Global Innovation and Intellectual Property (GIIP) - IP Conferences & Events',
  description: 'Leading platform for IP professionals, researchers, and policymakers. Discover conferences, events, and latest news in intellectual property and innovation.',
  keywords: 'intellectual property, innovation, GIIP, IP conferences, patent, trademark, copyright, global innovation, IP policy',
  authors: [{ name: 'Global Innovation and Intellectual Property' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Global Innovation and Intellectual Property (GIIP)',
    description: 'Leading platform for IP professionals, researchers, and policymakers worldwide.',
    type: 'website',
    url: 'https://giip.info',
    images: [
      {
        url: 'https://giip.info/images/icons/giip-logo.png',
        width: 1200,
        height: 630,
        alt: 'GIIP Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Innovation and Intellectual Property (GIIP)',
    description: 'Leading platform for IP professionals, researchers, and policymakers worldwide.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/images/icons/giip-logo.png" />
        <link rel="apple-touch-icon" href="/images/icons/giip-logo.png" />
        <link rel="canonical" href="https://giip.info" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Filter patterns for browser extension errors
                const filterPatterns = [
                  'chrome-extension://', 'moz-extension://', 'safari-extension://',
                  'layer.js', 'layui.all.js', 'clipboard.min.js', 'redi',
                  'Cannot read properties of undefined', 'Cannot use import statement outside a module',
                  'ERR_FAILED', 'chrome-extension://invalid', 'web_accessible_resources',
                  'Denying load of chrome-extension', '[redi]:', 'contentScript.bundle.js', 'i18next',
                  'Refused to apply style', 'MIME type', 'text/html', 'stylesheet MIME type',
                  '/css/modules/', 'laydate', '用户凭据不合法', '用户凭据', 'api/wr/user/conf'
                ];
                
                const shouldFilter = (msg) => {
                  const msgStr = String(msg || '').toLowerCase();
                  return filterPatterns.some(p => msgStr.includes(p.toLowerCase()));
                };
                
                // Override console methods early
                const originalWarn = console.warn;
                const originalError = console.error;
                
                console.warn = function(...args) {
                  const msg = args.join(' ');
                  if (!shouldFilter(msg)) originalWarn.apply(console, args);
                };
                
                console.error = function(...args) {
                  const msg = args.join(' ');
                  if (!shouldFilter(msg)) originalError.apply(console, args);
                };
                
                // Handle errors early
                window.addEventListener('error', function(e) {
                  if (shouldFilter(e.message, e.filename)) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }
                }, true);
                
                // Handle unhandled rejections
                window.addEventListener('unhandledrejection', function(e) {
                  if (shouldFilter(String(e.reason))) {
                    e.preventDefault();
                    return;
                  }
                });
              })();
            `
          }}
        />
      </head>
      <body className="font-sans text-text bg-white">
        <GlobalErrorHandler />
        <PreloadResources />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}