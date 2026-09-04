import { useEffect, useMemo, useState } from 'react';
import { Tag, Clock, SlidersHorizontal, X, Search } from 'lucide-react';
import ProductCard from '../components/common/ProductCard';
import Dropdown from '../components/common/Dropdown';
import Spinner from '../components/common/Spinner';
import { productApi } from '../api/product.api';
import { usePromotionStore, promoFor, type Promotion } from '../stores/promotionStore';
import type { Product } from '../types';

const productsForPromo = (promo: Promotion, all: Product[]): Product[] => {
  const ids = new Set(promo.applicableProducts.map((p) => (typeof p === 'string' ? p : p._id)));
  const cats = new Set(promo.applicableCategories.map((c) => c._id));
  if (!ids.size && !cats.size) return all;
  return all.filter((p) => ids.has(p._id) || (p.category && cats.has(p.category._id)));
};

const timeLeft = (end: string): string => {
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return 'Ending soon';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m left`;
};

type Sort = 'newest' | 'price-asc' | 'price-desc' | 'discount';
const EMPTY = { search: '', productType: '', category: '', collection: '', minPrice: '', maxPrice: '', isNewArrival: false, isBestSeller: false, isTrending: false, sort: 'newest' as Sort };

export default function SalePage() {
  const { active, loaded, fetchActive } = usePromotionStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [types, setTypes] = useState<{ slug: string; name: string }[]>([]);
  const [collections, setCollections] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState(EMPTY);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!loaded) fetchActive();
    Promise.all([
      productApi.getProducts({ limit: 500 }),
      productApi.getProductTypes(),
      productApi.getCollections(),
    ]).then(([pd, tp, cl]) => {
      setProducts(pd.data.data || []);
      setTypes((tp.data.data || []).filter((t: { isActive: boolean }) => t.isActive));
      setCollections(cl.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [loaded, fetchActive]);

  // The pool that populates category options = products currently on sale.
  const salePool = useMemo(
    () => (active.length === 0 ? products : Array.from(new Map(active.flatMap((p) => productsForPromo(p, products)).map((x) => [x._id, x])).values())),
    [active, products],
  );
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    salePool.forEach((p) => { if (p.category) map.set(p.category._id, p.category.name); });
    return [...map.entries()].map(([_id, name]) => ({ _id, name }));
  }, [salePool]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const applyFilters = (items: Product[]): Product[] => {
    let out = items.filter((p) => {
      if (f.search && !p.name.toLowerCase().includes(f.search.toLowerCase())) return false;
      if (f.productType && p.productType !== f.productType) return false;
      if (f.category && p.category?._id !== f.category) return false;
      if (f.collection && !(p.collections || []).some((c) => c._id === f.collection)) return false;
      if (f.minPrice && p.salePrice < Number(f.minPrice)) return false;
      if (f.maxPrice && p.salePrice > Number(f.maxPrice)) return false;
      if (f.isNewArrival && !p.isNewArrival) return false;
      if (f.isBestSeller && !p.isBestSeller) return false;
      if (f.isTrending && !p.isTrending) return false;
      return true;
    });
    if (f.sort === 'price-asc') out = [...out].sort((a, b) => a.salePrice - b.salePrice);
    else if (f.sort === 'price-desc') out = [...out].sort((a, b) => b.salePrice - a.salePrice);
    else if (f.sort === 'discount') out = [...out].sort((a, b) => (promoFor(b, active)?.off || 0) - (promoFor(a, active)?.off || 0));
    return out;
  };

  const activeCount = [f.search, f.productType, f.category, f.collection, f.minPrice, f.maxPrice].filter(Boolean).length
    + [f.isNewArrival, f.isBestSeller, f.isTrending].filter(Boolean).length;

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: 'var(--topbar-height)' }}><Spinner size="lg" /></div>;

  const FilterPanel = (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-heading text-sm font-semibold text-brand-text flex items-center gap-2"><SlidersHorizontal size={15} /> Filters</p>
        {activeCount > 0 && <button onClick={() => setF(EMPTY)} className="font-body text-xs text-primary hover:text-primary-dark">Clear all</button>}
      </div>

      <div>
        <label className="font-body text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Search</label>
        <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-border bg-brand-surface">
          <Search size={13} className="text-brand-muted" />
          <input value={f.search} onChange={(e) => set('search', e.target.value)} placeholder="Search sale…" className="flex-1 bg-transparent outline-none text-sm text-brand-text" />
        </div>
      </div>

      {types.length > 0 && (
        <div>
          <label className="font-body text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Product Type</label>
          <div className="mt-1.5">
            <Dropdown value={f.productType} onChange={(v) => set('productType', v)} placeholder="All types"
              options={[{ value: '', label: 'All types' }, ...types.map((t) => ({ value: t.slug, label: t.name }))]} />
          </div>
        </div>
      )}

      {categoryOptions.length > 0 && (
        <div>
          <label className="font-body text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Category</label>
          <div className="mt-1.5">
            <Dropdown value={f.category} onChange={(v) => set('category', v)} placeholder="All categories"
              options={[{ value: '', label: 'All categories' }, ...categoryOptions.map((c) => ({ value: c._id, label: c.name }))]} />
          </div>
        </div>
      )}

      {collections.length > 0 && (
        <div>
          <label className="font-body text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Collection</label>
          <div className="mt-1.5">
            <Dropdown value={f.collection} onChange={(v) => set('collection', v)} placeholder="All collections"
              options={[{ value: '', label: 'All collections' }, ...collections.map((c) => ({ value: c._id, label: c.name }))]} />
          </div>
        </div>
      )}

      <div>
        <label className="font-body text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Price (₹)</label>
        <div className="mt-1.5 flex items-center gap-2">
          <input type="number" min="0" value={f.minPrice} onChange={(e) => set('minPrice', e.target.value)} placeholder="Min" className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm outline-none focus:border-primary" />
          <span className="text-brand-muted">–</span>
          <input type="number" min="0" value={f.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} placeholder="Max" className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm outline-none focus:border-primary" />
        </div>
      </div>

      <div>
        <label className="font-body text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Highlights</label>
        <div className="mt-2 space-y-2">
          {([['isNewArrival', 'New Arrivals'], ['isBestSeller', 'Best Sellers'], ['isTrending', 'Trending']] as const).map(([k, label]) => (
            <label key={k} className="flex items-center gap-2.5 cursor-pointer font-body text-sm text-brand-text">
              <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} className="w-4 h-4 accent-primary" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="font-body text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Sort by</label>
        <div className="mt-1.5">
          <Dropdown value={f.sort} onChange={(v) => set('sort', v as Sort)}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'price-asc', label: 'Price: Low to High' },
              { value: 'price-desc', label: 'Price: High to Low' },
              { value: 'discount', label: 'Biggest Discount' },
            ]} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-8 md:py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-brand-text">{active.length === 0 ? 'All Products' : 'Sale'}</h1>
            <p className="font-body text-sm text-brand-muted mt-1">{active.length === 0 ? 'No sale is running — browse everything.' : `${active.length} sale${active.length > 1 ? 's' : ''} live now`}</p>
          </div>
          <button onClick={() => setPanelOpen(true)} className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm font-medium">
            <SlidersHorizontal size={15} /> Filters {activeCount > 0 && <span className="ml-0.5 w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">{activeCount}</span>}
          </button>
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 rounded-2xl border border-brand-border bg-brand-surface p-5">{FilterPanel}</div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {active.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                {applyFilters(products).map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            ) : (
              <div className="space-y-12">
                {active.map((promo) => {
                  const items = applyFilters(productsForPromo(promo, products));
                  return (
                    <section key={promo._id}>
                      <div className="relative overflow-hidden rounded-2xl mb-5 p-6"
                        style={{ background: promo.bannerImage ? undefined : 'linear-gradient(120deg, rgb(var(--color-primary-dark)), rgb(var(--color-primary)) 60%, rgb(var(--color-secondary)))' }}>
                        {promo.bannerImage && <img src={promo.bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                        {promo.bannerImage && <div className="absolute inset-0 bg-black/40" />}
                        <div className="relative">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white backdrop-blur-sm">
                            <Tag size={11} /> {promo.badgeText || promo.type.replace(/_/g, ' ')}
                          </span>
                          <h2 className="font-heading text-xl md:text-3xl font-bold text-white mt-2">{promo.name}</h2>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="font-body text-white font-semibold text-sm">{promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `₹${promo.discountValue} OFF`}</span>
                            <span className="inline-flex items-center gap-1 font-body text-white/80 text-xs"><Clock size={12} /> {timeLeft(promo.expiryDate)}</span>
                          </div>
                        </div>
                      </div>
                      {items.length === 0 ? (
                        <p className="font-body text-sm text-brand-muted">No products match your filters in this sale.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                          {items.map((p) => <ProductCard key={p._id} product={p} />)}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      {panelOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPanelOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-brand-bg overflow-y-auto p-5">
            <div className="flex justify-end mb-2"><button onClick={() => setPanelOpen(false)} className="text-brand-muted"><X size={20} /></button></div>
            {FilterPanel}
            <button onClick={() => setPanelOpen(false)} className="btn-primary w-full justify-center mt-6">Show results</button>
          </div>
        </div>
      )}
    </div>
  );
}
