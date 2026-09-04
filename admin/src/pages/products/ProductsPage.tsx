import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, RotateCcw, Upload, CheckCircle2, XCircle, X } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusToggle from '../../components/common/StatusToggle';
import { useConfirm } from '../../components/common/ConfirmDialog';
import BulkUploadModal from './BulkUploadModal';
import { productApi } from '../../api';
import type { Product, Pagination } from '../../types';
import { formatPrice, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const confirm = useConfirm();

  const toggleSel = (id: string) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = products.length > 0 && products.every((p) => selected.has(p._id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(products.map((p) => p._id)));

  const bulkDelete = async () => {
    const ids = [...selected];
    if (!(await confirm({ title: `Delete ${ids.length} product(s)?`, message: 'They will be permanently deleted with their images. This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    setBulkBusy(true);
    try {
      await Promise.all(ids.map((id) => productApi.delete(id).catch(() => null)));
      toast.success(`${ids.length} product(s) deleted`);
      setSelected(new Set()); fetch();
    } finally { setBulkBusy(false); }
  };

  const bulkSetActive = async (isActive: boolean) => {
    const ids = [...selected];
    setBulkBusy(true);
    try {
      await Promise.all(ids.map((id) => productApi.update(id, { isActive }).catch(() => null)));
      toast.success(`${ids.length} product(s) ${isActive ? 'activated' : 'deactivated'}`);
      setSelected(new Set()); fetch();
    } finally { setBulkBusy(false); }
  };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productApi.getAll({ page, limit: 20, search: search || undefined });
      setProducts(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirm({ title: 'Delete product?', message: `"${name}" will be permanently deleted from the database and its images removed. This cannot be undone.`, confirmText: 'Delete', danger: true }))) return;
    try {
      await productApi.delete(id);
      toast.success('Product deleted');
      fetch();
    } catch {}
  };

  const handleReactivate = async (id: string, name: string) => {
    try {
      await productApi.update(id, { isActive: true });
      toast.success(`"${name}" reactivated`);
      fetch();
    } catch {}
  };

  const handleToggleStatus = async (p: Product) => {
    const next = !p.isActive;
    setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, isActive: next } : x)));
    try {
      await productApi.update(p._id, { isActive: next });
      toast.success(next ? 'Product activated' : 'Product deactivated');
    } catch {
      setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, isActive: !next } : x)));
      toast.error('Failed to update status');
    }
  };

  const columns = [
    {
      key: 'select',
      header: (
        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-primary cursor-pointer" aria-label="Select all" />
      ),
      width: 'w-10',
      render: (p: Product) => (
        <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSel(p._id)} className="w-4 h-4 accent-primary cursor-pointer" aria-label="Select" />
      ),
    },
    {
      key: 'image',
      header: 'Product',
      width: 'w-64',
      render: (p: Product) => (
        <div className="flex items-center gap-3">
          <img src={p.images?.[0] || '/placeholder.jpg'} alt={p.name} className="w-10 h-12 object-cover bg-brand-bg flex-shrink-0" />
          <div>
            <p className="font-body text-[11px] font-medium line-clamp-1">{p.name}</p>
            <p className="font-body text-[10px] text-brand-muted">{p.category?.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (p: Product) => (
        <div>
          <p className="font-body text-[11px] font-semibold">{formatPrice(p.salePrice)}</p>
          {p.mrp > p.salePrice && <p className="font-body text-[10px] text-brand-muted line-through">{formatPrice(p.mrp)}</p>}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (p: Product) => {
        const total = p.variants.reduce((s, v) => s + v.stock, 0);
        return <span className={`font-body text-[11px] ${total <= 5 ? 'text-red-500 font-semibold' : ''}`}>{total}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: Product) => <StatusToggle isActive={p.isActive} onToggle={() => void handleToggleStatus(p)} />,
    },
    {
      key: 'ratings',
      header: 'Rating',
      render: (p: Product) => (
        <span className="font-body text-[11px]">{p.ratings.count > 0 ? `${p.ratings.average}★ (${p.ratings.count})` : '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (p: Product) => <span className="font-body text-xs text-brand-muted">{formatDate(p.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p: Product) => (
        <div className="flex items-center gap-1">
          <a href={`${import.meta.env.VITE_CLIENT_URL || 'http://localhost:3000'}/products/${p.slug}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center text-brand-muted hover:text-primary transition-colors">
            <Eye size={14} />
          </a>
          <Link to={`/products/${p._id}/edit`} className="w-7 h-7 flex items-center justify-center text-brand-muted hover:text-primary transition-colors">
            <Edit size={14} />
          </Link>
          {p.isActive ? (
            <button onClick={() => handleDelete(p._id, p.name)} className="w-7 h-7 flex items-center justify-center text-brand-muted hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          ) : (
            <button onClick={() => handleReactivate(p._id, p.name)} title="Reactivate" className="w-7 h-7 flex items-center justify-center text-brand-muted hover:text-emerald-600 transition-colors">
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="input-field pl-8 w-64 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button disabled title="Coming soon" className="btn-outline opacity-50 cursor-not-allowed relative">
            <Upload size={15} /> Bulk Import
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary)' }}>Soon</span>
          </button>
          <Link to="/products/new" className="btn-primary">
            <Plus size={16} /> Add Product
          </Link>
        </div>
      </div>

      {/* Bulk action bar — appears when rows are selected */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'var(--c-primary-soft)', border: '1px solid var(--c-primary)' }}>
          <span className="text-[12px] font-bold" style={{ color: 'var(--c-primary)' }}>{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => bulkSetActive(true)} disabled={bulkBusy} className="btn-outline !py-1.5 text-[11px] disabled:opacity-50"><CheckCircle2 size={13} /> Activate</button>
            <button onClick={() => bulkSetActive(false)} disabled={bulkBusy} className="btn-outline !py-1.5 text-[11px] disabled:opacity-50"><XCircle size={13} /> Deactivate</button>
            <button onClick={bulkDelete} disabled={bulkBusy} className="!py-1.5 px-3 text-[11px] font-semibold rounded-lg text-white disabled:opacity-70 inline-flex items-center gap-1.5" style={{ background: '#EF4444' }}>
              {bulkBusy
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deleting…</>
                : <><Trash2 size={13} /> Delete</>}
            </button>
            <button onClick={() => setSelected(new Set())} disabled={bulkBusy} title="Clear" className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-50" style={{ color: 'var(--c-muted)' }}><X size={14} /></button>
          </div>
        </div>
      )}

      <div className="card p-0">
        <DataTable
          columns={columns}
          data={products}
          isLoading={loading}
          keyExtractor={(p) => p._id}
          rowClassName={(p) => (bulkBusy && selected.has(p._id) ? 'opacity-40 animate-pulse' : '')}
          emptyMessage="No products found"
          pagination={{ ...pagination, onPageChange: setPage }}
        />
      </div>
    </div>

    <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={fetch} />
    </>
  );
}
