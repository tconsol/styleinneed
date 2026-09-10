import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Search, Save, PackageX, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import Select from '../../components/common/Select';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { inventoryApi } from '../../api';
import type { Pagination } from '../../types';
import toast from 'react-hot-toast';

interface Row {
  productId: string;
  productName: string;
  slug: string;
  image?: string;
  categoryName?: string;
  sku: string;
  stock: number;
  attributes: Record<string, string>;
  isActive: boolean;
}

interface Summary {
  threshold: number; out: number; low: number; healthy: number; variants: number; units: number;
}

const STATUS_TABS = [
  { value: 'low', label: 'Needs attention' },
  { value: 'out', label: 'Out of stock' },
  { value: 'healthy', label: 'In stock' },
  { value: 'all', label: 'All SKUs' },
];

const MODES = [
  { value: 'add', label: 'Add to current stock' },
  { value: 'set', label: 'Set exact stock' },
];

export default function InventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('low');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'add' | 'set'>('add');
  // Only edited SKUs are sent, so an untouched row is never written back.
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const key = (r: Row) => `${r.productId}::${r.sku}`;

  const load = useCallback(() => {
    setLoading(true);
    inventoryApi.list({ page, limit: 30, status, search: search || undefined })
      .then(({ data }) => {
        setRows(data.data || []);
        if (data.pagination) setPagination(data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, status, search]);

  const loadSummary = useCallback(() => {
    inventoryApi.summary().then(({ data }) => setSummary(data.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const dirty = Object.keys(edits).length;

  const save = async () => {
    const updates = rows
      .filter((r) => edits[key(r)] !== undefined && edits[key(r)] !== 0)
      .map((r) => ({ productId: r.productId, sku: r.sku, value: edits[key(r)] }));

    if (updates.length === 0) { toast.error('Nothing to apply'); return; }

    if (!(await confirm({
      title: `Update ${updates.length} SKU(s)?`,
      message: mode === 'set'
        ? 'Stock will be set to exactly the values entered.'
        : 'The values entered will be added to current stock (use a negative number to remove).',
      confirmText: 'Apply',
    }))) return;

    setSaving(true);
    try {
      const { data } = await inventoryApi.adjust({ mode, updates });
      toast.success(data.message || 'Stock updated');
      if (data.data?.failed?.length) {
        toast.error(`${data.data.failed.length} skipped — ${data.data.failed[0].reason}`);
      }
      setEdits({});
      load(); loadSummary();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const tone = (stock: number) => {
    if (stock <= 0) return { color: 'var(--c-danger)', bg: 'var(--c-danger-soft)', label: 'Out' };
    if (summary && stock <= summary.threshold) return { color: 'var(--c-warning)', bg: 'var(--c-warning-soft)', label: 'Low' };
    return { color: 'var(--c-success)', bg: 'var(--c-success-soft)', label: 'OK' };
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Inventory</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">
            Stock by SKU — restock in bulk without opening each product
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Out of stock', value: summary?.out, icon: PackageX, color: 'var(--c-danger)' },
          { label: `Low (≤ ${summary?.threshold ?? 5})`, value: summary?.low, icon: AlertTriangle, color: 'var(--c-warning)' },
          { label: 'In stock', value: summary?.healthy, icon: CheckCircle2, color: 'var(--c-success)' },
          { label: 'Total units', value: summary?.units, icon: Boxes, color: 'var(--c-primary)' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-4">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                <Icon size={12} style={{ color: s.color }} /> {s.label}
              </span>
              <p className="text-[22px] font-black mt-1.5 leading-none" style={{ color: s.color }}>
                {s.value ?? '—'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-48">
          <Select value={status} onChange={(v) => { setStatus(v); setPage(1); setEdits({}); }} options={STATUS_TABS} />
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search product…" className="input-field pl-8 text-[11px]" />
        </div>
        <div className="w-56 ml-auto">
          <Select value={mode} onChange={(v) => { setMode(v as 'add' | 'set'); setEdits({}); }} options={MODES} />
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-left pl-5">Product</th>
              <th className="th text-left" style={{ width: '160px' }}>SKU</th>
              <th className="th text-left" style={{ width: '150px' }}>Variant</th>
              <th className="th text-center" style={{ width: '90px' }}>In stock</th>
              <th className="th text-center" style={{ width: '150px' }}>
                {mode === 'set' ? 'Set to' : 'Add / remove'}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-brand-border" />
                <p className="text-[11px] text-brand-muted">
                  {status === 'low' ? 'Nothing needs restocking right now.' : 'No SKUs match.'}
                </p>
              </td></tr>
            ) : rows.map((r) => {
              const t = tone(r.stock);
              const k = key(r);
              const edited = edits[k];
              const preview = mode === 'set'
                ? (edited ?? r.stock)
                : r.stock + (edited || 0);
              return (
                <tr key={k} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td className="pl-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <img src={r.image || '/placeholder.jpg'} alt="" className="w-9 h-11 object-cover rounded bg-brand-bg flex-shrink-0" />
                      <div className="min-w-0">
                        <Link to={`/products/${r.productId}/edit`} className="text-[11px] font-semibold text-brand-text hover:text-primary transition-colors line-clamp-1">
                          {r.productName}
                        </Link>
                        <p className="text-[10px] text-brand-muted">
                          {r.categoryName}{!r.isActive && ' · inactive'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-brand-muted">{r.sku}</td>
                  <td className="px-3 py-2.5 text-[10px] text-brand-muted">
                    {Object.values(r.attributes || {}).join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold"
                      style={{ background: t.bg, color: t.color }}>
                      {r.stock}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <input
                        type="number"
                        value={edited ?? ''}
                        placeholder={mode === 'set' ? String(r.stock) : '0'}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEdits((prev) => {
                            const n = { ...prev };
                            if (v === '') delete n[k]; else n[k] = Number(v);
                            return n;
                          });
                        }}
                        className="input-field !py-1 text-center w-20 text-[12px]"
                      />
                      {edited !== undefined && (
                        <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: preview < 0 ? 'var(--c-danger)' : 'var(--c-muted)' }}>
                          → {preview}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-brand-border/40" style={{ background: 'var(--c-th-bg)' }}>
            <p className="text-[10px] text-brand-muted">Page {page} of {pagination.pages} · {pagination.total} SKUs</p>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                const p = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return (
                  <button key={p} onClick={() => { setPage(p); setEdits({}); }}
                    className="w-7 h-7 text-[10px] font-semibold rounded-lg transition-all"
                    style={p === page ? { background: 'var(--c-primary)', color: 'white' } : { background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating apply bar — only while there are pending edits */}
      {dirty > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full py-2 pl-5 pr-2"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-primary)', boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}>
          <span className="text-[12px] font-semibold text-brand-text">
            {dirty} SKU{dirty > 1 ? 's' : ''} edited
          </span>
          <button onClick={() => setEdits({})} title="Discard changes"
            className="w-8 h-8 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-text">
            <RotateCcw size={14} />
          </button>
          <button onClick={save} disabled={saving} className="btn-primary !rounded-full min-w-[130px] justify-center">
            {saving ? 'Applying…' : <><Save size={14} /> Apply</>}
          </button>
        </div>
      )}
    </div>
  );
}
