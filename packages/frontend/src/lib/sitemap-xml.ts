/**
 * Генерация XML для sitemap urlset.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://daibilet.ru';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export function toUrlSetXml(urls: SitemapUrl[]): string {
  const lines = urls.map((u) => {
    const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
    const changefreq = u.changefreq ? `\n    <changefreq>${u.changefreq}</changefreq>` : '';
    const priority = u.priority != null ? `\n    <priority>${u.priority}</priority>` : '';
    return `  <url><loc>${u.loc}</loc>${lastmod}${changefreq}${priority}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join('\n')}
</urlset>`;
}

export { SITE_URL };
