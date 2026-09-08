import { Request, Response, NextFunction } from 'express';
import Product from '../models/Product';
import Category from '../models/Category';
import Collection from '../models/Collection';
import Blog from '../models/Blog';
import { primaryClientUrl } from '../middleware/security';

/** XML-escape a URL/text node. */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

interface UrlEntry {
  loc: string;
  lastmod?: Date;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
}

const urlNode = (u: UrlEntry): string =>
  [
    '  <url>',
    `    <loc>${esc(u.loc)}</loc>`,
    u.lastmod ? `    <lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
    u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>` : '',
    u.priority != null ? `    <priority>${u.priority.toFixed(1)}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');

/**
 * Dynamic sitemap covering every indexable storefront URL: static pages,
 * active products, categories, collections and published blog posts.
 *
 * Served from the API but the <loc>s point at CLIENT_URL, so either proxy
 * `/sitemap.xml` on the storefront host to this endpoint, or reference it from
 * robots.txt (and verify both hosts in Search Console).
 */
export const getSitemap = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const base = primaryClientUrl();

    const [products, categories, collections, blogs] = await Promise.all([
      Product.find({ isActive: true }).select('slug updatedAt').sort('-updatedAt').limit(20_000).lean(),
      Category.find({ isActive: true }).select('slug updatedAt').lean(),
      Collection.find({ isActive: true }).select('slug updatedAt').lean(),
      Blog.find({ isPublished: true }).select('slug updatedAt').limit(5_000).lean(),
    ]);

    const urls: UrlEntry[] = [
      { loc: `${base}/`,            changefreq: 'daily',   priority: 1.0 },
      { loc: `${base}/products`,    changefreq: 'daily',   priority: 0.9 },
      { loc: `${base}/sale`,        changefreq: 'daily',   priority: 0.8 },
      { loc: `${base}/collections`, changefreq: 'weekly',  priority: 0.7 },
      { loc: `${base}/blogs`,       changefreq: 'weekly',  priority: 0.6 },
      ...categories.map((c) => ({
        loc: `${base}/products?category=${encodeURIComponent(c.slug)}`,
        lastmod: c.updatedAt, changefreq: 'weekly' as const, priority: 0.8,
      })),
      ...collections.map((c) => ({
        loc: `${base}/products?collection=${encodeURIComponent(c.slug)}`,
        lastmod: c.updatedAt, changefreq: 'weekly' as const, priority: 0.7,
      })),
      ...products.map((p) => ({
        loc: `${base}/products/${encodeURIComponent(p.slug)}`,
        lastmod: p.updatedAt, changefreq: 'weekly' as const, priority: 0.9,
      })),
      ...blogs.map((b) => ({
        loc: `${base}/blogs/${encodeURIComponent(b.slug)}`,
        lastmod: b.updatedAt, changefreq: 'monthly' as const, priority: 0.5,
      })),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(urlNode),
      '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    next(err);
  }
};

/** robots.txt pointing crawlers at the sitemap and away from private areas. */
export const getRobots = (req: Request, res: Response): void => {
  const base = primaryClientUrl();
  const apiOrigin = `${req.protocol}://${req.get('host')}`;
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /checkout',
    'Disallow: /cart',
    'Disallow: /profile',
    'Disallow: /orders',
    'Disallow: /addresses',
    'Disallow: /returns',
    'Disallow: /support',
    'Disallow: /auth/',
    'Disallow: /reset-password',
    'Disallow: /unsubscribe',
    'Disallow: /payment-return',
    '',
    `Sitemap: ${apiOrigin}/sitemap.xml`,
    `Host: ${base.replace(/^https?:\/\//, '')}`,
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(body);
};
