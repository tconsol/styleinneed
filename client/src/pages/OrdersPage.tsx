import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import type { Order } from '../types';
import { orderApi } from '../api/order.api';
import { formatDate, formatPrice } from '../utils/format';
import AccountHeader from '../components/account/AccountHeader';

const STATUS_STYLES: Record<string, { dot: string; pill: string }> = {
  pending:    { dot: 'bg-amber-400',      pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed:  { dot: 'bg-blue-400',       pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  packed:     { dot: 'bg-indigo-400',     pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  shipped:    { dot: 'bg-purple-400',     pill: 'bg-purple-50 text-purple-700 border-purple-200' },
  delivered:  { dot: 'bg-emerald-400',    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:  { dot: 'bg-red-400',        pill: 'bg-red-50 text-red-600 border-red-200' },
  returned:   { dot: 'bg-orange-400',     pill: 'bg-orange-50 text-orange-700 border-orange-200' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getMyOrders().then(({ data }) => setOrders(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-8 md:py-12 max-w-4xl">
        <AccountHeader
          eyebrow="Account"
          title="My Orders"
          subtitle="Track, review and manage everything you've ordered."
        />

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-brand-border rounded-2xl p-6">
                <div className="h-4 skeleton w-1/3 mb-4" />
                <div className="flex gap-3 mb-5">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="w-16 h-20 skeleton rounded-xl" />
                  ))}
                </div>
                <div className="h-3 skeleton w-1/2" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-dashed border-brand-border rounded-2xl py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <Package size={24} className="text-primary" />
            </div>
            <p className="font-heading text-lg font-semibold text-brand-text mb-1.5">No orders yet</p>
            <p className="font-body text-sm text-brand-muted mb-7">Your future orders will live here, beautifully organised.</p>
            <Link to="/products" className="btn-primary inline-flex">Start Shopping</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const st = STATUS_STYLES[order.status] || { dot: 'bg-gray-400', pill: 'bg-gray-50 text-gray-600 border-gray-200' };
              return (
                <div
                  key={order._id}
                  className="bg-white border border-brand-border rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgba(28,28,28,0.04)] hover:shadow-[0_12px_36px_rgba(28,28,28,0.07)] hover:border-primary/30 transition-all duration-300 group"
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
                    <div>
                      <p className="font-body text-sm font-bold text-brand-text">#{order.orderId}</p>
                      <p className="font-body text-[11px] text-brand-muted">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className={`ml-auto inline-flex items-center gap-1.5 font-body text-[11px] font-medium px-3 py-1.5 rounded-full border capitalize ${st.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex -space-x-3 flex-shrink-0">
                      {order.items.slice(0, 4).map((item, i) => (
                        <img
                          key={i}
                          src={item.product?.images?.[0] || item.variant?.images?.[0]}
                          alt=""
                          className="w-14 h-[72px] md:w-16 md:h-20 object-cover rounded-xl bg-brand-surface border-2 border-white flex-shrink-0 shadow-sm"
                        />
                      ))}
                      {order.items.length > 4 && (
                        <div className="w-14 h-[72px] md:w-16 md:h-20 rounded-xl border-2 border-white bg-brand-surface flex items-center justify-center font-body text-xs font-semibold text-brand-muted flex-shrink-0">
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-body text-[10px] uppercase tracking-[0.2em] text-brand-muted mb-1">Total</p>
                      <p className="font-heading text-base md:text-lg font-bold text-brand-text">{formatPrice(order.total, order.currency)}</p>
                      <Link
                        to={`/orders/${order._id}`}
                        className="inline-flex items-center gap-1 font-body text-[11px] font-semibold uppercase tracking-wider text-primary hover:text-primary-dark transition-colors mt-2 group-hover:gap-2"
                      >
                        Track Order <ArrowRight size={13} className="transition-all" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
