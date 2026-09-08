import { Link } from 'react-router-dom';
import { X, Scale, Check, Minus, ShoppingBag } from 'lucide-react';
import { useCompareStore } from '../stores/compareStore';
import { useCartStore } from '../stores/cartStore';
import { useMoney } from '../hooks/useMoney';
import { useSeo } from '../hooks/useSeo';
import { getDiscountBadge } from '../utils/format';
import type { Product } from '../types';

/** Every attribute name present across the compared products, in a stable order. */
const attributeRows = (items: Product[]): string[] => {
  const seen = new Set<string>();
  items.forEach((p) => Object.keys(p.attributes || {}).forEach((k) => seen.add(k)));
  return [...seen];
};

const prettify = (slug: string) =>
  slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function ComparePage() {
  useSeo({ title: 'Compare Products', noIndex: true });

  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);
  const { format } = useMoney();

  if (items.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center" style={{ paddingTop: 'var(--topbar-height)' }}>
        <Scale size={48} className="mb-4 text-brand-border" />
        <h1 className="heading-sm text-brand-text">Nothing to compare yet</h1>
        <p className="mt-2 max-w-sm font-body text-sm text-brand-muted">
          Add products from any listing using the compare icon, then see them side by side here.
        </p>
        <Link to="/products" className="btn-primary mt-6">Browse products</Link>
      </div>
    );
  }

  const attrRows = attributeRows(items);

  /** One label + one cell per product. */
  const Row = ({ label, render }: { label: string; render: (p: Product) => React.ReactNode }) => (
    <tr className="border-t border-brand-border">
      <th scope="row" className="w-36 py-3 pr-4 text-left align-top font-body text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
        {label}
      </th>
      {items.map((p) => (
        <td key={p._id} className="px-3 py-3 align-top font-body text-sm text-brand-text">{render(p)}</td>
      ))}
    </tr>
  );

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="heading-sm flex items-center gap-2 text-brand-text">
              <Scale size={22} className="text-primary" /> Compare
            </h1>
            <p className="font-body text-sm text-brand-muted">{items.length} product{items.length > 1 ? 's' : ''} side by side</p>
          </div>
          <button onClick={clear} className="font-body text-sm text-brand-muted transition-colors hover:text-brand-text">
            Clear all
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-brand-border bg-brand-surface">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="w-36" />
                {items.map((p) => (
                  <th key={p._id} className="p-3 text-left align-top" style={{ width: `${100 / items.length}%` }}>
                    <div className="relative">
                      <button
                        onClick={() => remove(p._id)}
                        aria-label={`Remove ${p.name}`}
                        className="absolute right-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-full bg-brand-bg/90 text-brand-muted transition-colors hover:text-brand-text"
                      >
                        <X size={14} />
                      </button>
                      <Link to={`/products/${p.slug}`}>
                        <div className="aspect-product overflow-hidden rounded-lg bg-brand-bg">
                          <img src={p.images?.[0] || '/placeholder.jpg'} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                        </div>
                        <p className="mt-2 line-clamp-2 font-body text-sm font-medium text-brand-text">{p.name}</p>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <Row
                label="Price"
                render={(p) => (
                  <span>
                    <span className="font-semibold">{format(p.salePrice, p.usdSalePrice)}</span>
                    {p.mrp > p.salePrice && (
                      <>
                        <span className="ml-2 text-brand-muted line-through">{format(p.mrp, p.usdMrp)}</span>
                        <span className="ml-2 text-[12px] font-semibold text-emerald-600">
                          {getDiscountBadge(p.mrp, p.salePrice)}% off
                        </span>
                      </>
                    )}
                  </span>
                )}
              />
              <Row label="Rating" render={(p) => (p.ratings?.count ? `${p.ratings.average}★ (${p.ratings.count})` : '—')} />
              <Row label="Category" render={(p) => p.category?.name || '—'} />
              <Row
                label="Availability"
                render={(p) =>
                  p.variants?.some((v) => v.stock > 0) ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600"><Check size={14} /> In stock</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-brand-muted"><Minus size={14} /> Out of stock</span>
                  )
                }
              />
              <Row
                label="Options"
                render={(p) => {
                  const skus = p.variants?.length || 0;
                  return skus ? `${skus} variant${skus > 1 ? 's' : ''}` : '—';
                }}
              />
              <Row label="Returns" render={(p) => (p.returnDays ? `${p.returnDays}-day returns` : 'Non-returnable')} />

              {attrRows.map((slug) => (
                <Row
                  key={slug}
                  label={prettify(slug)}
                  render={(p) => {
                    const v = p.attributes?.[slug];
                    return Array.isArray(v) && v.length ? v.join(', ') : '—';
                  }}
                />
              ))}

              <Row
                label=""
                render={(p) => {
                  const variant = p.variants?.find((v) => v.stock > 0);
                  return (
                    <button
                      onClick={() => variant && addItem(p._id, variant.sku, 1, p)}
                      disabled={!variant}
                      className="btn-primary w-full justify-center text-[13px] disabled:opacity-50"
                    >
                      <ShoppingBag size={14} /> {variant ? 'Add to cart' : 'Sold out'}
                    </button>
                  );
                }}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
