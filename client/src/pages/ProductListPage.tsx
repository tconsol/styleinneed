import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Search, Check } from 'lucide-react';
import ProductCard from '../components/common/ProductCard';
import Footer from '../components/layout/Footer';
import { productApi } from '../api/product.api';
import { useCategories, useCollections, useProductTypes, useAttributes } from '../hooks/useCatalog';
import { socket, SOCKET_EVENTS } from '../lib/socket';
import type { Product, Attribute } from '../types';

const SORT_OPTIONS = [
  { label: 'Newest First', value: '-createdAt' },
  { label: 'Price: Low to High', value: 'salePrice' },
  { label: 'Price: High to Low', value: '-salePrice' },
  { label: 'Most Popular', value: '-ratings.count' },
  { label: 'Highest Rated', value: '-ratings.average' },
  { label: 'Biggest Discount', value: '-discountPercentage' },
];

const PRICE_RANGES = [
  { label: 'Under ₹999', min: 0, max: 999 },
  { label: '₹999 – ₹2,999', min: 999, max: 2999 },
  { label: '₹2,999 – ₹5,999', min: 2999, max: 5999 },
  { label: '₹5,999 – ₹10,000', min: 5999, max: 10000 },
  { label: '₹10,000 – ₹20,000', min: 10000, max: 20000 },
  { label: 'Above ₹20,000', min: 20000, max: 999999 },
];

/* ─────────── Collapsible section ─────────── */
function Section({
  title, count, children, defaultOpen = true,
}: { title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-brand-border last:border-0">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full py-3.5 text-left group">
        <span className="flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-brand-muted group-hover:text-brand-text transition-colors">
          {title}
          {!!count && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[8px] font-bold">{count}</span>
          )}
        </span>
        {open ? <ChevronUp size={13} className="text-brand-muted" /> : <ChevronDown size={13} className="text-brand-muted" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 py-1.5 font-body text-[13px] transition-colors text-left ${active ? 'text-brand-text font-medium' : 'text-brand-muted hover:text-brand-text'}`}>
      <span className={`w-[16px] h-[16px] border flex-shrink-0 flex items-center justify-center transition-colors ${active ? 'bg-brand-text border-brand-text' : 'border-brand-border'}`}>
        {active && <Check size={10} className="text-white" strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function RadioRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 py-1.5 font-body text-[13px] transition-colors text-left ${active ? 'text-brand-text font-medium' : 'text-brand-muted hover:text-brand-text'}`}>
      <span className={`w-[16px] h-[16px] rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${active ? 'border-brand-text' : 'border-brand-border'}`}>
        {active && <span className="w-2 h-2 rounded-full bg-brand-text block" />}
      </span>
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function ProductListPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  // Cached/deduped catalog data (shared with the header)
  const categories = useCategories().data || [];
  const collections = useCollections().data || [];
  const productTypes = useProductTypes().data || [];
  const attributes = useAttributes().data || [];
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const page        = Number(params.get('page') || 1);
  const sort        = params.get('sort') || '-createdAt';
  const search      = params.get('search') || '';
  const category    = params.get('category') || '';
  const collection  = params.get('collection') || '';
  const minPrice    = params.get('minPrice') || '';
  const maxPrice    = params.get('maxPrice') || '';
  const productType = params.get('productType') || '';
  const isNewArrival = params.get('isNewArrival') === 'true';
  const isBestSeller = params.get('isBestSeller') === 'true';
  const isTrending   = params.get('isTrending') === 'true';

  const search$ = params.toString();

  // Pass all URL params straight through to the API (backend handles reserved
  // params + dynamic attribute slugs). Multi-valued params become comma-joined.
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const f: Record<string, string | number> = { limit: 24 };
      const seen = new Set<string>();
      params.forEach((_v, key) => {
        if (seen.has(key)) return;
        seen.add(key);
        const vals = params.getAll(key);
        f[key] = vals.length > 1 ? vals.join(',') : vals[0];
      });
      if (f.page) f.page = Number(f.page);
      if (f.minPrice) f.minPrice = Number(f.minPrice);
      if (f.maxPrice) f.maxPrice = Number(f.maxPrice);
      const { data } = await productApi.getProducts(f);
      setProducts(data.data || []);
      setTotal(data.pagination?.total || 0);
      setPages(data.pagination?.pages || 1);
    } catch {
      /* no-op */
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search$]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Real-time: refetch the grid when products/stock change anywhere
  useEffect(() => {
    const refetch = () => fetchProducts();
    socket.on(SOCKET_EVENTS.productCreated, refetch);
    socket.on(SOCKET_EVENTS.productUpdated, refetch);
    socket.on(SOCKET_EVENTS.productDeleted, refetch);
    socket.on(SOCKET_EVENTS.stockUpdated, refetch);
    return () => {
      socket.off(SOCKET_EVENTS.productCreated, refetch);
      socket.off(SOCKET_EVENTS.productUpdated, refetch);
      socket.off(SOCKET_EVENTS.productDeleted, refetch);
      socket.off(SOCKET_EVENTS.stockUpdated, refetch);
    };
  }, [fetchProducts]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [search$]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* ─── URL helpers ─── */
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  };
  const toggleMulti = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    const curr = next.getAll(key);
    next.delete(key); next.delete('page');
    (curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value]).forEach((v) => next.append(key, v));
    setParams(next);
  };
  const setPriceRange = (min: number, max: number) => {
    const next = new URLSearchParams(params);
    if (minPrice === String(min) && maxPrice === String(max)) { next.delete('minPrice'); next.delete('maxPrice'); }
    else { next.set('minPrice', String(min)); next.set('maxPrice', String(max)); }
    next.delete('page'); setParams(next);
  };
  const clearAll = () => setParams({});

  /* ─── Dynamic attributes applicable to the chosen product type ─── */
  const visibleAttrs = attributes
    .filter((a) => a.isFilterable && (!productType || a.productTypes.length === 0 || a.productTypes.includes(productType)))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  /* ─── Derived ─── */
  const attrSelections = visibleAttrs.flatMap((a) => params.getAll(a.slug).map((v) => ({ slug: a.slug, value: v })));

  const activeCount = [category, collection, minPrice, productType, isNewArrival, isBestSeller, isTrending]
    .filter(Boolean).length + attrSelections.length;

  const categoryName    = categories.find((c) => c.slug === category)?.name || '';
  const collectionName  = collections.find((c) => c.slug === collection)?.name || '';
  const productTypeName = productTypes.find((t) => t.slug === productType)?.name || '';

  const pageTitle = search ? `"${search}"`
    : categoryName || collectionName || productTypeName
    || (isNewArrival ? 'New Arrivals' : '')
    || (isBestSeller ? 'Best Sellers' : '')
    || (isTrending ? 'Trending' : '')
    || 'All Products';

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || 'Newest First';

  const chips = [
    productType  && { label: productTypeName || productType, clear: () => setParam('productType', '') },
    category     && { label: categoryName || category,     clear: () => setParam('category', '') },
    collection   && { label: collectionName || collection, clear: () => setParam('collection', '') },
    isNewArrival && { label: 'New Arrivals', clear: () => setParam('isNewArrival', '') },
    isBestSeller && { label: 'Best Sellers', clear: () => setParam('isBestSeller', '') },
    isTrending   && { label: 'Trending',     clear: () => setParam('isTrending', '') },
    minPrice     && { label: `₹${Number(minPrice).toLocaleString('en-IN')}+`, clear: () => { setParam('minPrice', ''); setParam('maxPrice', ''); } },
    ...attrSelections.map((s) => ({ label: s.value, clear: () => toggleMulti(s.slug, s.value) })),
  ].filter(Boolean) as { label: string; clear: () => void }[];

  /* ─── A single dynamic attribute filter section ─── */
  const AttrSection = ({ attr }: { attr: Attribute }) => {
    const selected = params.getAll(attr.slug);
    if (attr.inputType === 'color') {
      return (
        <Section title={attr.name} count={selected.length} defaultOpen={false}>
          <div className="grid grid-cols-5 gap-x-1 gap-y-3">
            {attr.options.map((o) => {
              const active = selected.includes(o.value);
              return (
                <button key={o.value} onClick={() => toggleMulti(attr.slug, o.value)} className="flex flex-col items-center gap-1 group">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${active ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'ring-1 ring-brand-border group-hover:ring-brand-muted'}`}
                    style={{ background: o.hex || '#ccc' }}>
                    {active && <Check size={11} strokeWidth={3} className="text-white mix-blend-difference" />}
                  </span>
                  <span className={`font-body text-[9px] leading-none ${active ? 'text-primary font-semibold' : 'text-brand-muted'}`}>{o.label}</span>
                </button>
              );
            })}
          </div>
        </Section>
      );
    }
    if (attr.inputType === 'select') {
      return (
        <Section title={attr.name} count={selected.length} defaultOpen={false}>
          {attr.options.map((o) => (
            <CheckRow key={o.value} label={o.label} active={selected.includes(o.value)}
              onClick={() => toggleMulti(attr.slug, o.value)} />
          ))}
        </Section>
      );
    }
    // chips / multiselect
    return (
      <Section title={attr.name} count={selected.length} defaultOpen={false}>
        <div className="flex flex-wrap gap-1.5">
          {attr.options.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button key={o.value} onClick={() => toggleMulti(attr.slug, o.value)}
                className={`font-body text-[11px] font-medium px-3 py-1.5 border rounded-full transition-all ${active ? 'bg-primary text-white border-primary' : 'border-brand-border text-brand-muted hover:border-primary hover:text-primary'}`}>
                {o.label}
              </button>
            );
          })}
        </div>
      </Section>
    );
  };

  /* ─── Filter panel (shared) ─── */
  const Filters = () => (
    <>
      {productTypes.length > 0 && (
        <Section title="Shop For">
          {productTypes.map((t) => (
            <RadioRow key={t._id} label={t.name} active={productType === t.slug}
              onClick={() => setParam('productType', productType === t.slug ? '' : t.slug)} />
          ))}
        </Section>
      )}

      <Section title="Category">
        {categories
          .filter((cat) => !productType || cat.productType === productType)
          .map((cat) => (
            <CheckRow key={cat._id} label={cat.name} active={category === cat.slug}
              onClick={() => setParam('category', category === cat.slug ? '' : cat.slug)} />
          ))}
      </Section>

      {collections.length > 0 && (
        <Section title="Collections" defaultOpen={false}>
          {collections.map((col) => (
            <CheckRow key={col._id} label={col.name} active={collection === col.slug}
              onClick={() => setParam('collection', collection === col.slug ? '' : col.slug)} />
          ))}
        </Section>
      )}

      <Section title="Price Range">
        {PRICE_RANGES.map((r) => (
          <RadioRow key={r.label} label={r.label}
            active={minPrice === String(r.min) && maxPrice === String(r.max)}
            onClick={() => setPriceRange(r.min, r.max)} />
        ))}
      </Section>

      {/* Dynamic, admin-defined attribute filters */}
      {visibleAttrs.map((attr) => <AttrSection key={attr._id} attr={attr} />)}

      <Section title="Discover" defaultOpen={false}>
        {[
          { label: 'New Arrivals', key: 'isNewArrival', active: isNewArrival },
          { label: 'Best Sellers', key: 'isBestSeller', active: isBestSeller },
          { label: 'Trending Now', key: 'isTrending',   active: isTrending },
        ].map(({ label, key, active }) => (
          <CheckRow key={key} label={label} active={active} onClick={() => setParam(key, active ? '' : 'true')} />
        ))}
      </Section>
    </>
  );

  return (
    <div className="bg-brand-bg min-h-screen" style={{ paddingTop: 'var(--topbar-height)' }}>
      {/* ── Header band ── */}
      <div className="border-b border-brand-border bg-white">
        <div className="container-custom py-5 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-body text-[10px] tracking-[0.25em] uppercase text-primary font-semibold mb-0.5">
              {productTypeName || (collectionName ? 'Collection' : 'Shop')}
            </p>
            <h1 className="font-heading text-xl md:text-2xl font-semibold text-brand-text leading-tight">{pageTitle}</h1>
          </div>
          <p className="font-body text-xs text-brand-muted pb-1">
            {loading ? 'Loading…' : `${total.toLocaleString('en-IN')} ${total === 1 ? 'style' : 'styles'}`}
          </p>
        </div>
      </div>

      {/* ── Body: whole page scrolls (mobile-safe); sidebar sticky on desktop ── */}
      <div className="container-custom flex items-start gap-6 lg:gap-8">
        {/* Sidebar — desktop only, sticky with its own scroll region */}
        <aside className="hidden lg:block w-60 xl:w-64 flex-shrink-0 self-start sticky" style={{ top: 'calc(var(--topbar-height) + 1rem)' }}>
          <div className="overflow-y-auto pr-1" data-lenis-prevent
            style={{ maxHeight: 'calc(100vh - var(--topbar-height) - 2rem)', overscrollBehavior: 'contain' }}>
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-brand-muted" />
                <span className="font-body text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text">Filters</span>
                {activeCount > 0 && <span className="w-4 h-4 bg-primary text-white rounded-full text-[8px] font-bold flex items-center justify-center">{activeCount}</span>}
              </div>
              {activeCount > 0 && <button onClick={clearAll} className="font-body text-[11px] text-primary hover:text-primary-dark transition-colors">Clear all</button>}
            </div>
            <Filters />
          </div>
        </aside>

        {/* Products */}
        <div className="flex-1 min-w-0 py-5">
          {/* Toolbar — sticks below the fixed header as the page scrolls */}
          <div className="sticky z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-border" style={{ top: 'var(--topbar-height)' }}>
            <div className="flex items-center gap-3 py-3">
              <button onClick={() => setMobileOpen(true)}
                className="lg:hidden flex items-center gap-1.5 border border-brand-border px-3.5 py-2 font-body text-[11px] text-brand-muted hover:border-brand-text hover:text-brand-text transition-colors">
                <SlidersHorizontal size={12} /> Filters
                {activeCount > 0 && <span className="w-4 h-4 bg-primary text-white rounded-full text-[8px] font-bold flex items-center justify-center">{activeCount}</span>}
              </button>

              {chips.length > 0 && (
                <div className="hidden lg:flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-hide">
                  {chips.slice(0, 6).map((chip, i) => (
                    <button key={i} onClick={chip.clear}
                      className="inline-flex items-center gap-1 flex-shrink-0 font-body text-[10px] font-medium px-2.5 py-1.5 bg-brand-surface border border-brand-border text-brand-text hover:border-primary hover:text-primary transition-colors">
                      {chip.label} <X size={8} strokeWidth={2.5} />
                    </button>
                  ))}
                  {chips.length > 6 && <span className="font-body text-[10px] text-brand-muted flex-shrink-0">+{chips.length - 6}</span>}
                </div>
              )}

              <div className="relative ml-auto flex-shrink-0" ref={sortRef}>
                <button onClick={() => setSortOpen((o) => !o)}
                  className="flex items-center gap-2 border border-brand-border px-3.5 py-2 font-body text-[11px] text-brand-muted hover:border-brand-text transition-colors min-w-[170px] justify-between bg-white">
                  <span>Sort: <span className="text-brand-text font-medium">{sortLabel}</span></span>
                  <ChevronDown size={11} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1 bg-white border border-brand-border shadow-luxury z-40 min-w-[210px]">
                      {SORT_OPTIONS.map((o) => (
                        <button key={o.value} onClick={() => { setParam('sort', o.value); setSortOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 font-body text-[12px] flex items-center justify-between transition-colors ${sort === o.value ? 'text-primary bg-brand-surface font-semibold' : 'text-brand-text hover:bg-brand-surface'}`}>
                          {o.label}
                          {sort === o.value && <Check size={12} className="text-primary" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-3">
                {chips.map((chip, i) => (
                  <button key={i} onClick={chip.clear}
                    className="inline-flex items-center gap-1 flex-shrink-0 font-body text-[10px] font-medium px-2.5 py-1.5 bg-brand-surface border border-brand-border text-brand-text">
                    {chip.label} <X size={8} strokeWidth={2.5} />
                  </button>
                ))}
                <button onClick={clearAll} className="font-body text-[10px] text-red-500 flex-shrink-0">Clear</button>
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="py-6">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i}>
                    <div className="aspect-product skeleton" />
                    <div className="h-2.5 skeleton mt-3 w-2/3" />
                    <div className="h-2.5 skeleton mt-1.5 w-1/3" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-14 h-14 border border-brand-border flex items-center justify-center mb-5">
                  <Search size={22} className="text-brand-border" />
                </div>
                <p className="font-heading text-lg font-semibold text-brand-text mb-1.5">No styles found</p>
                <p className="font-body text-sm text-brand-muted mb-6 max-w-xs">Nothing matches your current filters. Try adjusting them.</p>
                <button onClick={clearAll} className="btn-outline text-xs px-6 py-2.5">Clear All Filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {products.map((p, i) => (
                    <motion.div key={p._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i, 7) * 0.04 }}>
                      <ProductCard product={p} />
                    </motion.div>
                  ))}
                </div>

                {pages > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-12">
                    <button onClick={() => setParam('page', String(page - 1))} disabled={page <= 1}
                      className="w-9 h-9 border border-brand-border text-brand-muted hover:border-brand-text hover:text-brand-text disabled:opacity-30 transition-colors text-sm flex items-center justify-center">‹</button>
                    {Array.from({ length: pages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === pages)
                      .map((p, i, arr) => (
                        <span key={`pg-${p}`} className="flex items-center gap-1">
                          {i > 0 && arr[i - 1] !== p - 1 && <span className="w-9 h-9 flex items-center justify-center text-brand-muted text-sm">…</span>}
                          <button onClick={() => setParam('page', String(p))}
                            className={`w-9 h-9 font-body text-[12px] border transition-all ${p === page ? 'bg-brand-text text-white border-brand-text' : 'border-brand-border text-brand-text hover:border-brand-text'}`}>{p}</button>
                        </span>
                      ))}
                    <button onClick={() => setParam('page', String(page + 1))} disabled={page >= pages}
                      className="w-9 h-9 border border-brand-border text-brand-muted hover:border-brand-text hover:text-brand-text disabled:opacity-30 transition-colors text-sm flex items-center justify-center">›</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-text/50 z-[60] lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed inset-y-0 left-0 w-80 max-w-[88vw] bg-white z-[70] flex flex-col shadow-luxury-lg lg:hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-brand-muted" />
                  <span className="font-body text-[11px] font-bold uppercase tracking-[0.18em] text-brand-text">Filters</span>
                  {activeCount > 0 && <span className="w-4 h-4 bg-primary text-white rounded-full text-[9px] font-bold flex items-center justify-center">{activeCount}</span>}
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-brand-muted hover:text-brand-text transition-colors"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5" data-lenis-prevent style={{ overscrollBehavior: 'contain' }}>
                <Filters />
              </div>
              <div className="flex-shrink-0 p-4 border-t border-brand-border grid grid-cols-2 gap-3">
                <button onClick={() => { clearAll(); setMobileOpen(false); }} className="btn-outline text-xs py-3 justify-center">Clear All</button>
                <button onClick={() => setMobileOpen(false)} className="btn-primary text-xs py-3 justify-center">View {total} Results</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
