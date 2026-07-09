import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { CheckCircle2, Circle, Package, Truck, MapPin, X, ExternalLink } from 'lucide-react';
import { orderApi } from '../api/order.api';
import { formatPrice, formatDate } from '../utils/format';
import type { Order } from '../types';
import toast from 'react-hot-toast';

const SERVER_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

const FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  packed: 'bg-indigo-100 text-indigo-700',
  shipped: 'bg-violet-100 text-violet-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
};

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const tried = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  const load = () => {
    if (!id) return;
    orderApi.getOrderById(id).then(({ data }) => setOrder(data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  // Real-time order status updates via socket.io
  useEffect(() => {
    if (!id) return;
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('order:updated', (payload: { orderId: string; status: string; statusHistory: unknown[] }) => {
      if (payload.orderId !== id) return;
      setOrder((prev) => prev ? { ...prev, status: payload.status as Order['status'], statusHistory: payload.statusHistory as Order['statusHistory'] } : prev);
      toast.success(`Order status: ${payload.status}`, { id: 'order-status' });
    });

    return () => { socket.disconnect(); };
  }, [id]);

  // Self-heal: re-verify an online order still marked pending (covers the user
  // navigating back before the gateway finished capturing the payment).
  useEffect(() => {
    if (!order || tried.current) return;
    const online = order.paymentMethod === 'razorpay' || order.paymentMethod === 'stripe';
    if (online && order.paymentStatus === 'pending') {
      tried.current = true;
      setVerifying(true);
      const call = order.paymentMethod === 'stripe' ? orderApi.verifyStripePayment : orderApi.verifyPayment;
      call({ orderId: order._id }).then(() => load()).catch(() => {}).finally(() => setVerifying(false));
    }
  }, [order?._id, order?.paymentStatus]);

  const cancel = async () => {
    if (!order || !window.confirm('Cancel this order? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await orderApi.cancelOrder(order._id, 'Customer request');
      toast.success('Order cancelled');
      load();
    } catch {
      toast.error('Could not cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center" style={{ paddingTop: 'var(--topbar-height)' }}>
        <span className="w-8 h-8 border-2 border-brand-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4" style={{ paddingTop: 'var(--topbar-height)' }}>
        <p className="font-body text-brand-muted">Order not found.</p>
        <Link to="/account?tab=orders" className="btn-outline text-sm">Back to orders</Link>
      </div>
    );
  }

  const flowIndex = FLOW.indexOf(order.status as typeof FLOW[number]);
  const isTerminal = order.status === 'cancelled' || order.status === 'returned';
  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const history = (order.statusHistory ?? []).slice().reverse();

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="heading-sm text-brand-text">Order #{order.orderId}</h1>
            <p className="font-body text-sm text-brand-muted mt-1">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <span className={`font-body text-xs px-3 py-1.5 capitalize font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
            {order.status}
          </span>
        </div>

        {verifying && (
          <div className="flex items-center gap-2 bg-brand-surface border border-brand-border p-3 mb-6">
            <span className="w-4 h-4 border-2 border-brand-border border-t-primary rounded-full animate-spin" />
            <span className="font-body text-sm text-brand-text">Confirming your payment…</span>
          </div>
        )}

        {/* Horizontal progress (active flow) */}
        {!isTerminal && (
          <div className="bg-white border border-brand-border p-6 mb-6">
            <div className="flex items-center justify-between">
              {FLOW.map((s, i) => {
                const done = i <= flowIndex;
                const Icon = s === 'shipped' ? Truck : s === 'packed' ? Package : s === 'delivered' ? MapPin : CheckCircle2;
                return (
                  <div key={s} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && <div className={`absolute top-4 right-1/2 w-full h-0.5 ${done ? 'bg-primary' : 'bg-brand-border'}`} />}
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-primary text-white' : 'bg-brand-surface text-brand-muted border border-brand-border'}`}>
                      <Icon size={16} />
                    </div>
                    <span className={`font-body text-xs mt-2 capitalize ${done ? 'text-brand-text' : 'text-brand-muted'}`}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracking history */}
        {history.length > 0 && (
          <div className="bg-white border border-brand-border p-6 mb-6">
            <h2 className="font-heading text-lg font-semibold mb-5">Order Tracking</h2>
            <ol className="relative">
              {history.map((h, i) => (
                <li key={i} className="flex gap-4 pb-5 last:pb-0">
                  <div className="flex flex-col items-center">
                    {i === 0 ? <CheckCircle2 size={18} className="text-primary" /> : <Circle size={18} className="text-brand-border" />}
                    {i < history.length - 1 && <div className="w-0.5 flex-1 bg-brand-border mt-1" />}
                  </div>
                  <div className="flex-1 -mt-0.5">
                    <p className="font-body text-sm font-semibold capitalize text-brand-text">{h.status}</p>
                    {h.note && <p className="font-body text-xs text-brand-muted mt-0.5">{h.note}</p>}
                    <p className="font-body text-xs text-brand-muted mt-0.5">{formatDate(h.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {order.trackingUrl && (
          <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="btn-primary w-full justify-center mb-6">
            <Truck size={16} /> Track Shipment{order.awbCode ? ` · ${order.awbCode}` : ''} <ExternalLink size={14} />
          </a>
        )}

        {/* Items */}
        <div className="bg-white border border-brand-border p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold mb-5">Items</h2>
          <ul className="space-y-4">
            {order.items.map((it, i) => (
              <li key={i} className="flex gap-4">
                <Link to={`/products/${it.product.slug}`}>
                  <img src={it.product.images?.[0] || '/placeholder.jpg'} alt={it.product.name} className="w-16 h-20 object-cover bg-brand-surface" />
                </Link>
                <div className="flex-1">
                  <Link to={`/products/${it.product.slug}`} className="font-body text-sm font-medium hover:text-primary line-clamp-2">{it.product.name}</Link>
                  {it.variant?.attributes && <p className="font-body text-xs text-brand-muted mt-0.5">{Object.values(it.variant.attributes).join(' · ')}</p>}
                  <p className="font-body text-xs text-brand-muted mt-0.5">Qty {it.quantity} · {formatPrice(it.price)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div className="bg-white border border-brand-border p-6">
            <h2 className="font-heading text-lg font-semibold mb-3">Delivery Address</h2>
            <p className="font-body text-sm text-brand-muted leading-relaxed">
              {order.shippingAddress.fullName}<br />
              {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}<br />
              {order.shippingAddress.phone}
            </p>
          </div>

          {/* Payment */}
          <div className="bg-white border border-brand-border p-6">
            <h2 className="font-heading text-lg font-semibold mb-3">Payment</h2>
            <div className="space-y-1.5 font-body text-sm">
              <div className="flex justify-between text-brand-muted"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between text-brand-muted"><span>Shipping</span><span>{order.shippingCharge === 0 ? 'FREE' : formatPrice(order.shippingCharge)}</span></div>
              <div className="flex justify-between font-semibold text-brand-text border-t border-brand-border pt-2 mt-1"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              <p className="text-xs text-brand-muted pt-2 uppercase">{order.paymentMethod} · {order.paymentStatus}</p>
            </div>
          </div>
        </div>

        {canCancel && (
          <button onClick={cancel} disabled={cancelling} className="mt-6 w-full border-2 border-red-300 text-red-500 font-body text-sm font-medium py-3 flex items-center justify-center gap-2 hover:bg-red-50 disabled:opacity-60">
            <X size={16} /> {cancelling ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}
      </div>
    </div>
  );
}
