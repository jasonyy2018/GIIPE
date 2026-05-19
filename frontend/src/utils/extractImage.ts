/**
 * Extract first image URL from markdown or HTML content
 */
export function extractFirstImage(content: string, contentHtml?: string): string | null {
  // First try to extract from HTML content
  if (contentHtml) {
    const htmlImageMatch = contentHtml.match(/<img[^>]+src="([^"]+)"/i);
    if (htmlImageMatch) {
      return htmlImageMatch[1];
    }
  }
  
  // Then try to extract from markdown content
  if (content) {
    // Match markdown image syntax: ![alt](url) or ![alt](url "title")
    const markdownImageMatch = content.match(/!\[.*?\]\(([^)]+)\)/);
    if (markdownImageMatch) {
      // Extract URL, remove possible title part
      const url = markdownImageMatch[1].split(' ')[0].replace(/['"]/g, '');
      return url;
    }
    
    // Match HTML img tag (if markdown contains HTML)
    const htmlInMarkdownMatch = content.match(/<img[^>]+src="([^"]+)"/i);
    if (htmlInMarkdownMatch) {
      return htmlInMarkdownMatch[1];
    }
  }
  
  return null;
}

/**
 * Get default placeholder image
 */
export function getDefaultImage(type: 'news' | 'event'): string {
  // IMPORTANT: Never use external placeholder images in production SSR.
  // External fetches can time out (ETIMEDOUT/EHOSTUNREACH) and crash the Next.js process, causing 504s.
  // Use local, bundled images instead.
  return type === 'news'
    ? '/images/features/research.jpg'
    : '/images/features/innovation.jpg';
}

/**
 * Convert absolute image URL to relative path for Next.js proxy
 */
function normalizeImageUrl(url: string): string {
  if (!url || !url.trim()) return url;
  
  // If it's already a relative path starting with /api/uploads/, use it as is
  if (url.startsWith('/api/uploads/')) {
    return url;
  }
  
  // Convert absolute URLs to relative paths
  // Handle various formats: http://localhost:3001/api/uploads/..., http://backend:3001/api/uploads/..., etc.
  if (url.includes('/api/uploads/')) {
    const pathMatch = url.match(/\/api\/uploads\/(.+)$/);
    if (pathMatch) {
      return `/api/uploads/${pathMatch[1]}`;
    }
  }
  
  // Handle /uploads/ paths (convert to /api/uploads/)
  if (url.includes('/uploads/')) {
    const pathMatch = url.match(/\/uploads\/(.+)$/);
    if (pathMatch) {
      return `/api/uploads/${pathMatch[1]}`;
    }
    if (url.startsWith('/uploads/')) {
      return `/api${url}`;
    }
  }
  
  // If it's an external URL (http:// or https://), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative path, return as is
  if (url.startsWith('/')) {
    return url;
  }
  
  // Otherwise return as is
  return url;
}

/**
 * Get image URL with priority:
 * 1. Featured image (admin-selected)
 * 2. First image from markdown/HTML content (fallback only)
 * 3. Default placeholder image
 */
export function getImageUrl(
  featuredImage?: string | null, 
  content?: string | null, 
  contentHtml?: string | null, 
  type: 'news' | 'event' = 'news'
): string {
  // Priority 1: Always honor admin-selected featured image first.
  if (featuredImage && featuredImage.trim()) {
    return normalizeImageUrl(featuredImage);
  }

  // Priority 2: Fallback to first image from content.
  if (content || contentHtml) {
    const extractedImage = extractFirstImage(content || '', contentHtml || '');
    if (extractedImage && extractedImage.trim()) {
      return normalizeImageUrl(extractedImage);
    }
  }
  
  // Priority 3: Use default placeholder image
  return getDefaultImage(type);
}
