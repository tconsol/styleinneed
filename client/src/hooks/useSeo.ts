import { useEffect } from 'react';

const SITE = 'Style In Need Fashions';
/** Marks the tags we manage so we can update (not duplicate) them. */
const OWNED = 'data-seo';

interface SeoOptions {
  title?: string;
  description?: string;
  image?: string;
  /** Canonical path or absolute URL. Defaults to the current location. */
  canonical?: string;
  type?: 'website' | 'product' | 'article';
  /** JSON-LD structured data (schema.org) for rich results. */
  jsonLd?: Record<string, unknown> | null;
  /** Keep the page out of search results (checkout, account pages…). */
  noIndex?: boolean;
}

function upsertMeta(selector: string, attrs: Record<string, string>): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(OWNED, '');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    el.setAttribute(OWNED, '');
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Per-page SEO for this SPA: title, description, Open Graph/Twitter cards,
 * canonical URL and optional JSON-LD. Without it every route would share the
 * single static title in index.html.
 */
export function useSeo({
  title, description, image, canonical, type = 'website', jsonLd, noIndex,
}: SeoOptions): void {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE}` : SITE;
    document.title = fullTitle;

    const url = canonical
      ? (canonical.startsWith('http') ? canonical : `${window.location.origin}${canonical}`)
      : `${window.location.origin}${window.location.pathname}`;

    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description', content: description });
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
      upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    }

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });

    if (image) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
    }

    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: noIndex ? 'noindex, nofollow' : 'index, follow',
    });
    upsertLink('canonical', url);

    // JSON-LD is replaced wholesale per page rather than merged.
    const existing = document.getElementById('seo-jsonld');
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = 'seo-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, image, canonical, type, noIndex, jsonLd]);
}

/** schema.org Product — drives price/rating rich snippets in Google. */
export function productJsonLd(p: {
  name: string; description?: string; images?: string[]; slug: string;
  price: number; currency: string; inStock: boolean;
  rating?: { average: number; count: number };
  brand?: string;
}): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.images?.slice(0, 5),
    sku: p.slug,
    brand: { '@type': 'Brand', name: p.brand || SITE },
    offers: {
      '@type': 'Offer',
      url: `${window.location.origin}/products/${p.slug}`,
      price: p.price,
      priceCurrency: p.currency,
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
  // Google rejects an AggregateRating with zero reviews.
  if (p.rating && p.rating.count > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating.average,
      reviewCount: p.rating.count,
    };
  }
  return ld;
}
