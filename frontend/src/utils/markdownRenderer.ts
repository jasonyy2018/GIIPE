/**
 * Shared markdown renderer utility
 * This ensures consistent markdown rendering across admin preview and public pages
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace raw <mark> / <span> blocks (possibly multiline) with placeholders so the
 * line-based markdown parser does not wrap opening/closing tags in separate <p> nodes.
 * Nested same-tag spans are not fully supported (regex limitation).
 */
function protectMarkAndSpanBlocks(markdown: string): { text: string; blocks: string[] } {
  const blocks: string[] = [];
  const text = markdown.replace(/<(mark|span)(\s[^>]*)?>[\s\S]*?<\/\1>/gi, (full) => {
    const i = blocks.length;
    blocks.push(full);
    return `GIIP_RAW_HTML_${i}_END`;
  });
  return { text, blocks };
}

function restoreMarkAndSpanBlocks(html: string, blocks: string[]): string {
  let out = html;
  blocks.forEach((block, i) => {
    const token = `GIIP_RAW_HTML_${i}_END`;
    const esc = escapeRegExp(token);
    out = out.replace(new RegExp(`<p[^>]*>\\s*${esc}\\s*</p>`, 'gi'), block);
    out = out.split(token).join(block);
  });
  return out;
}

/**
 * Convert image URL to relative path (use Next.js proxy to avoid CORS)
 */
function convertImageUrl(src: string): string {
  if (!src || src.trim() === '') return src;
  
  // If it's already a relative URL starting with /api/uploads, use it as is
  if (src.startsWith('/api/uploads/')) {
    return src;
  }
  
  // If it's an absolute URL pointing to localhost:3001, convert to relative path
  if (src.includes('localhost:3001/api/uploads/')) {
    const pathMatch = src.match(/\/api\/uploads\/(.+)$/);
    if (pathMatch) {
      return `/api/uploads/${pathMatch[1]}`;
    }
  }
  
  // If it's an absolute URL with /uploads/ (without /api), convert to /api/uploads/
  if (src.includes('/uploads/') && (src.includes('localhost:3001') || src.includes('localhost:3000'))) {
    const pathMatch = src.match(/\/uploads\/(.+)$/);
    if (pathMatch) {
      return `/api/uploads/${pathMatch[1]}`;
    }
  }
  
  // If it's a relative URL starting with /uploads/, convert to /api/uploads/
  if (src.startsWith('/uploads/')) {
    return `/api${src}`;
  }
  
  // If it's just a filename or relative path, try to construct /api/uploads/images/ path
  if (!src.startsWith('/') && !src.startsWith('http://') && !src.startsWith('https://')) {
    if (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.gif') || src.includes('.webp')) {
      return `/api/uploads/images/${src}`;
    }
  }
  
  return src;
}

/**
 * Render markdown to HTML with consistent formatting
 * This matches the admin preview rendering logic
 */
export function renderMarkdownToHtml(markdown: string, options?: {
  includeImageControls?: boolean; // For admin preview, include delete buttons
}): string {
  if (!markdown) return '';
  
  const { includeImageControls = false } = options || {};

  const { text: mdWithPlaceholders, blocks: rawHtmlBlocks } = protectMarkAndSpanBlocks(markdown);
  
  // Process markdown line by line to handle lists properly
  const lines = mdWithPlaceholders.split('\n');
  const processedLines: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;
  let listItems: string[] = [];
  
  const processInlineMarkdown = (text: string): string => {
    return text
      // Handle markdown images: ![alt](url)
      .replace(/!\[([^\]]*)\]\(([^\)]*)\)/gim, (match, alt, src) => {
        // Clean the URL
        let cleanSrc = src.trim();
        
        // If URL contains whitespace, HTML tags, or quotes, extract just the URL part
        if (cleanSrc.includes(' ') || cleanSrc.includes('<') || cleanSrc.includes('"') || cleanSrc.includes("'")) {
          cleanSrc = cleanSrc.split(/[\s<>"']/)[0];
        }
        
        // Remove any onerror/onclick handlers that might be attached
        cleanSrc = cleanSrc.split('onerror')[0].split('onclick')[0].trim();
        
        if (!cleanSrc) {
          return match; // If URL is invalid, return original match
        }
        
        const imageSrc = convertImageUrl(cleanSrc);
        
        if (includeImageControls) {
          // Admin preview mode: include delete button
          const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const escapedUrl = cleanSrc.replace(/\\/g, '\\\\').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          
          return `<div class="relative inline-block my-4 group" data-image-url="${escapedUrl}" data-image-id="${imageId}">
            <img id="${imageId}" alt="${alt || ''}" src="${imageSrc}" 
              class="max-w-full h-auto rounded-lg" 
              loading="lazy"
              onerror="if(typeof handleImageError === 'function') handleImageError('${imageId}', '${escapedUrl}')"
            />
            <button type="button" class="delete-image-btn absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-opacity cursor-pointer z-10" 
              data-image-url="${escapedUrl}"
              title="Delete image"
              style="opacity: 0.7;"
            >×</button>
          </div>`;
        } else {
          // Public page mode: simple image tag
          return `<img alt="${alt || ''}" src="${imageSrc}" class="max-w-full h-auto rounded-lg my-4" loading="lazy" />`;
        }
      })
      // Handle bold and italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Handle links (support button-style links via [btn:Label](url))
      .replace(/\[([^\]]*)\]\(([^\)]*)\)/gim, (match, rawLabel, rawHref) => {
        const label = String(rawLabel ?? '');
        const href = String(rawHref ?? '');
        const buttonPrefix = /^btn\s*[:：]\s*/i;
        if (buttonPrefix.test(label)) {
          const btnText = label.replace(buttonPrefix, '').trim() || 'Button';
          return `<a href="${href}" class="giip-md-btn" role="button">${btnText}</a>`;
        }
        return `<a href="${href}" class="text-primary hover:text-primary-dark underline">${label}</a>`;
      })
      // Handle inline code
      .replace(/`([^`]*)`/gim, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');
  };
  
  const closeList = () => {
    if (inUnorderedList && listItems.length > 0) {
      processedLines.push(`<ul class="list-disc list-inside my-4 space-y-2">${listItems.join('')}</ul>`);
      listItems = [];
      inUnorderedList = false;
    } else if (inOrderedList && listItems.length > 0) {
      processedLines.push(`<ol class="list-decimal list-inside my-4 space-y-2">${listItems.join('')}</ol>`);
      listItems = [];
      inOrderedList = false;
    }
  };

  /** Parse one GFM table from lines starting at startIndex. Returns HTML and next line index. */
  const parseTable = (startIndex: number): { html: string; nextIndex: number } | null => {
    const parseRow = (line: string): string[] | null => {
      const t = line.trim();
      if (!t.startsWith('|') || !t.endsWith('|')) return null;
      return t
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim().replace(/\\\|/g, '|'));
    };
    const isSeparator = (line: string): boolean => /^\|[\s\-:|]+\|$/.test(line.trim());
    const first = lines[startIndex];
    const row0 = parseRow(first);
    if (!row0 || row0.length === 0) return null;
    const second = lines[startIndex + 1];
    if (!second || !isSeparator(second.trim())) return null;
    const colCount = row0.length;
    const rows: string[][] = [row0];
    let j = startIndex + 2;
    while (j < lines.length) {
      const row = parseRow(lines[j]);
      if (!row || row.length !== colCount) break;
      rows.push(row);
      j++;
    }
    // Build HTML: single-column => Word-like stacked paragraphs; multi-column => <table>
    const processCell = (cell: string) => processInlineMarkdown(cell);
    if (colCount === 1) {
      const paras = rows.map((r) => `<p class="my-2 leading-relaxed text-gray-800 text-center">${processCell(r[0])}</p>`).join('\n');
      return { html: `<div class="my-4 space-y-1">${paras}</div>`, nextIndex: j };
    }
    const thead = `<thead><tr>${row0.map((c) => `<th class="border border-gray-300 px-3 py-2 text-left font-semibold bg-gray-50">${processCell(c)}</th>`).join('')}</tr></thead>`;
    const bodyRows = rows.slice(1).map((r) => `<tr>${r.map((c) => `<td class="border border-gray-300 px-3 py-2">${processCell(c)}</td>`).join('')}</tr>`).join('');
    const tableHtml = `<table class="min-w-full border border-gray-300 border-collapse my-4">${thead}<tbody>${bodyRows}</tbody></table>`;
    return { html: tableHtml, nextIndex: j };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check for headings
    if (trimmedLine.match(/^### /)) {
      closeList();
      processedLines.push(`<h3 class="text-xl font-semibold mt-6 mb-3">${processInlineMarkdown(trimmedLine.replace(/^### /, ''))}</h3>`);
    } else if (trimmedLine.match(/^## /)) {
      closeList();
      processedLines.push(`<h2 class="text-2xl font-bold mt-8 mb-4">${processInlineMarkdown(trimmedLine.replace(/^## /, ''))}</h2>`);
    } else if (trimmedLine.match(/^# /)) {
      closeList();
      processedLines.push(`<h1 class="text-3xl font-bold mt-10 mb-5">${processInlineMarkdown(trimmedLine.replace(/^# /, ''))}</h1>`);
    }
    // Check for blockquotes
    else if (trimmedLine.match(/^> /)) {
      closeList();
      processedLines.push(`<blockquote class="border-l-4 border-gray-300 pl-4 italic my-4">${processInlineMarkdown(trimmedLine.replace(/^> /, ''))}</blockquote>`);
    }
    // Check for unordered list items (-, *, + as in Typora/GFM)
    else if (trimmedLine.match(/^[\-\*\+] /)) {
      const content = trimmedLine.replace(/^[\-\*\+] /, '');
      if (!inUnorderedList && !inOrderedList) {
        inUnorderedList = true;
        listItems.push(`<li class="my-1">${processInlineMarkdown(content)}</li>`);
      } else if (inUnorderedList) {
        listItems.push(`<li class="my-1">${processInlineMarkdown(content)}</li>`);
      } else if (inOrderedList) {
        closeList();
        inUnorderedList = true;
        listItems.push(`<li class="my-1">${processInlineMarkdown(content)}</li>`);
      }
    }
    // Check for ordered list items
    else if (trimmedLine.match(/^\d+\. /)) {
      const content = trimmedLine.replace(/^\d+\. /, '');
      if (!inUnorderedList && !inOrderedList) {
        inOrderedList = true;
        listItems.push(`<li class="my-1">${processInlineMarkdown(content)}</li>`);
      } else if (inOrderedList) {
        listItems.push(`<li class="my-1">${processInlineMarkdown(content)}</li>`);
      } else if (inUnorderedList) {
        closeList();
        inOrderedList = true;
        listItems.push(`<li class="my-1">${processInlineMarkdown(content)}</li>`);
      }
    }
    // Empty line - close any open list
    else if (trimmedLine === '') {
      closeList();
      processedLines.push('');
    }
    // Horizontal rule (Typora-style: ---, ***, ___)
    else if (/^(\*\*\*|---|___)\s*$/.test(trimmedLine)) {
      closeList();
      processedLines.push('<hr class="my-6 border-t border-gray-300" />');
    }
    // Fenced code block (``` optional lang)
    else if (trimmedLine.startsWith('```')) {
      closeList();
      const lang = trimmedLine.slice(3).trim();
      const codeLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('```')) {
        codeLines.push(lines[j]);
        j++;
      }
      const code = codeLines.join('\n');
      const langClass = lang ? ` language-${lang}` : '';
      processedLines.push(`<pre class="my-4 p-4 bg-gray-100 rounded-lg overflow-x-auto text-sm"><code class="${langClass}">${escapeHtml(code)}</code></pre>`);
      i = j; // advance past closing ```
    }
    // GFM table (line starts with | and next line is separator)
    else if (trimmedLine.startsWith('|') && trimmedLine.includes('|', 1)) {
      const tableResult = parseTable(i);
      if (tableResult) {
        closeList();
        processedLines.push(tableResult.html);
        i = tableResult.nextIndex - 1; // loop will increment
      } else {
        closeList();
        processedLines.push(`<p class="my-4 leading-relaxed text-gray-800">${processInlineMarkdown(trimmedLine)}</p>`);
      }
    }
    // Regular text line
    else {
      closeList();
      processedLines.push(`<p class="my-4 leading-relaxed text-gray-800">${processInlineMarkdown(trimmedLine)}</p>`);
    }
  }
  
  // Close any remaining list
  closeList();
  
  // `processedLines` already wraps paragraphs. Keep blank lines as spacing.
  const joined = processedLines.join('\n');
  return restoreMarkAndSpanBlocks(joined, rawHtmlBlocks);
}

