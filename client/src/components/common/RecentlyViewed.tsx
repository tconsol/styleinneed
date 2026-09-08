import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { useRecentlyViewedStore } from '../../stores/recentlyViewedStore';
import { useMoney } from '../../hooks/useMoney';

/**
 * Horizontal strip of the visitor's recently viewed products.
 * `excludeId` keeps the product they're currently looking at out of the list.
 */
export default function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const items = useRecentlyViewedStore((s) => s.items);
  const clear = useRecentlyViewedStore((s) => s.clear);
  const { format } = useMoney();

  const list = items.filter((i) => i._id !== excludeId);
  if (list.length === 0) return null;

  return (
    <section className="container-custom py-12">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-brand-text">
          <History size={18} className="text-primary" /> Recently Viewed
        </h2>
        <button
          onClick={clear}
          className="font-body text-xs text-brand-muted transition-colors hover:text-brand-text"
        >
          Clear
        </button>
      </div>

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
        {list.map((p) => (
          <Link key={p._id} to={`/products/${p.slug}`} className="group w-[150px] flex-shrink-0">
            <div className="aspect-product overflow-hidden bg-brand-surface">
              <img
                src={p.images?.[0] || '/placeholder.jpg'}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <p className="mt-2 line-clamp-1 font-body text-[13px] text-brand-text">{p.name}</p>
            <p className="font-body text-[13px] font-semibold text-brand-text">
              {format(p.salePrice, p.usdSalePrice)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
