import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Scale, Check, Minus, ShoppingBag, Plus, Trophy, Star,
  RotateCcw, Layers, Filter, Sparkles,
} from 'lucide-react';
import { useCompareStore, COMPARE_MAX } from '../stores/compareStore';
import { useCartStore } from '../stores/cartStore';
import { useMoney } from '../hooks/useMoney';
import { useSeo } from '../hooks/useSeo';
import { getDiscountBadge } from '../utils/format';
import { thumb, thumbSrcSet } from '../utils/image';
import type { Product } from '../types';

const prettify = (slug: string) =>
  slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const inStock = (p: Product) => !!p.variants?.some((v) => v.stock > 0);

interface Row {
  key: string;
  label: string;
  group: string;
  /** Plain text per product — used both to render and to detect differences. */
  values: string[];
  render?: (p: Product, i: number) => React.ReactNode;
}

export default function ComparePage() {
  useSeo({ title: 'Compare Products', noIndex: true });

  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);
  const { format } = useMoney();

  const [diffOnly, setDiffOnly] = useState(false);

  /**
   * Which product wins on price and rating.
   *
   * Only meaningful with more than one product, and only when they actually
   * differ — badging a "best price" when every price is identical is noise.
   */
  const best = useMemo(() => {
    if (items.length < 2) return { price: -1, rating: -1 };

    const prices = items.map((p) => p.salePrice);
    const ratings = items.map((p) => (p.ratings?.count ? p.ratings.average : -1));

    const allSamePrice = new Set(prices).size === 1;
    const anyRated = ratings.some((r) => r >= 0);
    const allSameRating = new Set(ratings).size === 1;

    return {
      price: allSamePrice ? -1 : prices.indexOf(Math.min(...prices)),
      rating: !anyRated || allSameRating ? -1 : ratings.indexOf(Math.max(...ratings)),
    };
  }, [items]);

  const rows = useMemo<Row[]>(() => {
    if (items.length === 0) return [];

    const attrKeys = [...new Set(items.flatMap((p) => Object.keys(p.attributes || {})))];

    /** Every value seen across a product's variants for one attribute. */
    const variantValues = (p: Product, slug: string): string[] => {
      const seen = new Set<string>();
      (p.variants || []).forEach((v) => {
        const val = v.attributes?.[slug];
        if (val) seen.add(val);
      });
      return [...seen];
    };

    const variantAttrKeys = [...new Set(
      items.flatMap((p) => (p.variants || []).flatMap((v) => Object.keys(v.attributes || {})))
    )];

    const badges = (p: Product): string[] => [
      p.isBestSeller && 'Bestseller',
      p.isNewArrival && 'New',
      p.isTrending && 'Trending',
      p.isFeatured && 'Featured',
    ].filter(Boolean) as string[];

    const totalStock = (p: Product) =>
      (p.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);

    const base: Row[] = [
      {
        key: 'price',
        label: 'Price',
        group: 'Pricing',
        values: items.map((p) => String(p.salePrice)),
        render: (p, i) => (
          <div>
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-heading text-[15px] font-semibold text-brand-text">
                {format(p.salePrice, p.usdSalePrice)}
              </span>
              {p.mrp > p.salePrice && (
                <span className="font-body text-[10px] text-brand-muted line-through">
                  {format(p.mrp, p.usdMrp)}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {p.mrp > p.salePrice && (
                <span className="rounded bg-emerald-50 px-1 py-px font-body text-[9px] font-bold text-emerald-700">
                  {getDiscountBadge(p.mrp, p.salePrice)}% OFF
                </span>
              )}
              {best.price === i && (
                <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-px font-body text-[9px] font-bold text-primary">
                  <Trophy size={8} /> Best price
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'saving',
        label: 'You save',
        group: 'Pricing',
        values: items.map((p) => (p.mrp > p.salePrice ? String(p.mrp - p.salePrice) : '0')),
        render: (p) =>
          p.mrp > p.salePrice ? (
            <span className="font-body text-[12px] font-semibold text-emerald-700">
              {format(p.mrp - p.salePrice, p.usdMrp && p.usdSalePrice ? p.usdMrp - p.usdSalePrice : undefined)}
            </span>
          ) : (
            <span className="font-body text-[12px] text-brand-muted">&mdash;</span>
          ),
      },
      {
        key: 'rating',
        label: 'Rating',
        group: 'Reputation',
        values: items.map((p) => (p.ratings?.count ? `${p.ratings.average} (${p.ratings.count})` : '-')),
        render: (p, i) =>
          p.ratings?.count ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="inline-flex items-center gap-0.5 font-body text-[12px] font-semibold text-brand-text">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                {p.ratings.average}
              </span>
              <span className="font-body text-[10px] text-brand-muted">({p.ratings.count})</span>
              {best.rating === i && (
                <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-px font-body text-[9px] font-bold text-primary">
                  <Trophy size={8} /> Top
                </span>
              )}
            </div>
          ) : (
            <span className="font-body text-[12px] text-brand-muted">No reviews</span>
          ),
      },
      {
        key: 'badges',
        label: 'Highlights',
        group: 'Reputation',
        values: items.map((p) => badges(p).join(', ') || '-'),
        render: (p) => {
          const b = badges(p);
          return b.length ? (
            <div className="flex flex-wrap gap-1">
              {b.map((x) => (
                <span key={x} className="rounded bg-primary/10 px-1 py-px font-body text-[9px] font-semibold text-primary">
                  {x}
                </span>
              ))}
            </div>
          ) : <span className="font-body text-[12px] text-brand-muted">&mdash;</span>;
        },
      },
      {
        key: 'availability',
        label: 'Availability',
        group: 'Reputation',
        values: items.map((p) => (inStock(p) ? 'In stock' : 'Out of stock')),
        render: (p) =>
          inStock(p) ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-body text-[10px] font-semibold text-emerald-700">
              <Check size={10} /> In stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-brand-bg px-1.5 py-0.5 font-body text-[10px] font-semibold text-brand-muted">
              <Minus size={10} /> Sold out
            </span>
          ),
      },
      {
        key: 'stock',
        label: 'Units left',
        group: 'Reputation',
        values: items.map((p) => String(totalStock(p))),
        render: (p) => {
          const n = totalStock(p);
          return (
            <span className={`font-body text-[12px] ${n === 0 ? 'text-brand-muted' : n <= 5 ? 'font-semibold text-amber-600' : 'text-brand-text'}`}>
              {n === 0 ? '\u2014' : n <= 5 ? `Only ${n} left` : n}
            </span>
          );
        },
      },
      {
        key: 'productType',
        label: 'Type',
        group: 'Details',
        values: items.map((p) => (p.productType ? prettify(p.productType) : '-')),
      },
      {
        key: 'category',
        label: 'Category',
        group: 'Details',
        values: items.map((p) => p.category?.name || '-'),
      },
      {
        key: 'collections',
        label: 'Collections',
        group: 'Details',
        values: items.map((p) => (p.collections || []).map((c) => c.name).join(', ') || '-'),
      },
      {
        key: 'variants',
        label: 'Options',
        group: 'Details',
        values: items.map((p) => {
          const n = p.variants?.length || 0;
          return n ? `${n} variant${n > 1 ? 's' : ''}` : '-';
        }),
      },
      {
        key: 'weight',
        label: 'Weight',
        group: 'Details',
        values: items.map((p) => (p.weightGrams ? `${p.weightGrams} g` : '-')),
      },
      {
        key: 'returns',
        label: 'Returns',
        group: 'Details',
        values: items.map((p) => (p.returnDays ? `${p.returnDays}-day returns` : 'Non-returnable')),
        render: (p) => (
          <span className="inline-flex items-center gap-1 font-body text-[12px] text-brand-text">
            <RotateCcw size={10} className={p.returnDays ? 'text-emerald-600' : 'text-brand-muted'} />
            {p.returnDays ? `${p.returnDays} days` : 'Non-returnable'}
          </span>
        ),
      },
      {
        key: 'tags',
        label: 'Tags',
        group: 'Details',
        values: items.map((p) => (p.tags || []).join(', ') || '-'),
        render: (p) => {
          const t = p.tags || [];
          return t.length ? (
            <div className="flex flex-wrap gap-0.5">
              {t.slice(0, 6).map((x) => (
                <span key={x} className="rounded bg-brand-bg px-1 py-px font-body text-[9px] text-brand-muted">
                  {x}
                </span>
              ))}
            </div>
          ) : <span className="font-body text-[12px] text-brand-muted">&mdash;</span>;
        },
      },
      {
        key: 'summary',
        label: 'Overview',
        group: 'Details',
        values: items.map((p) => p.shortDescription || p.description?.slice(0, 140) || '-'),
        render: (p) => (
          <p className="line-clamp-4 font-body text-[11px] leading-relaxed text-brand-muted">
            {p.shortDescription || p.description || '\u2014'}
          </p>
        ),
      },
    ];

    /** Variant-level attributes: every size, colour and so on that is offered. */
    const variantRows: Row[] = variantAttrKeys.map((slug) => ({
      key: `variant:${slug}`,
      label: prettify(slug),
      group: 'Available options',
      values: items.map((p) => variantValues(p, slug).join(', ') || '-'),
      render: (p) => {
        const vals = variantValues(p, slug);
        return vals.length ? (
          <div className="flex flex-wrap gap-0.5">
            {vals.map((v) => (
              <span key={v} className="rounded border border-brand-border px-1 py-px font-body text-[9px] text-brand-text">
                {v}
              </span>
            ))}
          </div>
        ) : <span className="font-body text-[12px] text-brand-muted">&mdash;</span>;
      },
    }));

    const attrs: Row[] = attrKeys.map((slug) => ({
      key: `attr:${slug}`,
      label: prettify(slug),
      group: 'Specifications',
      values: items.map((p) => {
        const v = p.attributes?.[slug];
        return Array.isArray(v) && v.length ? v.join(', ') : '-';
      }),
    }));

    return [...base, ...variantRows, ...attrs];
  }, [items, best, format]);

  /** A row where every product says the same thing adds nothing to a comparison. */
  const differing = useMemo(
    () => rows.filter((r) => new Set(r.values).size > 1),
    [rows]
  );
  const identicalCount = rows.length - differing.length;
  const shown = diffOnly ? differing : rows;
  const groups = [...new Set(shown.map((r) => r.group))];

  if (items.length === 0) {
    return (
      <div
        className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: 'var(--topbar-height)' }}
      >
        <div className="mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-brand-surface shadow-sm ring-1 ring-brand-border">
          <Scale size={34} className="text-primary" />
        </div>
        <h1 className="heading-sm text-brand-text">Nothing to compare yet</h1>
        <p className="mt-2 max-w-sm font-body text-sm text-brand-muted">
          Tap the compare icon on any product to line it up against others — price, rating,
          fabric and more, side by side.
        </p>
        <Link to="/products" className="btn-primary mt-6">
          <Sparkles size={15} /> Browse products
        </Link>
      </div>
    );
  }

  /* Empty slots invite a third or fourth product rather than leaving a gap. */
  const emptySlots = Math.max(0, Math.min(COMPARE_MAX, 4) - items.length);
  // Narrow enough that four products plus the label gutter fit a 1280px laptop
  // without horizontal scrolling.
  const columnWidth = `minmax(150px, 1fr)`;

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-8 lg:py-10">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <Scale size={13} /> Comparison
            </p>
            <h1 className="heading-sm mt-1 text-brand-text">
              {items.length} product{items.length > 1 ? 's' : ''} side by side
            </h1>
            {identicalCount > 0 && (
              <p className="mt-1 font-body text-sm text-brand-muted">
                {differing.length} of {rows.length} details differ
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {identicalCount > 0 && (
              <button
                onClick={() => setDiffOnly((d) => !d)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-body text-xs font-semibold transition-colors ${
                  diffOnly
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-brand-border text-brand-muted hover:text-brand-text'
                }`}
              >
                <Filter size={13} />
                {diffOnly ? 'Showing differences' : 'Differences only'}
              </button>
            )}
            <button
              onClick={clear}
              className="rounded-lg border border-brand-border px-3 py-2 font-body text-xs font-semibold text-brand-muted transition-colors hover:text-brand-text"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Grid. One horizontal scroller so the label column and the cells can
            never drift out of alignment, which a table-per-section would risk. */}
        <div className="overflow-x-auto pb-2">
          <div
            className="min-w-[560px]"
            style={{
              display: 'grid',
              gridTemplateColumns: `104px repeat(${items.length + emptySlots}, ${columnWidth})`,
              columnGap: '8px',
            }}
          >
            {/* Sticky product cards */}
            <div className="sticky top-[var(--topbar-height)] z-10 bg-brand-bg" />
            {items.map((p) => (
              <div
                key={p._id}
                className="sticky top-[var(--topbar-height)] z-10 bg-brand-bg pb-3 pt-1"
              >
                <div className="group relative overflow-hidden rounded-2xl border border-brand-border bg-brand-surface transition-shadow hover:shadow-luxury">
                  <button
                    onClick={() => remove(p._id)}
                    aria-label={`Remove ${p.name}`}
                    className="absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-brand-muted shadow-sm backdrop-blur transition-colors hover:text-red-500"
                  >
                    <X size={12} />
                  </button>

                  <Link to={`/products/${p.slug}`}>
                    <div className="aspect-[4/3] overflow-hidden bg-brand-bg">
                      <img
                        src={thumb(p.images?.[0], 240)}
                        srcSet={thumbSrcSet(p.images?.[0], 240, 480)}
                        sizes="160px"
                        alt={p.name}
                        width={240}
                        height={180}
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="px-2 pt-1.5">
                      <p className="line-clamp-2 font-body text-[11px] font-medium leading-snug text-brand-text">
                        {p.name}
                      </p>
                      <p className="mt-0.5 font-heading text-[13px] font-semibold text-brand-text">
                        {format(p.salePrice, p.usdSalePrice)}
                      </p>
                    </div>
                  </Link>

                  <div className="p-2 pt-1.5">
                    {(() => {
                      const variant = p.variants?.find((v) => v.stock > 0);
                      return (
                        <button
                          onClick={() => variant && addItem(p._id, variant.sku, 1, p)}
                          disabled={!variant}
                          className="btn-primary w-full justify-center !py-1.5 text-[10px] disabled:opacity-50"
                        >
                          <ShoppingBag size={11} /> {variant ? 'Add to cart' : 'Sold out'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}

            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`slot-${i}`} className="sticky top-[var(--topbar-height)] z-10 bg-brand-bg pb-3 pt-1">
                <Link
                  to="/products"
                  className="flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-border text-brand-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus size={18} />
                  <span className="font-body text-[10px] font-medium">Add a product</span>
                </Link>
              </div>
            ))}

            {/* Spec rows, grouped */}
            {groups.map((group) => (
              <SpecGroup
                key={group}
                group={group}
                rows={shown.filter((r) => r.group === group)}
                items={items}
                emptySlots={emptySlots}
              />
            ))}
          </div>
        </div>

        {diffOnly && differing.length === 0 && (
          <p className="py-10 text-center font-body text-sm text-brand-muted">
            These products are identical on every detail we track.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * A group heading plus its rows, emitted as flat grid children.
 *
 * They can't be wrapped in a container element: everything must remain a direct
 * child of the grid, or the columns stop lining up with the product cards.
 */
function SpecGroup({
  group, rows, items, emptySlots,
}: {
  group: string;
  rows: Row[];
  items: Product[];
  emptySlots: number;
}) {
  const span = 1 + items.length + emptySlots;

  return (
    <>
      <div style={{ gridColumn: `span ${span}` }} className="pb-1 pt-3.5">
        <div className="flex items-center gap-2">
          <Layers size={10} className="text-primary" />
          <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-brand-muted">
            {group}
          </span>
          <span className="h-px flex-1 bg-brand-border" />
        </div>
      </div>

      {rows.map((row, ri) => (
        <SpecRow key={row.key} row={row} items={items} emptySlots={emptySlots} zebra={ri % 2 === 1} />
      ))}
    </>
  );
}

function SpecRow({
  row, items, emptySlots, zebra,
}: {
  row: Row;
  items: Product[];
  emptySlots: number;
  zebra: boolean;
}) {
  const cell = 'py-1.5 font-body text-[12px] leading-snug text-brand-text';
  const bg = zebra ? 'bg-brand-surface/60' : '';

  return (
    <>
      <div className={`${cell} ${bg} rounded-l-md pl-2 pr-1 font-body text-[9px] font-semibold uppercase tracking-wider text-brand-muted`}>
        {row.label}
      </div>
      {items.map((p, i) => (
        <div key={p._id} className={`${cell} ${bg} px-1.5`}>
          {row.render ? row.render(p, i) : <span>{row.values[i]}</span>}
        </div>
      ))}
      {Array.from({ length: emptySlots }).map((_, i) => (
        <div key={`e-${i}`} className={`${cell} ${bg} ${i === emptySlots - 1 ? 'rounded-r-md' : ''}`} />
      ))}
    </>
  );
}
