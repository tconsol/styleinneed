import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Tag } from 'lucide-react';
import { productApi } from '../../api/product.api';
import { useMoney } from '../../hooks/useMoney';

interface Suggestion {
  _id: string;
  name: string;
  slug: string;
  images?: string[];
  salePrice: number;
  usdSalePrice?: number;
  category?: { name: string; slug: string };
}
interface CategoryHit { _id: string; name: string; slug: string }

/**
 * Live results under the header search box. Debounced so typing doesn't fire a
 * request per keystroke, and stale responses are discarded so a slow early
 * request can't overwrite the results for what's currently typed.
 */
export default function SearchSuggestions({
  query, onPick,
}: { query: string; onPick: (href: string) => void }) {
  const [products, setProducts] = useState<Suggestion[]>([]);
  const [categories, setCategories] = useState<CategoryHit[]>([]);
  const [loading, setLoading] = useState(false);
  const { format } = useMoney();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setProducts([]); setCategories([]); return; }

    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      productApi.suggest(q)
        .then(({ data }) => {
          if (cancelled) return;
          setProducts(data.data?.products || []);
          setCategories(data.data?.categories || []);
        })
        .catch(() => { if (!cancelled) { setProducts([]); setCategories([]); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);

    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  if (query.trim().length < 2) return null;
  const empty = !loading && products.length === 0 && categories.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1 max-h-[60vh] overflow-y-auto rounded-b-xl bg-brand-surface shadow-luxury"
    >
      {loading && products.length === 0 && (
        <p className="px-4 py-5 text-center font-body text-sm text-brand-muted">Searching…</p>
      )}

      {empty && (
        <p className="px-4 py-5 text-center font-body text-sm text-brand-muted">
          No matches for “{query.trim()}”
        </p>
      )}

      {categories.length > 0 && (
        <div className="border-b border-brand-border py-2">
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => onPick(`/products?category=${encodeURIComponent(c.slug)}`)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-primary/5"
            >
              <Tag size={14} className="flex-shrink-0 text-primary" />
              <span className="font-body text-sm text-brand-text">{c.name}</span>
              <span className="ml-auto font-body text-[11px] text-brand-muted">Category</span>
            </button>
          ))}
        </div>
      )}

      {products.map((p) => (
        <button
          key={p._id}
          onClick={() => onPick(`/products/${p.slug}`)}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-primary/5"
        >
          <img
            src={p.images?.[0] || '/placeholder.jpg'}
            alt=""
            className="h-14 w-11 flex-shrink-0 rounded object-cover bg-brand-bg"
            loading="lazy"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-body text-sm text-brand-text">{p.name}</span>
            {p.category && <span className="block font-body text-[11px] text-brand-muted">{p.category.name}</span>}
          </span>
          <span className="font-body text-sm font-semibold text-brand-text">
            {format(p.salePrice, p.usdSalePrice)}
          </span>
        </button>
      ))}

      {products.length > 0 && (
        <button
          onClick={() => onPick(`/search?q=${encodeURIComponent(query.trim())}`)}
          className="flex w-full items-center justify-center gap-2 border-t border-brand-border px-4 py-3 font-body text-sm font-medium text-primary transition-colors hover:bg-primary/5"
        >
          <Search size={14} /> See all results for “{query.trim()}”
        </button>
      )}
    </motion.div>
  );
}
