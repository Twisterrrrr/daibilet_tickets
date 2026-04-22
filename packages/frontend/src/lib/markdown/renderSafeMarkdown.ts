type RenderOptions = {
  paragraphClassName?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHref(rawHref: string): string | null {
  const href = rawHref.trim();
  if (!href) return null;

  const lower = href.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return null;
  if (lower.startsWith('//')) return null;
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('/') ||
    lower.startsWith('#') ||
    lower.startsWith('mailto:')
  ) {
    return href;
  }
  return null;
}

function sanitizeHtml(html: string): string {
  // Defense-in-depth: even though we escape raw HTML before rendering,
  // we also strip a few dangerous constructs from the resulting markup.
  return (
    html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      // Remove dangerous href protocols if any slipped through.
      .replace(/\s+href=(['"])\s*(javascript:|data:|vbscript:)[\s\S]*?\1/gi, '')
  );
}

export function renderSafeMarkdownToHtml(md: string, opts: RenderOptions = {}): string {
  const paragraphClassName = opts.paragraphClassName ?? 'mt-3 text-slate-700 leading-relaxed';

  // 1) Normalize + forbid raw HTML by escaping everything first.
  const escaped = escapeHtml(md.replace(/\r\n/g, '\n'));

  // 2) Render a small, explicitly supported Markdown subset.
  // Headings
  let html = escaped
    .replace(/^### (.+)$/gm, '<h3 class="mt-6 mb-3 text-lg font-bold text-slate-900">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-8 mb-4 text-xl font-bold text-slate-900">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-8 mb-4 text-2xl font-bold text-slate-900">$1</h1>')
    // HR
    .replace(/^---$/gm, '<hr class="my-8 border-slate-200" />')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Lists (note: keeps existing markup style: <li> without wrapping <ul>)
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-700">$1</li>');

  // Links (support both **[text](url)** and [text](url)).
  // We render safe hrefs only; otherwise we keep the visible text without a link.
  html = html.replace(/\*\*\[(.+?)\]\((.+?)\)\*\*/g, (_m, text: string, href: string) => {
    const safeHref = sanitizeHref(href);
    if (!safeHref) return `<strong>${text}</strong>`;
    return `<a href="${safeHref}" rel="nofollow noopener noreferrer" class="font-semibold text-primary-600 hover:underline"><strong>${text}</strong></a>`;
  });
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_m, text: string, href: string) => {
    const safeHref = sanitizeHref(href);
    if (!safeHref) return text;
    return `<a href="${safeHref}" rel="nofollow noopener noreferrer" class="text-primary-600 hover:underline">${text}</a>`;
  });

  // Paragraphs: keep close to the current behavior (split by blank lines).
  // We only wrap with <p> and don't attempt to restructure headings/lists into blocks.
  html = html
    .replace(/\n\n/g, `</p><p class="${paragraphClassName}">`)
    .replace(/^/, `<p class="${paragraphClassName}">`)
    .replace(/$/, '</p>');

  return sanitizeHtml(html);
}

