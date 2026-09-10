import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import Select from '../../components/common/Select';
import { productApi } from '../../api';

export interface ProductFilters {
  search: string;
  productType: string;
  category: string;
  collection: string;
  stockStatus: string;
  isActive: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
}

export const EMPTY_FILTERS: ProductFilters = {
  search: '', productType: '', category: '', collection: '',
  stockStatus: '', isActive: '', minPrice: '', maxPrice: '', sort: '-createdAt',
};

interface Options {
  productTypes: string[];
  categories: { _id: string; name: string; slug: string }[];
  collections: { _id: string; name: string; slug: string }[];
  price: { min: number; max: number };
}

const SORTS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: '-sold', label: 'Most bought' },
  { value: 'sold', label: 'Least bought' },
  { value: 'salePrice', label: 'Price: low to high' },
  { value: '-salePrice', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' },
  { value: '-ratings.average', label: 'Best rated' },
];

const STOCK = [
  { value: '', label: 'Any stock' },
  { value: 'in', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

const STATUS = [
  { value: '', label: 'Any status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const titleise = (slug: string): string =>
  slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface Props {
  value: ProductFilters;
  onChange: (next: ProductFilters) => void;
  /** Rows matching the current filters, for the summary line. */
  total: number;
}

/**
 * Filter bar for the admin product list.
 *
 * The dropdown options come from the server, derived from products that
 * actually exist — a category with nothing in it never appears as a dead
 * choice. Everything the user picks is applied server-side, so the counts and
 * pagination stay correct rather than filtering only the visible page.
 */
export default function ProductFilterBar({ value, onChange, total }: Props) {
  const [options, setOptions] = useState<Options | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    productApi.getFilterOptions()
      .then(({ data }) => setOptions(data.data))
      .catch(() => {});
  }, []);

  const set = (patch: Partial<ProductFilters>) => onChange({ ...value, ...patch });

  /** Everything except sort — sort is always set, so it is not a "filter". */
  const active: { key: keyof ProductFilters; label: string }[] = [];
  if (value.search) active.push({ key: 'search', label: `"${value.search}"` });
  if (value.productType) active.push({ key: 'productType', label: titleise(value.productType) });
  if (value.category) {
    const c = options?.categories.find((x) => x.slug === value.category);
    active.push({ key: 'category', label: c?.name || value.category });
  }
  if (value.collection) {
    const c = options?.collections.find((x) => x.slug === value.collection);
    active.push({ key: 'collection', label: c?.name || value.collection });
  }
  if (value.stockStatus) {
    active.push({ key: 'stockStatus', label: STOCK.find((s) => s.value === value.stockStatus)?.label || '' });
  }
  if (value.isActive) {
    active.push({ key: 'isActive', label: value.isActive === 'true' ? 'Active' : 'Inactive' });
  }
  if (value.minPrice || value.maxPrice) {
    active.push({
      key: 'minPrice',
      label: `₹${value.minPrice || options?.price.min || 0} – ₹${value.maxPrice || options?.price.max || '∞'}`,
    });
  }

  const clearOne = (key: keyof ProductFilters) => {
    // The price chip stands for both ends of the range.
    if (key === 'minPrice') set({ minPrice: '', maxPrice: '' });
    else set({ [key]: '' } as Partial<ProductFilters>);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search name or SKU…"
            className="input-field pl-8 text-sm"
          />
          {value.search && (
            <button onClick={() => set({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="w-[170px]">
          <Select value={value.sort} onChange={(v) => set({ sort: v })} options={SORTS} />
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="btn-outline"
          style={active.length > 0 ? { borderColor: 'var(--c-primary)', color: 'var(--c-primary)' } : undefined}
        >
          <SlidersHorizontal size={14} /> Filters
          {active.length > 0 && (
            <span className="ml-0.5 px-1.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: 'var(--c-primary)' }}>
              {active.length}
            </span>
          )}
          <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
      </div>

      {expanded && (
        <div className="rounded-xl p-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)' }}>
          <div>
            <label className="input-label">Product type</label>
            <Select
              value={value.productType}
              onChange={(v) => set({ productType: v })}
              options={[
                { value: '', label: 'All types' },
                ...(options?.productTypes || []).map((t) => ({ value: t, label: titleise(t) })),
              ]}
            />
          </div>

          <div>
            <label className="input-label">Category</label>
            <Select
              value={value.category}
              onChange={(v) => set({ category: v })}
              options={[
                { value: '', label: 'All categories' },
                ...(options?.categories || []).map((c) => ({ value: c.slug, label: c.name })),
              ]}
            />
          </div>

          <div>
            <label className="input-label">Collection</label>
            <Select
              value={value.collection}
              onChange={(v) => set({ collection: v })}
              options={[
                { value: '', label: 'All collections' },
                ...(options?.collections || []).map((c) => ({ value: c.slug, label: c.name })),
              ]}
            />
          </div>

          <div>
            <label className="input-label">Stock</label>
            <Select value={value.stockStatus} onChange={(v) => set({ stockStatus: v })} options={STOCK} />
          </div>

          <div>
            <label className="input-label">Status</label>
            <Select value={value.isActive} onChange={(v) => set({ isActive: v })} options={STATUS} />
          </div>

          <div className="sm:col-span-2">
            <label className="input-label">
              Price range
              {options && (
                <span className="font-normal text-brand-muted ml-1">
                  (₹{options.price.min.toLocaleString()} – ₹{options.price.max.toLocaleString()} in catalogue)
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} inputMode="numeric"
                value={value.minPrice}
                onChange={(e) => set({ minPrice: e.target.value })}
                placeholder={options ? String(options.price.min) : 'Min'}
                className="input-field text-[12px]"
              />
              <span className="text-brand-muted text-[11px]">to</span>
              <input
                type="number" min={0} inputMode="numeric"
                value={value.maxPrice}
                onChange={(e) => set({ maxPrice: e.target.value })}
                placeholder={options ? String(options.price.max) : 'Max'}
                className="input-field text-[12px]"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => onChange({ ...EMPTY_FILTERS, sort: value.sort })}
              disabled={active.length === 0}
              className="btn-outline w-full justify-center disabled:opacity-40"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}

      {/* Applied filters, always visible so a hidden filter can't confuse a count */}
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-brand-muted">
            {total} product{total === 1 ? '' : 's'} ·
          </span>
          {active.map((a) => (
            <span key={a.key}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg text-[10px] font-semibold"
              style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary-dark)' }}>
              {a.label}
              <button onClick={() => clearOne(a.key)} className="opacity-70 hover:opacity-100">
                <X size={11} />
              </button>
            </span>
          ))}
          <button
            onClick={() => onChange({ ...EMPTY_FILTERS, sort: value.sort })}
            className="text-[10px] font-semibold ml-0.5"
            style={{ color: 'var(--c-danger)' }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
