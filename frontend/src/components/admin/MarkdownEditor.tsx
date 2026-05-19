'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Eye, Edit, Upload, Bold, Italic, Link, List, ListOrdered, Quote, Code, Image, MousePointer, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderMarkdownToHtml } from '@/utils/markdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  height?: string;
  onImageUpload?: (imageUrl: string) => void;
  onFirstImageChange?: (imageUrl: string | null) => void;
}

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
  active?: boolean;
  label?: string;
}

function ToolbarButton({ icon: Icon, title, onClick, active, label }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "px-2 py-1.5 rounded hover:bg-gray-100 transition-colors inline-flex items-center gap-1.5",
        active && "bg-gray-100"
      )}
    >
      <Icon className="h-4 w-4" />
      {label ? <span className="text-xs font-semibold text-gray-700">{label}</span> : null}
    </button>
  );
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Write your content in Markdown...",
  className,
  height = "400px",
  onImageUpload,
  onFirstImageChange
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('preview'); // Default to preview mode
  
  // Debug: Log mode changes
  useEffect(() => {
    console.log('MarkdownEditor mode changed to:', mode);
  }, [mode]);
  const [selectedText, setSelectedText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const hasCleanedRef = useRef(false);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let cleanedValue = e.target.value;
    
    // First, try to extract any valid image URLs from HTML fragments before cleaning
    // This helps recover image URLs that might be embedded in HTML code
    const extractedImages: string[] = [];
    
    // Extract from onerror handlers with image URLs
    cleanedValue = cleanedValue.replace(/([a-f0-9]{20,})[^\n]*onerror\s*=\s*["']handleImageError[^"']*["'][^"']*["']([^"']*\/api\/uploads\/[^"']*\.(jpg|jpeg|png|gif|webp))[^"']*["']/gi, (match, fileId, imageUrl) => {
      if (imageUrl && imageUrl.includes('/api/uploads/')) {
        extractedImages.push(imageUrl);
        // Try to reconstruct markdown image syntax
        const fileName = imageUrl.split('/').pop() || '';
        const altText = fileName.replace(/\.[^/.]+$/, '');
        return `![${altText}](${imageUrl})`;
      }
      return '';
    });
    
    // Extract from data-image-url attributes (can be on separate lines)
    cleanedValue = cleanedValue.replace(/data-image-url\s*=\s*["']([^"']*\/api\/uploads\/[^"']*\.(jpg|jpeg|png|gif|webp))["']/gi, (match, imageUrl) => {
      if (imageUrl && !extractedImages.includes(imageUrl)) {
        extractedImages.push(imageUrl);
        const fileName = imageUrl.split('/').pop() || '';
        const altText = fileName.replace(/\.[^/.]+$/, '');
        return `![${altText}](${imageUrl})`;
      }
      return '';
    });
    
    // Extract from any URL pattern that looks like an image URL in the corrupted content
    cleanedValue = cleanedValue.replace(/http:\/\/localhost:300[01]\/api\/uploads\/[^\s"'<>]*\.(jpg|jpeg|png|gif|webp)/gi, (match) => {
      if (match && !extractedImages.includes(match)) {
        extractedImages.push(match);
        const fileName = match.split('/').pop() || '';
        const altText = fileName.replace(/\.[^/.]+$/, '');
        // Check if this URL is already part of a markdown image
        if (!cleanedValue.includes(`![${altText}](${match})`) && !cleanedValue.includes(`](${match})`)) {
          return `![${altText}](${match})`;
        }
      }
      return match;
    });
    
    // First, protect markdown image syntax by temporarily replacing it
    const imagePlaceholders: string[] = [];
    cleanedValue = cleanedValue.replace(/!\[([^\]]*)\]\(([^\)]*)\)/g, (match) => {
      const placeholder = `__MARKDOWN_IMAGE_${imagePlaceholders.length}__`;
      imagePlaceholders.push(match);
      return placeholder;
    });
    
    // Detect if there's invalid HTML/JavaScript code that shouldn't be in markdown
    const hasInvalidCode = cleanedValue.includes('onerror') || 
                          cleanedValue.includes('onclick') || 
                          cleanedValue.includes('<script') ||
                          cleanedValue.includes('document.getElementById') ||
                          cleanedValue.includes('container.appendChild') ||
                          cleanedValue.includes('data-image-url') ||
                          cleanedValue.includes('handleImageError') ||
                          cleanedValue.includes('deleteImageFromMarkdown') ||
                          cleanedValue.includes('<img') ||
                          cleanedValue.includes('</img>') ||
                          cleanedValue.includes('style=') && cleanedValue.includes('opacity:');
    
    if (hasInvalidCode) {
      // Clean up any HTML/JavaScript code that might have been accidentally inserted
      // This happens when preview HTML is accidentally copied back into the editor
      cleanedValue = cleanedValue
        // First, remove entire blocks of HTML code that span multiple lines
        // Pattern: file ID followed by onerror and other HTML attributes?.replace(/([a-f0-9]{20,})\s*onerror\s*=\s*"[^"]*"[^\n]*(\n[^\n]*)*(\/>|\/[\s\n]*>)/gim, '')
        .replace(/([a-f0-9]{20,})\s*onerror\s*=\s*'[^']*'[^\n]*(\n[^\n]*)*(\/>|\/[\s\n]*>)/gim, '') // Remove file ID followed by onerror and any subsequent HTML attributes (multiline)
          .replace(/([a-f0-9]{20,})\s*onerror\s*=\s*"[^"]*"[\s\S]*?(\/>|\/[\s\n]*>)/gim, '')
        .replace(/([a-f0-9]{20,})\s*onerror\s*=\s*'[^']*'[\s\S]*?(\/>|\/[\s\n]*>)/gim, '') // Remove file ID followed by onerror on same line or next line?.replace(/([a-f0-9]{20,})\s*onerror\s*=\s*"[^"]*"/gi, '')
          .replace(/([a-f0-9]{20,})\s*onerror\s*=\s*'[^']*'/gi, '') // Remove multiline onerror blocks?.replace(/onerror\s*=\s*"[^"]*handleImageError[^"]*"/gim, '')
          .replace(/onerror\s*=\s*'[^']*handleImageError[^']*'/gim, '')
        .replace(/onerror\s*=\s*"[^"]*const\s+img[^"]*"[^\n]*/gim, '')
        .replace(/onerror\s*=\s*'[^']*const\s+img[^']*'[^\n]*/gim, '') // Remove any onerror attributes (complete removal)
          .replace(/onerror\s*=\s*"[^"]*"/gi, '')
        .replace(/onerror\s*=\s*'[^']*'/gi, '') // Remove onclick handlers?.replace(/onclick\s*=\s*"[^"]*"/gi, '')
          .replace(/onclick\s*=\s*'[^']*'/gi, '') // Remove data attributes from HTML (including multiline)
          .replace(/\s*data-image-url\s*=\s*"[^"]*"/gi, '')
        .replace(/\s*data-image-url\s*=\s*'[^']*'/gi, '')
        .replace(/\s*data-image-id\s*=\s*"[^"]*"/gi, '')
        .replace(/\s*data-image-id\s*=\s*'[^']*'/gi, '') // Remove style attributes that look like HTML (not markdown)
          .replace(/\s*style\s*=\s*"[^"]*opacity[^"]*"/gi, '')
        .replace(/\s*style\s*=\s*'[^']*opacity[^']*'/gi, '') // Remove title attributes that look like HTML?.replace(/\s*title\s*=\s*"[^"]*Delete[^"]*"/gi, '')
          .replace(/\s*title\s*=\s*'[^']*Delete[^']*'/gi, '')
        // Remove any script tags?.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove HTML img tags (but preserve markdown placeholders)
          .replace(/<img[^>]*\/>/gi, '')
        .replace(/<img[^>]*>[\s\S]*?<\/img>/gi, '') // Remove stray HTML tags?.replace(/<div[^>]*>/gi, '')
          .replace(/<\/div>/gi, '')
        .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '') // Remove standalone closing tags and fragments?.replace(/\/>\s*/g, '')
          .replace(/\/[\s\n]*>/g, '') // Remove button content (×, Remove, etc.)
          .replace(/×/g, '') // Remove JavaScript code patterns?.replace(/handleImageError\s*\([^)]*\)/gi, '')
          .replace(/deleteImageFromMarkdown\s*\([^)]*\)/gi, '')
        .replace(/const\s+img\s*=\s*document\.getElementById[^;]*;/gi, '')
        .replace(/document\.getElementById\([^)]*\)/gi, '')
        .replace(/container\.appendChild\([^)]*\)/gi, '')
        .replace(/img\.style\.display\s*=\s*['"][^'"]*['"]/gi, '')
        .replace(/errorDiv\.innerHTML\s*=[^;]*;/gi, '')
        .replace(/container\.appendChild\(errorDiv\)/gi, '')
        .replace(/\.closest\([^)]*\)/gi, '')
        .replace(/if\s*\(img\)/gi, '')
        .replace(/if\s*\(container\)/gi, '')
        // Remove className assignments?.replace(/errorDiv\.className\s*=[^;]*;/gi, '') // Remove any remaining JavaScript-like patterns?.replace(/\.querySelector\([^)]*\)/gi, '')
          .replace(/\.createElement\([^)]*\)/gi, '') // Remove standalone file IDs that are not part of markdown (but keep them if they're part of a URL)
          .replace(/^([a-f0-9]{20,})(?![-\.])$/gim, '') // Remove lines that look like HTML attributes or fragments?.replace(/^\/>\s*$/gim, '')
          .replace(/^\/[\s\n]*>\s*$/gim, '') // Remove lines that are just HTML attribute fragments?.replace(/^data-image-url\s*=\s*"[^"]*"\s*$/gim, '')
          .replace(/^data-image-url\s*=\s*'[^']*'\s*$/gim, '')
        .replace(/^title\s*=\s*"[^"]*"\s*$/gim, '')
        .replace(/^title\s*=\s*'[^']*'\s*$/gim, '')
        .replace(/^style\s*=\s*"[^"]*"\s*$/gim, '')
        .replace(/^style\s*=\s*'[^']*'\s*$/gim, '')
        // Clean up multiple consecutive newlines?.replace(/\n{3,}/g, '\n\n') // Remove lines with only whitespace and HTML fragments?.replace(/^\s*\/>\s*$/gim, '')
          .replace(/^\s*>\s*$/gim, '')
        // Remove any remaining HTML attribute patterns on their own lines?.replace(/^\s*(data-image-url|data-image-id|title|style|onerror|onclick)\s*=\s*["'][^"']*["']\s*$/gim, '') // Final cleanup: remove any remaining standalone HTML fragments?.replace(/\s*\/>\s*/g, ' ')
          .replace(/\s*>\s*×\s*/g, ' ')
        .trim();
    }
    
    // Restore markdown image syntax
    cleanedValue = cleanedValue.replace(/__MARKDOWN_IMAGE_(\d+)__/g, (match, index) => {
      return imagePlaceholders[parseInt(index)] || match;
    });
    
    onChange(cleanedValue);
  };

  // Extract first image from markdown content
  const extractFirstImage = useCallback((content: string) => {
    if (!onFirstImageChange) return;
    
    const imageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/;
    const match = content.match(imageRegex);
    
    if (match && match[2]) {
      onFirstImageChange(match[2]);
    } else {
      onFirstImageChange(null);
    }
  }, [onFirstImageChange]);

  const insertTextAtCursor = useCallback((text: string) => {
    const textarea = document.querySelector('textarea[data-markdown-editor]') as HTMLTextAreaElement;
    if (!textarea) {
      onChange((value || '') + (value ? '\n\n' : '') + text);
      return;
    }
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const prefix = value.substring(0, start);
    const suffix = value.substring(end);
    const newValue = prefix + text + suffix;
    onChange(newValue);
    extractFirstImage(newValue);
    setTimeout(() => {
      const pos = start + text.length;
      textarea.setSelectionRange(pos, pos);
      textarea.focus();
    }, 0);
  }, [extractFirstImage, onChange, value]);

  const htmlToMarkdown = useCallback(async (html: string): Promise<string> => {
    const TurndownModule = await import('turndown');
    const gfmModule = await import('turndown-plugin-gfm');
    const TurndownService = (TurndownModule as any).default ?? (TurndownModule as any);
    const { gfm } = (gfmModule as any);

    const service = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      bulletListMarker: '-',
    });

    // Tables / strikethrough / taskList / fencedCodeBlock
    if (typeof service.use === 'function' && gfm) {
      service.use(gfm);
    }

    const tableToMarkdown = (table: HTMLTableElement): string => {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      const cellText = (cell: Element) =>
        (cell.textContent || '')
          .replace(/\u00A0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const grid = rows.map((r) =>
        Array.from(r.querySelectorAll('th,td')).map((c) => cellText(c))
      );

      const colCount = Math.max(...grid.map((r) => r.length));
      const norm = grid.map((r) => {
        const rr = r.slice(0, colCount);
        while (rr.length < colCount) rr.push('');
        return rr;
      });

      const escapeCell = (s: string) => s.replace(/\|/g, '\\|');
      const header = norm[0].map((c) => escapeCell(c || ' '));
      const sep = new Array(colCount).fill('---');
      const body = norm.slice(1).map((r) => r.map((c) => escapeCell(c || ' ')));

      const lines = [
        `| ${header.join(' | ')} |`,
        `| ${sep.join(' | ')} |`,
        ...body.map((r) => `| ${r.join(' | ')} |`),
      ];
      return `\n\n${lines.join('\n')}\n\n`;
    };

    // Word-specific cleanup: remove Office tags / embedded styles — do NOT strip all <span>,
    // so manual <span style="..."> / <mark> pasted as HTML can survive turndown when possible.
    const cleanedHtml = html
      .replace(/<o:p>\s*<\/o:p>/gi, '')
      .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '')
      .replace(/<!--\[if[\s\S]*?endif\]-->/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Empty Word spans only (keeps styled spans for intentional HTML-in-markdown)
      .replace(/<span[^>]*>\s*<\/span>/gi, '')
      // Typical Word noise: mso-* inline styles on span
      .replace(/<span[^>]*\bmso-[^>]*>([\s\S]*?)<\/span>/gi, '$1')
      .replace(/<\/?font[^>]*>/gi, '');

    // Avoid mixed-content: normalize any localhost upload URLs to same-origin /api/uploads/
    let normalizedHtml = cleanedHtml
      .replace(/https?:\/\/localhost:3001\/api\/uploads\//gi, '/api/uploads/')
      .replace(/https?:\/\/localhost:3000\/api\/uploads\//gi, '/api/uploads/');

    // Convert HTML tables to GFM markdown tables before turndown.
    // Word content is often pasted/exported as a single table, and turndown may keep raw <table> HTML.
    const tableReplacements: Array<{ token: string; md: string }> = [];
    try {
      const doc = new DOMParser().parseFromString(normalizedHtml, 'text/html');
      const tables = Array.from(doc.querySelectorAll('table'));
      tables.forEach((t, i) => {
        const token = `__GIIP_TABLE_${i}__`;
        tableReplacements.push({ token, md: tableToMarkdown(t as HTMLTableElement) });
        t.replaceWith(doc.createTextNode(token));
      });
      normalizedHtml = doc.body.innerHTML;
    } catch (e) {
      // If DOMParser fails (shouldn't in browser), fall back to raw HTML.
    }

    let md = service.turndown(normalizedHtml);

    // Restore markdown tables
    for (const rep of tableReplacements) {
      const rawToken = rep.token;
      const escapedToken = rep.token.replace(/_/g, '\\_');
      const tableMd = rep.md.trim();
      // Replace both raw and markdown-escaped tokens (turndown may escape `_`).
      md = md.split(rawToken).join(tableMd);
      md = md.split(escapedToken).join(tableMd);
      // Sometimes underscores get double-escaped; keep a best-effort replace for that too.
      const doubleEscapedToken = rep.token.replace(/_/g, '\\\\_');
      md = md.split(doubleEscapedToken).join(tableMd);
    }

    // Normalize whitespace similar to Word paragraph breaks
    md = md
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Last-resort cleanup: strip leaked layout/table tags only — keep mark/span/br and emphasis
    // so admin markdown can include <mark>, <span style="...">, <br>, etc. (backend sanitizes on save).
    if (/[<][a-z][\s\S]*[>]/i.test(md)) {
      md = md
        .replace(/<\/?(table|tbody|thead|tfoot|tr|td|th|p|div)[^>]*>/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    return md;
  }, []);

  const handleDocxImportClick = useCallback(() => {
    docxInputRef.current?.click();
  }, []);

  const handleDocxFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so selecting the same file twice still triggers change
    e.target.value = '';

    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('请选择 .docx 文件');
      return;
    }

    try {
      const buf = await file.arrayBuffer();
      const mammoth = await import('mammoth');

      // Convert docx -> HTML. Mammoth focuses on semantic structure (headings/lists/tables).
      const result = await mammoth.convertToHtml(
        { arrayBuffer: buf },
        {
          // Style map helps preserve heading semantics from Word styles.
          styleMap: [
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
          ],
        }
      );

      const md = await htmlToMarkdown(result.value || '');
      const insert = (value && !value.endsWith('\n') ? '\n\n' : '') + md + '\n\n';
      insertTextAtCursor(insert);
    } catch (err) {
      console.error('Failed to import docx:', err);
      alert('Word 转 Markdown 失败，请重试。');
    }
  }, [htmlToMarkdown, insertTextAtCursor, value]);

  const handleTextSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setSelectedText(value.substring(start, end));
  };

  const insertText = useCallback((before: string, after: string = '', placeholder: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    
    const newValue = 
      value.substring(0, start) + 
      before + textToInsert + after + 
      value.substring(end);
    
    onChange(newValue);
    
    // Check for first image change
    extractFirstImage(newValue);
    
    // Set cursor position after insertion
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const insertButtonLink = useCallback(() => {
    // If user selected text, use it as button label; otherwise placeholder.
    // Syntax: [btn:Label](https://example.com) -> rendered as a button by markdownRenderer.
    const textarea = document.querySelector('textarea[data-markdown-editor]') as HTMLTextAreaElement;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    const selected = textarea ? value.substring(start, end) : '';
    const label = selected?.trim() ? selected.trim() : '按钮文字';
    const url = 'https://';
    const md = `[btn:${label}](${url})`;
    if (textarea) {
      const newValue = value.substring(0, start) + md + value.substring(end);
      onChange(newValue);
      extractFirstImage(newValue);
      setTimeout(() => {
        // Place cursor inside URL part for quick editing
        const urlStart = start + md.indexOf(url);
        const urlEnd = urlStart + url.length;
        textarea.setSelectionRange(urlStart, urlEnd);
        textarea.focus();
      }, 0);
    } else {
      onChange((value || '') + (value ? '\n\n' : '') + md);
    }
  }, [extractFirstImage, onChange, value]);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setUploading(false);
        alert('You are not logged in. Please log in and try again.');
        // Optionally redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
        return;
      }
      
      // Use frontend API route which forwards to backend
      const response = await fetch('/api/upload?category=image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          
          // Handle authentication errors
          if (response.status === 401) {
            errorMessage = 'Your session has expired. Please log in again.';
            // Clear invalid token
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            // Optionally redirect to login after a short delay
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
              }
            }, 2000);
          }
        } catch (e) {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload response:', result);
      
      // Handle different response formats
      // Priority: result.url (full URL) > result.path (relative path)
      let imageUrl = result.url;
      
      // If no url, try path
      if (!imageUrl && result.path) {
        imageUrl = result.path;
      }
      
      if (!imageUrl) {
        console.error('Upload response missing URL:', result);
        throw new Error('No URL returned from upload');
      }
      
      // Normalize to relative /api/uploads/... to avoid mixed-content (HTTPS page calling http://localhost:3001).
      if (imageUrl.startsWith('http://localhost:3001/') || imageUrl.startsWith('https://localhost:3001/')) {
        try {
          const u = new URL(imageUrl);
          imageUrl = u.pathname + u.search;
        } catch {
          // ignore
        }
      }

      if (imageUrl.startsWith('/api/uploads/')) {
        // Keep relative; Next.js/NPM proxy will serve it under the current origin (HTTPS safe)
      } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        // If it's a bare path (e.g. "images/xxx.jpg"), normalize to /api/uploads/<path>
        const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
        imageUrl = `/api/uploads/${cleanPath}`;
      }
      
      console.log('Image upload successful, final URL:', imageUrl);
      
      // Verify the URL is correct
      if (!imageUrl.includes('/api/uploads/')) {
        console.warn('Image URL might be incorrect:', imageUrl);
      }

      // Insert image markdown at current cursor position
      const altText = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const markdownText = `![${altText}](${imageUrl})`;
      console.log('Inserting markdown:', markdownText);
      
      // Insert the complete markdown text directly at cursor position
      // Note: This works in both edit and preview modes since we're using onChange callback
      const textarea = document.querySelector('textarea[data-markdown-editor]') as HTMLTextAreaElement;
      
      if (textarea && mode === 'edit') {
        // In edit mode, insert at cursor position
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        // Insert markdown with line breaks for better formatting
        const insertText = (start > 0 && value[start - 1] !== '\n') ? '\n\n' + markdownText + '\n\n' : markdownText + '\n\n';
        const newValue = value.substring(0, start) + insertText + value.substring(end);
        onChange(newValue);
        extractFirstImage(newValue);
        
        // Set cursor position after insertion
        setTimeout(() => {
          const newCursorPos = start + insertText.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      } else {
        // Fallback: append to end (works in both edit and preview modes)
        const newValue = value + (value ? '\n\n' : '') + markdownText;
        console.log('Appending image markdown (mode:', mode, '):', markdownText);
        onChange(newValue);
        extractFirstImage(newValue);
      }

      // Callback for image upload
      if (onImageUpload) {
        onImageUpload(imageUrl);
      }

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [value, onChange, extractFirstImage, onImageUpload, mode]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleImageUpload]);

  // Handle image button click
  const handleImageButtonClick = useCallback(() => {
    if (uploading) return;
    fileInputRef.current?.click();
  }, [uploading]);

  // Handle paste event for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains image files
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (file) {
          console.log('Pasted image detected:', file.name, file.type, file.size);
          await handleImageUpload(file);
        }
        return;
      }
    }

    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    // Prefer HTML -> Markdown (Word / Google Docs / rich content)
    if (html && html.trim()) {
      e.preventDefault();
      try {
        const md = await htmlToMarkdown(html);
        const insert = (value && !value.endsWith('\n') ? '\n\n' : '') + md + '\n\n';
        insertTextAtCursor(insert);
      } catch (err) {
        console.error('Failed to convert pasted HTML to markdown:', err);
        if (text) {
          insertTextAtCursor(text);
        }
      }
      return;
    }

    // Fallback: plain text heuristic (some environments provide no text/html)
    if (text && text.trim()) {
      const normalizePlainTextToMarkdown = (t: string) => {
        const lines = t.replace(/\r\n/g, '\n').split('\n');
        return lines
          .map((line) => {
            const l0 = line.replace(/\u00A0/g, ''); // NBSP
            const l = l0.trimEnd();

            // Drop Word/HTML CSS fragments that sometimes leak into plain text
            if (
              /mso-/.test(l) ||
              /^\s*(border|padding|margin|height|width)\s*:\s*/i.test(l) ||
              /^\s*<\w+[^>]*>\s*$/i.test(l) ||
              /^\s*<\/\w+>\s*$/i.test(l)
            ) {
              return '';
            }
            // common bullet chars from Word
            if (/^\s*[•·]\s+/.test(l)) return l.replace(/^\s*[•·]\s+/, '- ');
            // numbered list like "1)" or "1."
            if (/^\s*\d+\)\s+/.test(l)) return l.replace(/^\s*(\d+)\)\s+/, '$1. ');
            return l;
          })
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      };

      const md = normalizePlainTextToMarkdown(text);
      // Only intercept if it looks like structured content (lists/headings/blank lines),
      // otherwise let default paste proceed.
      const looksStructured = /(^|\n)(- |\d+\. )/.test(md) || md.includes('\n\n');
      if (looksStructured) {
        e.preventDefault();
        const insert = (value && !value.endsWith('\n') ? '\n\n' : '') + md + '\n\n';
        insertTextAtCursor(insert);
      }
    }
  }, [handleImageUpload, htmlToMarkdown, insertTextAtCursor, value]); // keep dependencies accurate

  const toolbarActions = [
    { icon: Bold, title: 'Bold', action: () => insertText('**', '**', 'bold text') },
    { icon: Italic, title: 'Italic', action: () => insertText('*', '*', 'italic text') },
    { icon: Link, title: 'Link', action: () => insertText('[', '](url)', 'link text') },
    { icon: MousePointer, title: 'Button Link', action: insertButtonLink, label: 'BTN' },
    { icon: FileUp, title: 'Import DOCX', action: handleDocxImportClick, label: 'DOCX' },
    { icon: List, title: 'Unordered List', action: () => insertText('\n- ', '', 'list item') },
    { icon: ListOrdered, title: 'Ordered List', action: () => insertText('\n1. ', '', 'list item') },
    { icon: Quote, title: 'Quote', action: () => insertText('\n> ', '', 'quote') },
    { icon: Code, title: 'Code', action: () => insertText('`', '`', 'code') },
  ];

  // Monitor content changes to extract first image
  useEffect(() => {
    extractFirstImage(value);
  }, [value, extractFirstImage]);

  // Clean content on initial load only for known preview/HTML corruption (not plain <br/> or <span>).
  useEffect(() => {
    const needsCorruptionClean =
      value &&
      (value.includes('onerror') ||
        value.includes('data-image-url') ||
        value.includes('handleImageError') ||
        value.includes('deleteImageFromMarkdown'));
    if (!hasCleanedRef.current && needsCorruptionClean) {
      hasCleanedRef.current = true;
      const syntheticEvent = {
        target: { value }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      handleTextareaChange(syntheticEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]); // Run when value changes initially

  // Define global functions for image handling
  useEffect(() => {
    // Handle image error
    (window as any).handleImageError = (imageId: string, imageUrl: string) => {
      const img = document.getElementById(imageId);
      if (!img) return;
      
      // Hide the broken image
      img.style.display = 'none';
      const container = img.closest('div[data-image-id]');
      if (!container) return;
      
      // Check if error div already exists
      if (container.querySelector('.image-error-message')) return;
      
      // Create error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'image-error-message text-red-500 text-sm p-2 bg-red-50 rounded border border-red-200';
      
      const errorContent = document.createElement('div');
      errorContent.className = 'flex items-center justify-between';
      
      const errorText = document.createElement('span');
      errorText.textContent = `Image failed to load: ${imageUrl.split('/').pop() || 'unknown'}`;
      
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'text-red-700 hover:text-red-900 px-2 cursor-pointer delete-image-btn ml-2';
      removeButton.setAttribute('data-image-url', imageUrl);
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof (window as any).deleteImageFromMarkdown === 'function') {
          (window as any).deleteImageFromMarkdown(removeButton, imageUrl);
        }
      });
      
      errorContent.appendChild(errorText);
      errorContent.appendChild(removeButton);
      errorDiv.appendChild(errorContent);
      container.appendChild(errorDiv);
    };
    
    // Delete image from markdown
    (window as any).deleteImageFromMarkdown = (button: HTMLElement, imageUrl: string) => {
      console.log('deleteImageFromMarkdown called:', { button, imageUrl, currentValue: value });
      if (!confirm('Delete this image from content?')) return;
      
      let container = button.closest('div[data-image-id]') as HTMLElement;
      if (!container) {
        // Try to find by error message
        const errorContainer = button.closest('.image-error-message')?.parentElement;
        if (errorContainer) {
          container = errorContainer as HTMLElement;
        } else {
          return;
        }
      }
      
      // Get current value from the component's value prop, not from textarea
      // This works in both edit and preview modes
      const currentValue = value || '';
      
      // Extract just the filename from the URL for more flexible matching
      // Handle both full URLs and relative paths
      let imageFileName = '';
      if (imageUrl.includes('/')) {
        imageFileName = imageUrl.split('/').pop() || '';
      } else {
        imageFileName = imageUrl;
      }
      
      // Remove query parameters and hash if present
      imageFileName = imageFileName.split('?')[0].split('#')[0];
      
      // Escape special regex characters in filename
      const escapedFileName = imageFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Create a flexible pattern that matches any markdown image syntax containing the filename
      // This works for:
      // - Full URL: ![alt](http://localhost:3001/api/uploads/images/filename.jpg)
      // - Relative path: ![alt](/api/uploads/images/filename.jpg)
      // - Just filename: ![alt](filename.jpg)
      // The pattern matches any URL that contains the filename anywhere in it
      const pattern = new RegExp(`!\\[([^\\]]*)\\]\\([^)]*${escapedFileName}[^)]*\\)`, 'g');
      
      let newValue = currentValue.replace(pattern, '');
      
      // Also remove any trailing newlines that might be left
      newValue = newValue.replace(/\n{3,}/g, '\n\n').trim();
      
      // Update content via onChange callback (this works in both modes)
      if (currentValue !== newValue) {
        console.log('Deleting image, updating content:', {
          oldLength: currentValue.length,
          newLength: newValue.length,
          imageUrl,
          imageFileName
        });
        onChange(newValue);
      } else {
        console.warn('Image deletion did not change content - URL might not match:', imageUrl);
      }
      
      // Try to delete file from server
      const token = localStorage.getItem('authToken');
      const filePath = extractFilePathFromUrl(imageUrl);
      
      if (filePath) {
        // Try to delete using file path
        fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token || ''}`
          }
        }).catch(err => {
          console.error('Failed to delete image from server:', err);
        });
      }
      
      // Remove container from DOM (only in preview mode)
      if (container && container.parentElement) {
        container.remove();
      }
    };
    
    // Set up event delegation for delete buttons
    const handleDeleteClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if clicked element or its parent is a delete button
      const deleteButton = target.closest('.delete-image-btn') as HTMLElement;
      if (deleteButton) {
        e.preventDefault();
        e.stopPropagation();
        const imageUrl = deleteButton.getAttribute('data-image-url');
        if (imageUrl && typeof (window as any).deleteImageFromMarkdown === 'function') {
          (window as any).deleteImageFromMarkdown(deleteButton, imageUrl);
        }
      }
    };
    
    // Use capture phase to catch events earlier
    document.addEventListener('click', handleDeleteClick, true);
    
    return () => {
      delete (window as any).deleteImageFromMarkdown;
      delete (window as any).handleImageError;
      document.removeEventListener('click', handleDeleteClick, true);
    };
  }, [onChange, value]); // Add value to dependencies

  // Helper function to convert image URL to relative URL (use Next.js proxy to avoid CORS)
  // This uses the Next.js rewrite to proxy /api/* requests to the backend, avoiding CORS issues
  const convertImageUrl = (src: string): string => {
    if (!src || src.trim() === '') return src;
    
    console.log('convertImageUrl called with:', src);
    
    // If it's already a relative URL starting with /api/uploads, use it as is (Next.js will proxy it)
    if (src.startsWith('/api/uploads/')) {
      console.log('Already relative URL, returning as is');
      return src; // Use relative path, Next.js rewrite will proxy to backend
    }
    
    // If it's an absolute URL pointing to localhost:3001, convert to relative path
    // Check for /api/uploads/ pattern first
    if (src.includes('localhost:3001/api/uploads/')) {
      const pathMatch = src.match(/\/api\/uploads\/(.+)$/);
      if (pathMatch) {
        const relativePath = `/api/uploads/${pathMatch[1]}`;
        console.log('Converted absolute URL (localhost:3001/api/uploads) to relative:', { original: src, converted: relativePath });
        return relativePath; // Use relative path, Next.js will proxy
      }
    }
    
    // If it's an absolute URL with /uploads/ (without /api), convert to /api/uploads/
    if (src.includes('/uploads/') && (src.includes('localhost:3001') || src.includes('localhost:3000'))) {
      const pathMatch = src.match(/\/uploads\/(.+)$/);
      if (pathMatch) {
        const relativePath = `/api/uploads/${pathMatch[1]}`;
        console.log('Converted absolute URL (/uploads/) to relative:', { original: src, converted: relativePath });
        return relativePath; // Use relative path, Next.js will proxy
      }
    }
    
    // Fallback: If it's any absolute URL with localhost:3001, try to extract the path
    if (src.startsWith('http://localhost:3001/') || src.startsWith('https://localhost:3001/')) {
      const urlObj = new URL(src);
      const path = urlObj.pathname;
      console.log('Converting localhost:3001 absolute URL to relative:', { original: src, path });
      return path; // Return the path part, Next.js will proxy /api/* requests
    }
    
    // If it's a relative URL starting with /uploads/, convert to /api/uploads/
    if (src.startsWith('/uploads/')) {
      return `/api${src}`; // Convert /uploads/ to /api/uploads/
    }
    
    // If it's just a filename or ID, construct relative path
    if (src.startsWith('/')) {
      // Other relative paths starting with /
      if (!src.startsWith('/api/')) {
        return `/api${src}`;
      }
      return src;
    } else {
      // If it's just a filename or ID, try to construct a relative path
      // Check if it looks like a file ID (long alphanumeric string)
      if (/^[a-f0-9]{20,}$/i.test(src)) {
        // It's likely a file ID, try to find it in images folder
        return `/api/uploads/images/${src}`;
      } else if (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.gif') || src.includes('.webp')) {
        // It's a filename with extension
        return `/api/uploads/images/${src}`;
      }
      // Otherwise, return as is
      return src;
    }
  };

  // Helper function to extract file path from image URL for deletion
  const extractFilePathFromUrl = (imageUrl: string): string | null => {
    if (!imageUrl) return null;
    
    try {
      // Try to parse as URL
      const urlObj = new URL(imageUrl);
      const pathname = urlObj.pathname;
      
      if (pathname.startsWith('/api/uploads/')) {
        return pathname.substring('/api/uploads/'.length);
      } else if (pathname.startsWith('/uploads/')) {
        return pathname.substring('/uploads/'.length);
      }
    } catch (e) {
      // If URL parsing fails, try string extraction
      if (imageUrl.includes('/api/uploads/')) {
        return imageUrl.split('/api/uploads/')[1].split('?')[0]; // Remove query params
      } else if (imageUrl.includes('/uploads/')) {
        return imageUrl.split('/uploads/')[1].split('?')[0];
      }
    }
    
    return null;
  };

  // Simple markdown to HTML conversion for preview
  // Uses shared renderer but with additional cleanup for corrupted HTML fragments
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return '';
    
    // First, try to extract image URLs from corrupted HTML fragments before cleaning
    // This MUST happen before any other processing to recover valid image URLs
    let cleanedMarkdown = markdown;
    const extractedImages: string[] = [];
    
    // Extract image URLs from onerror handlers - comprehensive pattern matching
    // Pattern 1: File ID on one line, onerror on next line with URL
    cleanedMarkdown = cleanedMarkdown.replace(/([a-f0-9]{32,})\s*\n\s*onerror\s*=\s*["']handleImageError[^"']*["'][^"']*["']([^"']*\/api\/uploads\/[^"']*\.(jpg|jpeg|png|gif|webp))[^"']*["']/gi, (match, fileId, imageUrl) => {
      if (imageUrl && imageUrl.includes('/api/uploads/') && !extractedImages.includes(imageUrl)) {
        extractedImages.push(imageUrl);
        const fileName = imageUrl.split('/').pop() || '';
        const altText = fileName.replace(/\.[^/.]+$/, '');
        return `![${altText}](${imageUrl})`;
      }
      return '';
    });
    
    // Pattern 2: File ID and onerror on same line
    cleanedMarkdown = cleanedMarkdown.replace(/([a-f0-9]{32,})[^\n]*onerror\s*=\s*["']handleImageError[^"']*["'][^"']*["']([^"']*\/api\/uploads\/[^"']*\.(jpg|jpeg|png|gif|webp))[^"']*["']/gi, (match, fileId, imageUrl) => {
      if (imageUrl && imageUrl.includes('/api/uploads/') && !extractedImages.includes(imageUrl)) {
        extractedImages.push(imageUrl);
        const fileName = imageUrl.split('/').pop() || '';
        const altText = fileName.replace(/\.[^/.]+$/, '');
        return `![${altText}](${imageUrl})`;
      }
      return '';
    });
    
    // Pattern 3: Simpler pattern - just file ID and onerror with URL (any format)
    cleanedMarkdown = cleanedMarkdown.replace(/([a-f0-9]{32,})[^\n]*onerror[^\n]*["']([^"']*\/api\/uploads\/[^"']*\.(jpg|jpeg|png|gif|webp))[^"']*["']/gi, (match, fileId, imageUrl) => {
      if (imageUrl && imageUrl.includes('/api/uploads/') && !extractedImages.includes(imageUrl)) {
        extractedImages.push(imageUrl);
        const fileName = imageUrl.split('/').pop() || '';
        const altText = fileName.replace(/\.[^/.]+$/, '');
        return `![${altText}](${imageUrl})`;
      }
      return '';
    });
    
    // Pattern 4: Extract URL directly from onerror string (even if multiline)
    cleanedMarkdown = cleanedMarkdown.replace(/onerror\s*=\s*["']handleImageError[^"']*["'][^"']*["']([^"']*\/api\/uploads\/[^"']*\.(jpg|jpeg|png|gif|webp))[^"']*["']/gi, (match, imageUrl) => {
      if (imageUrl && imageUrl.includes('/api/uploads/') && !extractedImages.includes(imageUrl)) {
        extractedImages.push(imageUrl);
        const fileName = imageUrl.split('/').pop() || '';
        const altText = fileName.replace(/\.[^/.]+$/, '');
        return `![${altText}](${imageUrl})`;
      }
      return '';
    });
    
    // Extract from data-image-url attributes
    cleanedMarkdown = cleanedMarkdown.replace(/data-image-url\s*=\s*["']([^"']*\/api\/uploads\/[^"']*\.(jpg|jpeg|png|gif|webp))["']/gi, (match, imageUrl) => {
      if (imageUrl && !extractedImages.includes(imageUrl)) {
        extractedImages.push(imageUrl);
        const fileName = imageUrl.split('/').pop() || '';
        const altText = fileName.replace(/\.[^/.]+$/, '');
        return `![${altText}](${imageUrl})`;
      }
      return '';
    });
    
    // Extract standalone image URLs (including those in onerror handlers)
    // Note: replace callback parameters are: (match, p1, p2, ..., offset, string)
    // where p1, p2, etc. are capture groups
    cleanedMarkdown = cleanedMarkdown.replace(/http:\/\/localhost:300[01]\/api\/uploads\/[^\s"'<>]*\.(jpg|jpeg|png|gif|webp)/gi, (match, extension, offset, string) => {
      // Type guard: ensure string is actually a string
      if (typeof string !== 'string' || typeof offset !== 'number') {
        // If parameters are wrong, just return the match
        return match;
      }
      
      // Check if this URL is already part of a markdown image
      const beforeMatch = string.substring(Math.max(0, offset - 50), offset);
      const afterMatch = string.substring(offset + match.length, Math.min(string.length, offset + match.length + 10));
      
      // If it's already in markdown format, don't modify it
      if (beforeMatch.includes('](') || afterMatch.includes(')')) {
        return match;
      }
      
      if (match && !extractedImages.includes(match)) {
        extractedImages.push(match);
        const fileName = match.split('/').pop() || '';
        const altText = fileName.replace(/\.[^/.]+$/, '');
        return `![${altText}](${match})`;
      }
      return match;
    });
    
    // Only clean if we detect invalid code, otherwise preserve original markdown
    const hasInvalidCode =
      cleanedMarkdown.includes('onerror') ||
      cleanedMarkdown.includes('onclick') ||
      cleanedMarkdown.includes('<script') ||
      cleanedMarkdown.includes('document.getElementById') ||
      cleanedMarkdown.includes('container.appendChild') ||
      cleanedMarkdown.includes('data-image-url') ||
      cleanedMarkdown.includes('handleImageError');
    
    if (hasInvalidCode) {
      // Clean up any HTML/JavaScript code that might have been accidentally inserted
      // Remove any onerror attributes or script tags that might be in the markdown
      // But preserve markdown image syntax: ![alt](url)
      cleanedMarkdown = cleanedMarkdown
        // Remove file ID followed by onerror and other HTML fragments (multiline) - VERY aggressive
        // Pattern 1: File ID, onerror with newlines, then />
        .replace(/([a-f0-9]{32,})[^\n]*onerror\s*=\s*["'][^"']*["'][\s\S]*?(\/>|\/[\s\n]*>)/gim, '') // Pattern 2: File ID on one line, onerror on next line(s), then />
          .replace(/([a-f0-9]{32,})\s*\n\s*onerror\s*=\s*["'][^"']*["'][\s\S]*?(\/>|\/[\s\n]*>)/gim, '') // Pattern 3: File ID followed immediately by onerror (no space)
          .replace(/([a-f0-9]{32,})onerror\s*=\s*["'][^"']*["'][\s\S]*?(\/>|\/[\s\n]*>)/gim, '') // Pattern 4: File ID on its own line, then onerror on next line (with any whitespace)
          .replace(/^([a-f0-9]{32,})\s*$\n\s*onerror\s*=\s*["'][^"']*["'][\s\S]*?(\/>|\/[\s\n]*>)/gim, '')
        // Pattern 5: Any remaining file ID + onerror combinations?.replace(/([a-f0-9]{32,})[^\n]*onerror[^\n]*["'][^"']*["'][\s\S]*?(\/>|\/[\s\n]*>)/gim, '') // Remove any onerror attributes that are NOT part of markdown image syntax?.replace(/(?<!!\[[^\]]*\]\([^)]*)onerror\s*=\s*"[^"]*"/gi, '')
          .replace(/(?<!!\[[^\]]*\]\([^)]*)onerror\s*=\s*'[^']*'/gi, '')
        // Remove handleImageError function calls?.replace(/handleImageError\s*\([^)]*\)/gi, '')
        // Remove any script tags?.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove any onclick attributes that are NOT part of markdown links?.replace(/(?<!\[[^\]]*\]\([^)]*)onclick\s*=\s*"[^"]*"/gi, '')
          .replace(/(?<!\[[^\]]*\]\([^)]*)onclick\s*=\s*'[^']*'/gi, '') // Remove data attributes?.replace(/\s*data-image-url\s*=\s*["'][^"']*["']/gi, '')
          .replace(/\s*data-image-id\s*=\s*["'][^"']*["']/gi, '')
        // Remove title attributes?.replace(/\s*title\s*=\s*["'][^"']*["']/gi, '')
        // Remove style attributes?.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '') // Remove standalone closing tags?.replace(/\/>\s*/g, '')
          .replace(/\/[\s\n]*>/g, '')
        // Clean up any stray HTML tags that shouldn't be there
        // But preserve markdown image syntax?.replace(/(?<!!\[[^\]]*\]\([^)]*)<div[^>]*>/gi, '')
        .replace(/(?<!!\[[^\]]*\]\([^)]*)<\/div>/gi, '')
        .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
        // Remove standalone file IDs (not part of URLs) - be VERY aggressive?.replace(/^([a-f0-9]{32,})(?![-\.\/])$/gim, '')
        // Remove file IDs followed by line breaks and HTML fragments?.replace(/^([a-f0-9]{32,})\s*$/gim, '')
        // Remove file IDs that are on their own lines with any whitespace?.replace(/^\s*([a-f0-9]{32,})\s*$/gim, '')
        // Remove button symbols?.replace(/×/g, '') // Remove any remaining /> or /> patterns?.replace(/^\s*\/>\s*$/gim, '')
          .replace(/^\s*\/[\s\n]*>\s*$/gim, '')
        // Clean up multiple newlines?.replace(/\n{3,}/g, '\n\n') // Final pass: remove any remaining standalone file IDs?.replace(/^\s*([a-f0-9]{32,})\s*$/gim, '')
          .trim();
    }
    
    // Final safety check: Remove any remaining HTML fragments before rendering
    // This ensures we never render HTML code as text
    cleanedMarkdown = cleanedMarkdown
      // Remove any standalone onerror attributes?.replace(/onerror\s*=\s*["'][^"']*["']/gi, '')
      // Remove any standalone /> tags?.replace(/\/>/g, '')
      // Remove any remaining HTML attribute patterns?.replace(/\s+[a-z-]+\s*=\s*["'][^"']*["']/gi, '') // Clean up extra whitespace?.replace(/\s{2,}/g, ' ')
          .trim();
    
    // Use shared renderer for consistent formatting (with admin controls enabled)
    return renderMarkdownToHtml(cleanedMarkdown, { includeImageControls: true });
  };

  return (
    <div className={cn("border border-gray-300 rounded-lg overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-1">
          {toolbarActions.map((action, index) => (
            <ToolbarButton
              key={index}
              icon={action.icon}
              title={action.title}
              onClick={action.action}
              label={(action as any).label}
            />
          ))}

          {/* Hidden DOCX input */}
          <input
            ref={docxInputRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleDocxFileChange}
            className="hidden"
          />
          
          {/* Image Upload Button */}
          <div className="relative">
            <button
              type="button"
              onClick={handleImageButtonClick}
              disabled={uploading}
              title={uploading ? 'Uploading...' : 'Upload Image'}
              className={cn(
                "p-2 rounded hover:bg-gray-100 transition-colors",
                uploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {uploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
              ) : (
                <Image className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={cn(
              "flex items-center px-3 py-1 text-sm rounded transition-colors",
              mode === 'edit' 
                ? "bg-primary/10 text-primary" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={cn(
              "flex items-center px-3 py-1 text-sm rounded transition-colors",
              mode === 'preview' 
                ? "bg-primary/10 text-primary" 
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ height }}>
        {mode === 'edit' ? (
          <textarea
            data-markdown-editor
            value={value}
            onChange={handleTextareaChange}
            onSelect={handleTextSelection}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="w-full h-full p-4 border-0 resize-none focus:outline-none focus:ring-0 font-mono text-sm"
          />
        ) : (
          <div 
            className="w-full h-full p-4 overflow-auto prose prose-sm max-w-none group [&_div[data-image-id]]:select-none [&_button]:select-none [&_img]:select-none"
            dangerouslySetInnerHTML={{ 
              __html: (() => {
                console.log('Preview mode: Starting renderMarkdown with value:', value.substring(0, 200));
                const html = renderMarkdown(value);
                // Debug: Check if markdown contains images and if they're rendered
                const hasImageMarkdown = /!\[.*?\]\(.*?\)/g.test(value);
                if (hasImageMarkdown) {
                  console.log('Preview: Markdown contains images:', value.match(/!\[.*?\]\(.*?\)/g));
                  console.log('Preview: Rendered HTML contains <img> tags:', html.includes('<img'));
                  console.log('Preview: Rendered HTML preview:', html.substring(0, 500));
                  // Count images in HTML
                  const imgMatches = html.match(/<img[^>]*>/gi) || [];
                  console.log('Preview: Found', imgMatches.length, 'img tags in rendered HTML');
                }
                return html;
              })()
            }}
            onClick={(e) => {
              // Handle delete button clicks in preview
              const target = e.target as HTMLElement;
              const deleteButton = target.closest('.delete-image-btn') as HTMLElement;
              if (deleteButton) {
                // Let the event delegation handler process this
                // Don't stop propagation here, let it bubble to document level
                return;
              }
              // For other clicks, do nothing
            }}
            onCopy={(e) => {
              // Intercept copy event to prevent copying HTML code
              // Try to get the selected text from the DOM
              const selection = window.getSelection();
              if (selection && selection.toString().trim()) {
                const selectedText = selection.toString();
                
                // Check if the selection contains HTML code patterns
                const hasHtmlCode = /onerror\s*=|data-image-url|<div|<button|handleImageError/i.test(selectedText);
                
                if (hasHtmlCode) {
                  // Prevent copying HTML code
                  e.preventDefault();
                  
                  // Show notification
                  const notification = document.createElement('div');
                  notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
                  notification.textContent = 'Cannot copy HTML code. Switch to edit mode to copy Markdown.';
                  document.body.appendChild(notification);
                  setTimeout(() => {
                    notification.remove();
                  }, 3000);
                }
                // If no HTML code detected, allow normal copy
              }
            }}
          />
        )}
      </div>
    </div>
  );
}