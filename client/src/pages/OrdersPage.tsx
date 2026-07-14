import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronLeft } from 'lucide-react';
import type { Order } from '../types';
import { orderApi } from '../api/order.api';
import { formatDate, formatPrice } from '../utils/format';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getMyOrders().then(({ data }) => setOrders(data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-10 max-w-4xl">
        <Link to="/account" className="lg:hidden inline-flex items-center gap-1 font-body text-sm text-brand-muted hover:text-primary mb-4">
          <ChevronLeft size={16} /> My Account
        </Link>
        <div className="bg-white border border-brand-border p-6">
          <h1 className="font-heading text-xl font-semibold mb-6">My Orders</h1>
          {loading ? (
            <div className="flex justify-center py-12"><span className="w-8 h-8 border-2 border-brand-border border-t-primary rounded-full animate-spin" /></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package size={40} className="text-brand-border mx-auto mb-3" />
              <p className="font-body text-brand-muted">No orders yet</p>
              <Link to="/products" className="btn-primary mt-4 inline-flex">Start Shopping</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="border border-brand-border p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-body text-sm font-semibold">#{order.orderId}</p>
                      <p className="font-body text-xs text-brand-muted">{formatDate(order.createdAt)}</p>
                    </div>
                    <span className={`font-body text-xs px-2 py-1 capitalize font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {order.items.slice(0, 4).map((item, i) => (
                      <img key={i} src={item.product.images?.[0]} alt="" className="w-14 h-16 object-cover bg-brand-surface flex-shrink-0" />
                    ))}
                    {order.items.length > 4 && (
                      <div className="w-14 h-16 bg-brand-surface flex items-center justify-center text-xs text-brand-muted flex-shrink-0">+{order.items.length - 4}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-heading text-sm font-semibold">{formatPrice(order.total, order.currency)}</p>
                    <Link to={`/orders/${order._id}`} className="font-body text-sm text-primary hover:underline">Track Order &rarr;</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
