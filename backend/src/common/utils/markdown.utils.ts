/**
 * Utility functions for markdown processing
 */

/**
 * Extract the first image URL from markdown content
 * @param markdown - The markdown content
 * @returns The URL of the first image, or null if no image found
 */
export function extractFirstImageFromMarkdown(markdown: string): string | null {
  if (!markdown) return null;

  // Regular expression to match markdown image syntax: ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/;
  const match = markdown.match(imageRegex);

  if (match && match[2]) {
    return match[2].trim();
  }

  return null;
}

/**
 * Extract all image URLs from markdown content
 * @param markdown - The markdown content
 * @returns Array of image URLs
 */
export function extractAllImagesFromMarkdown(markdown: string): string[] {
  if (!markdown) return [];

  // Global regular expression to match all markdown images
  const imageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/g;
  const images: string[] = [];
  let match;

  while ((match = imageRegex.exec(markdown)) !== null) {
    if (match[2]) {
      images.push(match[2].trim());
    }
  }

  return images;
}

/**
 * Extract the first image URL from HTML content
 * @param html - The HTML content
 * @returns The URL of the first image, or null if no image found
 */
export function extractFirstImageFromHtml(html: string): string | null {
  if (!html) return null;

  // Regular expression to match HTML img tags
  const imgRegex = /<img[^>]+src\s*=\s*['"']([^'"']+)['"'][^>]*>/i;
  const match = html.match(imgRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

/**
 * Extract featured image from content (tries markdown first, then HTML)
 * @param contentMarkdown - The markdown content
 * @param contentHtml - The HTML content
 * @returns The URL of the featured image, or null if no image found
 */
export function extractFeaturedImage(contentMarkdown?: string, contentHtml?: string): string | null {
  // Try markdown first
  if (contentMarkdown) {
    const markdownImage = extractFirstImageFromMarkdown(contentMarkdown);
    if (markdownImage) return markdownImage;
  }

  // Fallback to HTML
  if (contentHtml) {
    const htmlImage = extractFirstImageFromHtml(contentHtml);
    if (htmlImage) return htmlImage;
  }

  return null;
}