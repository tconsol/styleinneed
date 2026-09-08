import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useMegaMenuProducts } from '../../hooks/useCatalog';
import { useMoney } from '../../hooks/useMoney';
import type { Category, Collection } from '../../types';

export interface MegaMenuLink {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  href: string;
}

interface Props {
  /** Column heading, e.g. "Shop Sarees by category". */
  heading: string;
  links: MegaMenuLink[];
  /** Product type whose bestsellers fill the right-hand rail (omitted for Collections). */
  productType?: string;
  /** "View everything" target. */
  viewAllHref: string;
  viewAllLabel: string;
  onNavigate: () => void;
}

/** Turn categories/collections into the link shape this menu renders. */
export const categoryLinks = (categories: Category[], typeSlug: string): MegaMenuLink[] =>
  categories
    .filter((c) => c.productType === typeSlug)
    .map((c) => ({
      _id: c._id, name: c.name, slug: c.slug, image: c.image,
      href: `/products?productType=${typeSlug}&category=${c.slug}`,
    }));

export const collectionLinks = (collections: Collection[]): MegaMenuLink[] =>
  collections.map((c) => ({
    _id: c._id, name: c.name, slug: c.slug, image: c.image,
    href: `/products?collection=${c.slug}`,
  }));

export default function MegaMenu({
  heading, links, productType, viewAllHref, viewAllLabel, onNavigate,
}: Props) {
  const { format } = useMoney();
  const { data: products = [], isLoading } = useMegaMenuProducts(productType || '', !!productType);

  const hasRail = !!productType;

  // Frosted glass. The earlier `/98` produced NO background at all — Tailwind's
  // opacity scale has no 98 step, so the class was silently dropped. `/90` is a
  // real step, and the heavy backdrop blur keeps text readable over the hero.
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute inset-x-0 top-full z-50 border-t border-brand-border bg-brand-bg/90 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.22)] backdrop-blur-2xl backdrop-saturate-150"
    >
      <div className="container-custom py-8">
        <div className={`grid gap-10 ${hasRail ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]' : 'grid-cols-1'}`}>
          {/* Categories / collections */}
          <div>
            <p className="mb-4 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted">
              {heading}
            </p>

            {links.length === 0 ? (
              <p className="font-body text-sm text-brand-muted">Nothing here yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {links.map((link) => (
                  <Link
                    key={link._id}
                    to={link.href}
                    onClick={onNavigate}
                    className="group/link flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-brand-surface"
                  >
                    {link.image ? (
                      <img
                        src={link.image}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-1 ring-brand-border"
                      />
                    ) : (
                      <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-primary/10 font-heading text-sm font-semibold text-primary">
                        {link.name.charAt(0)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-body text-sm text-brand-text transition-colors group-hover/link:text-primary">
                      {link.name}
                    </span>
                    <ArrowRight
                      size={13}
                      className="flex-shrink-0 -translate-x-1 text-primary opacity-0 transition-all group-hover/link:translate-x-0 group-hover/link:opacity-100"
                    />
                  </Link>
                ))}
              </div>
            )}

            <Link
              to={viewAllHref}
              onClick={onNavigate}
              className="mt-5 inline-flex items-center gap-1.5 font-body text-[13px] font-semibold text-primary transition-colors hover:text-primary-dark"
            >
              {viewAllLabel} <ArrowRight size={14} />
            </Link>
          </div>

          {/* Popular products for this type */}
          {hasRail && (
            <div>
              <p className="mb-4 flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-muted">
                <Sparkles size={11} className="text-primary" /> Popular right now
              </p>

              {isLoading ? (
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <div className="aspect-product animate-pulse rounded-lg bg-brand-surface" />
                      <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-brand-surface" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <p className="font-body text-sm text-brand-muted">No products in this category yet.</p>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {products.map((p) => (
                    <Link
                      key={p._id}
                      to={`/products/${p.slug}`}
                      onClick={onNavigate}
                      className="group/card"
                    >
                      <div className="aspect-product overflow-hidden rounded-lg bg-brand-surface">
                        <img
                          src={p.images?.[0] || '/placeholder.jpg'}
                          alt={p.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                        />
                      </div>
                      <p className="mt-2 line-clamp-1 font-body text-[13px] text-brand-text transition-colors group-hover/card:text-primary">
                        {p.name}
                      </p>
                      <p className="font-body text-[13px] font-semibold text-brand-text">
                        {format(p.salePrice, p.usdSalePrice)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
