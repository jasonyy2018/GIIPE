import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Lightweight edge middleware: block obvious probes/injection and set security headers.
// This is not a replacement for nginx/WAF, but it reduces load and attack surface on port 3000.

function isProbablyMalicious(req: NextRequest): boolean {
  const url = req.nextUrl;
  const path = url.pathname || '';
  const query = url.search || '';
  const ua = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';

  const haystack = `${path}\n${query}\n${ua}\n${referer}`.toLowerCase();

  // Common scanning / traversal / injection indicators
  const patterns: RegExp[] = [
    /\.\.\//, // traversal
    /%2e%2e%2f/, // traversal encoded
    /%00/, // null byte
    /\/wp-admin\b|\/wp-login\.php\b/, // wordpress scans
    /\/phpmyadmin\b|\/pma\b/, // phpmyadmin scans
    /\/\.env\b|\/\.git\b|\/\.svn\b/, // secrets/source probes
    /\/cgi-bin\b/, // cgi probes
    /\/vendor\/phpunit\b/, // phpunit probes
    /\b(base64\s*-d|chmod\s*\+x|\/bin\/sh|sh\s+-c)\b/, // command payloads
    /\b(curl|wget)\b.*\bhttp\b/, // download-and-exec style
    /\bstratum\+tcp\b/, // mining
    /\bcrontab\b|\bsystemctl\b|\bnohup\b/, // persistence hints
    /returnnan/i, // block CVE-2025-55182 (React2Shell) probes
  ];

  if (patterns.some((re) => re.test(haystack))) return true;

  // Block weird, clearly automated overlong URLs (cheap heuristic)
  if (path.length + query.length > 2000) return true;

  return false;
}

function applySecurityHeaders(req: NextRequest, res: NextResponse): NextResponse {
  // Baseline hardening. Keep aligned with nginx.conf where possible.
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-site');

  // How the *browser* reached this app (direct http:3000 vs TLS terminator in front).
  const proto = (req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', ''))
    .split(',')[0]
    ?.trim()
    .toLowerCase();

  // HSTS only when actually behind HTTPS.
  if (proto === 'https') {
    res.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains'); // 180d
  }

  // CSP: keep conservative but compatible with Next.
  // IMPORTANT: Never send `upgrade-insecure-requests` when the page is served over plain HTTP
  // (e.g. http://YOUR_IP:3000). Browsers will rewrite `/_next/static/*` to HTTPS and you get
  // ERR_SSL_PROTOCOL_ERROR with no CSS/JS — exactly the "unstyled site" symptom.
  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Next uses inline styles in some cases; keep 'unsafe-inline' for style to avoid breaking UI.
    // style-src-attr: explicit allow for inline style="" on elements (e.g. sanitized <span>/<mark> from events).
    // globals.css @imports Google Fonts; some pages use Font Awesome from cdnjs — allow those stylesheets.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "style-src-attr 'self' 'unsafe-inline'",
    // Next/Admin UI uses some inline scripts; allow them for compatibility.
    "script-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' ws: wss:",
    "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "form-action 'self'",
  ];
  if (proto === 'https') {
    cspDirectives.push('upgrade-insecure-requests');
  }

  res.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  return res;
}

export function middleware(req: NextRequest) {
  // Never interfere with Next internals/static assets.
  const p = req.nextUrl.pathname;
  if (
    p.startsWith('/_next/') ||
    p.startsWith('/favicon.ico') ||
    p.startsWith('/robots.txt') ||
    p.startsWith('/sitemap.xml') ||
    p.startsWith('/images/') ||
    p.startsWith('/fonts/')
  ) {
    return applySecurityHeaders(req, NextResponse.next());
  }

  if (isProbablyMalicious(req)) {
    const res = new NextResponse('Forbidden', { status: 403 });
    return applySecurityHeaders(req, res);
  }

  return applySecurityHeaders(req, NextResponse.next());
}

export const config = {
  matcher: [
    // Apply to all paths; early returns above exclude heavy paths.
    '/:path*',
  ],
};

