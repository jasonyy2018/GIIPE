import { Injectable, Logger } from '@nestjs/common';
import * as sanitizeHtmlModule from 'sanitize-html';
import {
  ProcessedContent,
  ContentMetadata,
  SanitizationOptions,
  HeadingInfo,
  LinkInfo,
  ImageInfo,
} from './interfaces/content.interface';

// Handle both CommonJS and ES module exports
const sanitizeHtml = (sanitizeHtmlModule as any).default || sanitizeHtmlModule;

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  /**
   * Process markdown content to HTML with metadata extraction
   */
  async processMarkdown(content: string): Promise<ProcessedContent> {
    try {
      // Dynamic imports for ES modules
      // remark v15+ uses ES modules, must use dynamic import
      // Use string concatenation to prevent TypeScript from compiling import() to require()
      // This ensures true dynamic import at runtime
      const importDynamic = (specifier: string) => {
        // Use string concatenation to prevent TypeScript compilation
        return new Function('return import("' + specifier.replace(/"/g, '\\"') + '")')();
      };
      
      const [remarkModule, remarkHtmlModule, remarkParseModule] = await Promise.all([
        importDynamic('remark'),
        importDynamic('remark-html'),
        importDynamic('remark-parse'),
      ]);
      
      // Extract the actual plugin functions (handle both default and named exports)
      // remark exports as { remark: function } or default export
      const remark = (remarkModule as any).remark || (remarkModule as any).default?.remark || (remarkModule as any).default;
      const remarkParse = (remarkParseModule as any).default || (remarkParseModule as any);
      const remarkHtml = (remarkHtmlModule as any).default || (remarkHtmlModule as any);
      
      // remark() returns a processor, use it directly with type assertion
      const processor = remark()
        .use(remarkParse as any)
        .use(remarkHtml as any, {
          // Keep raw HTML from markdown (e.g. <mark>, <span style="...">),
          // then rely on sanitize-html() below for strict allow-list filtering.
          sanitize: false,
          allowDangerousHtml: true,
        });
      
      const htmlResult = await processor.process(content);
      const rawHtml = String(htmlResult);
      // Fix double-encoded nbsp *before* sanitize (sanitize may normalize entities).
      const nbspFixed = this.applyNbspEntityFix(rawHtml);
      const sanitizedHtml = this.sanitizeHtml(nbspFixed);
      // Apply [btn:Label](url) → button styling AFTER sanitize so `class` on <a> is never stripped
      // by sanitize-html's allowedClasses quirks (see apostrophecms/sanitize-html#569).
      const sanitizedHtmlWithButtons = this.applyMarkdownButtonLinks(sanitizedHtml);
      // Mixed HTML + markdown / remark edge cases can leave literal **label** in text nodes
      const finalHtml = this.applyLooseBoldMarkdown(sanitizedHtmlWithButtons);

      // Extract metadata (use final HTML so link text matches public output)
      const metadata = this.extractMetadata(content, finalHtml);

      return {
        html: finalHtml,
        markdown: content,
        metadata,
      };
    } catch (error) {
      this.logger.error('Error processing markdown content', error);
      throw new Error('Failed to process markdown content');
    }
  }

  /** Double-encoded nbsp shows as literal "&nbsp;" in the browser — fix before sanitize. */
  private applyNbspEntityFix(html: string): string {
    let h = html;
    for (let i = 0; i < 6; i++) {
      h = h.replace(/&amp;nbsp;/gi, '&#160;');
      h = h.replace(/&amp;#160;/gi, '&#160;');
      h = h.replace(/&amp;#x0*A0;/gi, '&#160;');
    }
    return h;
  }

  /**
   * remark turns [btn:Label](url) into <a href>btn:Label</a> (prefix stays in text).
   * Run on already-sanitized HTML so we can add class="giip-md-btn" without sanitize-html removing it.
   * Supports: plain text, leading whitespace, optional wrapper like <strong>btn:x</strong>, ASCII or full-width colon.
   */
  private applyMarkdownButtonLinks(html: string): string {
    return html.replace(/<a(\s[^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs, inner) => {
      // Plain or wrapped label must *start* with btn: / btn： (not "click btn:" mid-sentence)
      const textOnly = inner.replace(/<[^>]*>/g, '').replace(/^\s+/, '').trim();
      if (!/^btn\s*[:：]/i.test(textOnly)) {
        return full;
      }
      let newInner = inner.replace(/(^|>)\s*btn\s*[:：]\s*/i, '$1');
      newInner = newInner.replace(/^\s*btn\s*[:：]\s*/i, '');
      const a = String(attrs);
      if (/giip-md-btn/.test(a)) {
        return `<a${a}>${newInner}</a>`;
      }
      let nextAttrs = a;
      const classMatch = a.match(/class\s*=\s*(["'])([^"']*)\1/i);
      if (classMatch) {
        if (!classMatch[2].includes('giip-md-btn')) {
          nextAttrs = a.replace(/class\s*=\s*(["'])([^"']*)\1/i, (_, q, c) => `class=${q}${c} giip-md-btn${q}`);
        }
      } else {
        const t = a.trimEnd();
        // Always keep a space before `class` so we never emit `<aclass=...`
        nextAttrs = `${t ? `${t} ` : ' '}class="giip-md-btn"`;
      }
      if (!/\brole\s*=/i.test(nextAttrs)) {
        nextAttrs = `${nextAttrs.trimEnd()} role="button"`;
      }
      return `<a${nextAttrs}>${newInner}</a>`;
    });
  }

  /**
   * Turn leftover `**bold**` in HTML text into <strong> (remark sometimes leaves these inside
   * raw HTML blocks or mixed content). Skips <pre> and <code>. Does not cross `<` (no HTML injection).
   */
  private applyLooseBoldMarkdown(html: string): string {
    const blocks: string[] = [];
    const placeholder = (i: number) => `\uE000GIIPBLK${i}\uE000`;
    let h = html.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => {
      const i = blocks.length;
      blocks.push(m);
      return placeholder(i);
    });
    h = h.replace(/\*\*([^*<]+?)\*\*/g, '<strong>$1</strong>');
    for (let i = 0; i < blocks.length; i++) {
      h = h.split(placeholder(i)).join(blocks[i]);
    }
    return h;
  }

  /**
   * Sanitize HTML content for security
   */
  sanitizeHtml(html: string, options?: SanitizationOptions): string {
    const defaultOptions = {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
        'mark',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span',
        'hr',
      ],
      allowedAttributes: {
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'h1': ['id'],
        'h2': ['id'],
        'h3': ['id'],
        'h4': ['id'],
        'h5': ['id'],
        'h6': ['id'],
        'div': ['class'],
        'span': ['class', 'style'],
        'mark': ['class', 'style'],
        'code': ['class'],
        'pre': ['class'],
      },
      allowedStyles: {
        // Allow limited inline styles for controlled rich-text highlighting/formatting.
        span: {
          color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([0-9\s,%.]+\)$/, /^rgba\([0-9\s,%.]+\)$/, /^[a-zA-Z]+$/],
          'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([0-9\s,%.]+\)$/, /^rgba\([0-9\s,%.]+\)$/, /^[a-zA-Z]+$/],
          background: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([0-9\s,%.]+\)$/, /^rgba\([0-9\s,%.]+\)$/, /^[a-zA-Z]+$/],
          'font-weight': [/^(normal|bold|bolder|lighter|[1-9]00)$/],
          'font-style': [/^(normal|italic|oblique)$/],
          'text-decoration': [/^(none|underline|line-through|overline)$/],
          'font-size': [/^[0-9.]+(px|em|rem|%)$/],
          'line-height': [/^[0-9.]+(px|em|rem|%)?$/],
          'letter-spacing': [/^-?[0-9.]+(px|em|rem)?$/],
          'text-align': [/^(left|right|center|justify)$/],
          'white-space': [/^(normal|nowrap|pre|pre-wrap|pre-line)$/],
          border: [/^[#0-9a-zA-Z\s().,%-]+$/],
          'border-radius': [/^[0-9.]+(px|em|rem|%)$/],
          // Allow common shorthands: "8px 12px", "1em 2em 0", "0 auto", etc. (no url()/expression)
          padding: [/^(?!.*url\s*\()[^\(\);]{1,120}$/],
          margin: [/^(?!.*url\s*\()[^\(\);]{1,120}$/],
        },
        mark: {
          color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([0-9\s,%.]+\)$/, /^rgba\([0-9\s,%.]+\)$/, /^[a-zA-Z]+$/],
          'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([0-9\s,%.]+\)$/, /^rgba\([0-9\s,%.]+\)$/, /^[a-zA-Z]+$/],
          background: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\([0-9\s,%.]+\)$/, /^rgba\([0-9\s,%.]+\)$/, /^[a-zA-Z]+$/],
          'font-weight': [/^(normal|bold|bolder|lighter|[1-9]00)$/],
          'font-size': [/^[0-9.]+(px|em|rem|%)$/],
          padding: [/^(?!.*url\s*\()[^\(\);]{1,120}$/],
          margin: [/^(?!.*url\s*\()[^\(\);]{1,120}$/],
        },
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: {
        img: ['http', 'https', 'data'],
      },
      transformTags: {
        'a': (tagName: string, attribs: Record<string, string>) => {
          // Add rel="noopener noreferrer" to external links
          if (attribs.href && (attribs.href.startsWith('http://') || attribs.href.startsWith('https://'))) {
            attribs.rel = 'noopener noreferrer';
            attribs.target = '_blank';
          }
          return { tagName, attribs };
        },
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      return sanitizeHtml(html, mergedOptions);
    } catch (error) {
      this.logger.error('Error sanitizing HTML content', error);
      throw new Error('Failed to sanitize HTML content');
    }
  }

  /**
   * Process HTML content with sanitization
   */
  async processHtml(html: string, options?: SanitizationOptions): Promise<ProcessedContent> {
    try {
      const prepped = this.applyNbspEntityFix(html);
      const withButtons = this.applyMarkdownButtonLinks(this.sanitizeHtml(prepped, options));
      const finalHtml = this.applyLooseBoldMarkdown(withButtons);

      const metadata = this.extractMetadataFromHtml(finalHtml);

      return {
        html: finalHtml,
        markdown: '', // HTML input doesn't have markdown source
        metadata,
      };
    } catch (error) {
      this.logger.error('Error processing HTML content', error);
      throw new Error('Failed to process HTML content');
    }
  }

  /**
   * Generate content preview (truncated version)
   */
  generatePreview(content: string, maxLength: number = 200): string {
    // Strip HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '');
    
    if (textContent.length <= maxLength) {
      return textContent;
    }

    // Truncate at word boundary
    const truncated = textContent.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Extract metadata from markdown and HTML content
   */
  private extractMetadata(markdown: string, html: string): ContentMetadata {
    const wordCount = this.calculateWordCount(markdown);
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words per minute
    const headings = this.extractHeadings(html);
    const links = this.extractLinks(html);
    const images = this.extractImages(html);

    return {
      wordCount,
      readingTime,
      headings,
      links,
      images,
    };
  }

  /**
   * Extract metadata from HTML content only
   */
  private extractMetadataFromHtml(html: string): ContentMetadata {
    const textContent = html.replace(/<[^>]*>/g, '');
    const wordCount = this.calculateWordCount(textContent);
    const readingTime = Math.ceil(wordCount / 200);
    const headings = this.extractHeadings(html);
    const links = this.extractLinks(html);
    const images = this.extractImages(html);

    return {
      wordCount,
      readingTime,
      headings,
      links,
      images,
    };
  }

  /**
   * Calculate word count from text content
   */
  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract heading information from HTML
   */
  private extractHeadings(html: string): HeadingInfo[] {
    const headings: HeadingInfo[] = [];
    const headingRegex = /<h([1-6])(?:\s+id="([^"]*)")?[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1]);
      const id = match[2] || '';
      const text = match[3].replace(/<[^>]*>/g, '').trim();
      
      headings.push({
        level,
        text,
        id,
      });
    }

    return headings;
  }

  /**
   * Extract link information from HTML
   */
  private extractLinks(html: string): LinkInfo[] {
    const links: LinkInfo[] = [];
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      const isExternal = url.startsWith('http://') || url.startsWith('https://');
      
      links.push({
        text,
        url,
        isExternal,
      });
    }

    return links;
  }

  /**
   * Extract image information from HTML
   */
  private extractImages(html: string): ImageInfo[] {
    const images: ImageInfo[] = [];
    const imageRegex = /<img\s+(?:[^>]*?\s+)?src="([^"]*)"(?:[^>]*?\s+alt="([^"]*)")?(?:[^>]*?\s+title="([^"]*)")?[^>]*>/gi;
    let match;

    while ((match = imageRegex.exec(html)) !== null) {
      const src = match[1];
      const alt = match[2] || '';
      const title = match[3] || undefined;
      
      images.push({
        src,
        alt,
        title,
      });
    }

    return images;
  }

  /**
   * Validate content format (markdown or HTML)
   */
  validateContentFormat(content: string): 'markdown' | 'html' | 'unknown' {
    // Simple heuristic to detect content format
    const htmlTagRegex = /<[^>]+>/;
    const markdownPatterns = [
      /^#{1,6}\s+/m,  // Headers
      /^\*\s+/m,      // Unordered lists
      /^\d+\.\s+/m,   // Ordered lists
      /\*\*.*?\*\*/,  // Bold
      /\*.*?\*/,      // Italic
      /\[.*?\]\(.*?\)/, // Links
    ];

    if (htmlTagRegex.test(content)) {
      return 'html';
    }

    for (const pattern of markdownPatterns) {
      if (pattern.test(content)) {
        return 'markdown';
      }
    }

    return 'unknown';
  }
}