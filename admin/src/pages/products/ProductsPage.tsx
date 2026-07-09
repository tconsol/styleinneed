import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useConfirm } from '../../components/common/ConfirmDialog';
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
  const confirm = useConfirm();

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
    if (!(await confirm({ title: 'Deactivate product?', message: `"${name}" will be hidden and its images removed from storage.`, confirmText: 'Deactivate' }))) return;
    try {
      await productApi.delete(id);
      toast.success('Product deactivated');
      fetch();
    } catch {}
  };

  const columns = [
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
      render: (p: Product) => <Badge value={p.isActive ? 'active' : 'inactive'} />,
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
          <button onClick={() => handleDelete(p._id, p.name)} className="w-7 h-7 flex items-center justify-center text-brand-muted hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
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
        <Link to="/products/new" className="btn-primary">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      <div className="card p-0">
        <DataTable
          columns={columns}
          data={products}
          isLoading={loading}
          keyExtractor={(p) => p._id}
          emptyMessage="No products found"
          pagination={{ ...pagination, onPageChange: setPage }}
        />
      </div>
    </div>
  );
}
