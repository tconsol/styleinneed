import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, ShoppingBag, CheckCircle2, XCircle,
  Package, RotateCcw, Circle, Wallet,
} from 'lucide-react';
import { customerApi } from '../../api';
import type { Customer, Order, CustomerAddress } from '../../types';
import { formatPrice, formatDate, formatDateTime } from '../../utils/format';
import { PageSpinner } from '../../components/common/Spinner';

interface Stats {
  totalOrders: number;
  paidOrders: number;
  totalSpentINR: number;
  totalSpentUSD: number;
  byStatus: Record<string, number>;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: 'var(--c-warning-soft)', text: 'var(--c-warning)', dot: 'var(--c-warning)' },
  confirmed: { bg: 'var(--c-info-soft)', text: 'var(--c-info)', dot: 'var(--c-info)' },
  packed:    { bg: 'var(--c-info-soft)', text: 'var(--c-primary-dark)', dot: 'var(--c-info)' },
  shipped:   { bg: 'var(--c-purple-soft)', text: 'var(--c-purple)', dot: 'var(--c-purple)' },
  delivered: { bg: 'var(--c-success-soft)', text: 'var(--c-success)', dot: 'var(--c-success)' },
  cancelled: { bg: 'var(--c-danger-soft)', text: 'var(--c-danger)', dot: 'var(--c-danger)' },
  returned:  { bg: 'var(--c-orange-soft)', text: 'var(--c-orange)', dot: 'var(--c-orange)' },
};

function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const colors = ['var(--c-primary)', 'var(--c-sky)', 'var(--c-success)', 'var(--c-warning)', 'var(--c-danger)', 'var(--c-purple)'];
  const c = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: c, fontSize: size / 2.4 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 flex items-center gap-3" style={{ border: '1px solid var(--c-border)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[16px] font-bold text-brand-text leading-none">{value}</p>
        <p className="text-[10px] text-brand-muted mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    customerApi.getById(id).then(({ data }) => {
      setCustomer(data.data.user);
      setOrders(data.data.orders || []);
      setStats(data.data.stats);
    }).catch(() => navigate('/customers')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageSpinner />;
  if (!customer) return null;

  const spent = stats && stats.totalSpentUSD > 0
    ? `${formatPrice(stats.totalSpentINR)}${stats.totalSpentINR ? ' + ' : ''}$${stats.totalSpentUSD}`
    : formatPrice(stats?.totalSpentINR || 0);

  const s = stats?.byStatus || {};

  return (
    <div className="space-y-5 max-w-5xl">
      <button onClick={() => navigate('/customers')} className="inline-flex items-center gap-1.5 text-[12px] text-brand-muted hover:text-brand-text transition-colors">
        <ArrowLeft size={14} /> Back to Customers
      </button>

      {/* Profile header */}
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar name={customer.name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-bold text-brand-text">{customer.name}</h1>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold capitalize" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary-dark)' }}>{customer.role}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${customer.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-bg text-brand-muted'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${customer.isActive ? 'bg-emerald-500' : 'bg-brand-muted'}`} /> {customer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-col gap-1 mt-2 text-[12px] text-brand-muted">
              <span className="flex items-center gap-1.5"><Mail size={12} />{customer.email}
                {customer.isEmailVerified
                  ? <CheckCircle2 size={12} className="text-emerald-500" />
                  : <XCircle size={12} className="text-amber-500" />}
              </span>
              {customer.phone && <span className="flex items-center gap-1.5"><Phone size={12} />{customer.phone}</span>}
              <span className="text-[11px]">Joined {formatDate(customer.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile icon={ShoppingBag} label="Total Orders" value={stats?.totalOrders ?? 0} color="var(--c-primary)" />
        <StatTile icon={Wallet} label="Total Spent" value={spent} color="var(--c-success)" />
        <StatTile icon={CheckCircle2} label="Delivered" value={s.delivered || 0} color="var(--c-success)" />
        <StatTile icon={Package} label="Active" value={(s.pending || 0) + (s.confirmed || 0) + (s.packed || 0) + (s.shipped || 0)} color="var(--c-info)" />
        <StatTile icon={XCircle} label="Cancelled" value={s.cancelled || 0} color="var(--c-danger)" />
        <StatTile icon={RotateCcw} label="Returned" value={s.returned || 0} color="var(--c-orange)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Addresses */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
            <h2 className="text-[13px] font-bold text-brand-text mb-3 flex items-center gap-1.5"><MapPin size={14} /> Addresses</h2>
            {!customer.addresses?.length ? (
              <p className="text-[11px] text-brand-muted">No saved addresses</p>
            ) : (
              <div className="space-y-3">
                {customer.addresses.map((a: CustomerAddress, i) => (
                  <div key={a._id || i} className="rounded-xl bg-brand-bg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase bg-brand-text text-white px-1.5 py-0.5 rounded">{a.label || 'Address'}</span>
                      {a.isDefault && <span className="text-[9px] text-indigo-500 font-semibold">Default</span>}
                    </div>
                    <p className="text-[12px] font-semibold text-brand-text">{a.fullName}</p>
                    <p className="text-[11px] text-brand-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                    <p className="text-[11px] text-brand-muted">{a.city}, {a.state} - {a.pincode}{a.country ? `, ${a.country}` : ''}</p>
                    <p className="text-[11px] text-brand-muted">{a.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            <div className="px-5 py-3.5 border-b border-brand-border flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-brand-text">Order History</h2>
              <span className="text-[11px] text-brand-muted">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
            </div>
            {orders.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingBag size={32} className="mx-auto mb-2 text-brand-border" />
                <p className="text-[11px] text-brand-muted">No orders yet</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-border">
                {orders.map((o) => {
                  const st = STATUS_STYLE[o.status] || STATUS_STYLE.pending;
                  return (
                    <Link key={o._id} to={`/orders/${o._id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-brand-bg transition-colors">
                      <div className="flex -space-x-2 flex-shrink-0">
                        {o.items?.slice(0, 3).map((it, i) => (
                          it.product?.images?.[0]
                            ? <img key={i} src={it.product.images[0]} alt="" className="w-9 h-11 object-cover rounded border-2 border-white" />
                            : <div key={i} className="w-9 h-11 rounded border-2 border-white bg-brand-bg" />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[11px] font-bold" style={{ color: 'var(--c-primary)' }}>#{o.orderId?.slice(-12)}</p>
                        <p className="text-[10px] text-brand-muted">{formatDateTime(o.createdAt)} · {o.items?.length} item{(o.items?.length || 0) > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[12px] font-bold text-brand-text">{formatPrice(o.total, o.currency)}</p>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize mt-0.5"
                          style={{ background: st.bg, color: st.text }}>
                          <Circle size={5} fill={st.dot} style={{ color: st.dot }} /> {o.status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
