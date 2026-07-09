import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Eye, Circle } from 'lucide-react';
import { orderApi } from '../../api';
import type { Order, Pagination } from '../../types';
import { formatPrice, formatDateTime } from '../../utils/format';

const STATUSES = ['all', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'returned', 'cancelled'];

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; pill: string }> = {
  all:       { bg: '#EEF2FF', text: '#4F46E5', dot: '#4F46E5', pill: '#4F46E5' },
  pending:   { bg: '#FEF9C3', text: '#854D0E', dot: '#EAB308', pill: '#EAB308' },
  confirmed: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6', pill: '#3B82F6' },
  packed:    { bg: '#E0E7FF', text: '#3730A3', dot: '#6366F1', pill: '#6366F1' },
  shipped:   { bg: '#EDE9FE', text: '#5B21B6', dot: '#8B5CF6', pill: '#8B5CF6' },
  delivered: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E', pill: '#22C55E' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', pill: '#EF4444' },
  returned:  { bg: '#FFEDD5', text: '#9A3412', dot: '#F97316', pill: '#F97316' },
};

const PAY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  paid:    { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
  pending: { bg: '#FEF9C3', text: '#854D0E', dot: '#EAB308' },
  refunded: { bg: '#FFEDD5', text: '#9A3412', dot: '#F97316' },
  failed:  { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

function Avatar({ name }: { name: string }) {
  const colors = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4'];
  const c = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
      style={{ background: c }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await orderApi.getAll({ page, limit: 20, status: activeStatus === 'all' ? undefined : activeStatus });
      setOrders(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, activeStatus]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? orders.filter((o) =>
        o.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        o.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Orders</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">{pagination.total} total orders</p>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUSES.map((s) => {
          const st = STATUS_STYLE[s];
          const isActive = activeStatus === s;
          return (
            <button
              key={s}
              onClick={() => { setActiveStatus(s); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all capitalize"
              style={isActive
                ? { background: st.bg, color: st.text, boxShadow: `0 0 0 2px ${st.pill}` }
                : { background: 'var(--c-bg)', color: 'var(--c-muted)' }
              }
            >
              <Circle size={6} fill={isActive ? st.dot : '#94A3B8'} style={{ color: isActive ? st.dot : '#94A3B8' }} />
              {s === 'all' ? 'All Orders' : s}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID, name or email..."
          className="input-field pl-8 text-[11px]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-left pl-5">Order ID</th>
              <th className="th text-left">Customer</th>
              <th className="th text-left">Items</th>
              <th className="th text-right">Amount</th>
              <th className="th text-center">Payment</th>
              <th className="th text-center">Status</th>
              <th className="th text-left">Date</th>
              <th className="th text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-3 py-3.5">
                      <div className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: j === 1 ? '120px' : j === 0 ? '80px' : '60px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <ShoppingBag size={32} className="mx-auto mb-2 text-brand-border" />
                  <p className="text-[11px] text-brand-muted">No orders found</p>
                </td>
              </tr>
            ) : filtered.map((order) => {
              const ss = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
              const ps = PAY_STYLE[order.paymentStatus] || PAY_STYLE.pending;
              return (
                <tr
                  key={order._id}
                  className="group cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--c-border)' }}
                  onClick={() => navigate(`/orders/${order._id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}
                >
                  {/* Order ID */}
                  <td className="pl-5 pr-3 py-3.5">
                    <span className="font-mono text-[11px] font-bold" style={{ color: '#4F46E5' }}>
                      #{order.orderId?.slice(-10) || order._id.slice(-8)}
                    </span>
                  </td>

                  {/* Customer */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={order.user?.name || '?'} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-brand-text truncate max-w-[120px]">{order.user?.name || '—'}</p>
                        <p className="text-[10px] text-brand-muted truncate max-w-[120px]">{order.user?.email || ''}</p>
                      </div>
                    </div>
                  </td>

                  {/* Items */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1.5">
                        {order.items?.slice(0, 3).map((item, i) => (
                          item.product?.images?.[0] ? (
                            <img key={i} src={item.product.images[0]} alt=""
                              className="w-7 h-8 object-cover rounded border-2 border-white flex-shrink-0" />
                          ) : (
                            <div key={i} className="w-7 h-8 rounded border-2 border-white bg-slate-100 flex-shrink-0" />
                          )
                        ))}
                      </div>
                      <span className="text-[10px] text-brand-muted font-medium">
                        {order.items?.length} item{(order.items?.length || 0) > 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-3.5 text-right">
                    <span className="text-[12px] font-bold text-brand-text">{formatPrice(order.total)}</span>
                  </td>

                  {/* Payment */}
                  <td className="px-3 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize"
                      style={{ background: ps.bg, color: ps.text }}>
                      <Circle size={5} fill={ps.dot} style={{ color: ps.dot }} />
                      {order.paymentStatus}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold capitalize"
                      style={{ background: ss.bg, color: ss.text }}>
                      <Circle size={5} fill={ss.dot} style={{ color: ss.dot }} />
                      {order.status}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-3.5">
                    <p className="text-[10px] text-brand-muted whitespace-nowrap">
                      {order.createdAt ? formatDateTime(order.createdAt) : '—'}
                    </p>
                  </td>

                  {/* Action */}
                  <td className="px-3 py-3.5 text-center">
                    <div className="w-7 h-7 rounded-lg mx-auto flex items-center justify-center transition-all group-hover:bg-indigo-50"
                      style={{ color: '#94A3B8' }}>
                      <Eye size={13} style={{ color: '#4F46E5' }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-brand-border/40" style={{ background: 'var(--c-th-bg)' }}>
            <p className="text-[10px] text-brand-muted">
              Page {pagination.page} of {pagination.pages} &middot; {pagination.total} orders
            </p>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                const p = Math.max(1, Math.min(pagination.page - 2, pagination.pages - 4)) + i;
                return (
                  <button key={p} onClick={(e) => { e.stopPropagation(); setPage(p); }}
                    className="w-7 h-7 text-[10px] font-semibold rounded-lg transition-all"
                    style={p === pagination.page
                      ? { background: '#4F46E5', color: 'white' }
                      : { background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
