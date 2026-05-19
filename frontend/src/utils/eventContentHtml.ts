/**
 * Normalize upload URLs in event HTML (backend may store absolute localhost URLs).
 * Used for public event detail and anywhere we render stored contentHtml.
 */
export function applyNbspEntityFix(html: string): string {
  let h = html;
  for (let i = 0; i < 6; i++) {
    h = h.replace(/&amp;nbsp;/gi, '&#160;');
    h = h.replace(/&amp;#160;/gi, '&#160;');
    h = h.replace(/&amp;#x0*A0;/gi, '&#160;');
  }
  return h;
}

/**
 * Same logic as backend ContentService.applyMarkdownButtonLinks — public pages may still
 * load older DB contentHtml (before re-save / deploy). This fixes [btn:Label](url) output
 * client-side so buttons match admin preview without relying on a DB round-trip.
 */
export function applyMarkdownButtonLinksToHtml(html: string): string {
  return html.replace(/<a(\s[^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs, inner) => {
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
      nextAttrs = `${t ? `${t} ` : ' '}class="giip-md-btn"`;
    }
    if (!/\brole\s*=/i.test(nextAttrs)) {
      nextAttrs = `${nextAttrs.trimEnd()} role="button"`;
    }
    return `<a${nextAttrs}>${newInner}</a>`;
  });
}

/** Match backend ContentService.applyLooseBoldMarkdown — `**text**` left in stored HTML → <strong>. */
export function applyLooseBoldToHtml(html: string): string {
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

/** Full pipeline for public event body HTML (matches backend post-sanitize output). */
export function preparePublicEventContentHtml(html: string): string {
  const step1 = applyNbspEntityFix(html);
  const step2 = applyMarkdownButtonLinksToHtml(step1);
  const step3 = applyLooseBoldToHtml(step2);
  return rewriteEventContentImages(step3);
}

export function rewriteEventContentImages(html: string): string {
  return html.replace(
    /<img\s+([^>]*?)src="([^"]*?)"([^>]*?)>/gi,
    (_match, before: string, src: string, after: string) => {
      let imageSrc = src.trim();
      if (imageSrc.includes('localhost:3001/api/uploads/')) {
        const pathMatch = imageSrc.match(/\/api\/uploads\/(.+)$/);
        if (pathMatch) imageSrc = `/api/uploads/${pathMatch[1]}`;
      } else if (
        imageSrc.includes('/uploads/') &&
        (imageSrc.includes('localhost:3001') || imageSrc.includes('localhost:3000'))
      ) {
        const pathMatch = imageSrc.match(/\/uploads\/(.+)$/);
        if (pathMatch) imageSrc = `/api/uploads/${pathMatch[1]}`;
      } else if (imageSrc.startsWith('/uploads/')) {
        imageSrc = `/api${imageSrc}`;
      }
      const hasClass = /class="[^"]*"/i.test(before + after);
      const classAttr = hasClass ? '' : ' class="max-w-full h-auto rounded-lg my-4"';
      return `<img ${before}src="${imageSrc}"${after}${classAttr}>`;
    }
  );
}
