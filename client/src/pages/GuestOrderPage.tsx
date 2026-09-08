import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Package, ArrowLeft, AlertCircle } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import { orderApi } from '../api/order.api';
import { formatPrice, formatDate } from '../utils/format';
import { useSeo } from '../hooks/useSeo';
import type { Order } from '../types';

/**
 * Order view for guests. Authorised by the token issued at checkout (also in
 * their confirmation email) rather than a session, so there's no account to
 * sign into.
 */
export default function GuestOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useSeo({ title: 'Your Order', noIndex: true });

  useEffect(() => {
    if (!id || !token) { setState('error'); return; }
    orderApi.getGuestOrder(id, token)
      .then(({ data }) => { setOrder(data.data); setState('ready'); })
      .catch(() => setState('error'));
  }, [id, token]);

  if (state === 'loading') {
    return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (state === 'error' || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ paddingTop: 'var(--topbar-height)' }}>
        <AlertCircle size={48} className="mb-4 text-brand-muted" />
        <h1 className="heading-sm text-brand-text">Order not found</h1>
        <p className="mt-2 font-body text-sm text-brand-muted">
          This link may have expired. Check the link in your confirmation email, or contact support.
        </p>
        <Link to="/" className="mt-6 inline-flex items-center gap-1.5 font-body text-sm text-primary">
          <ArrowLeft size={14} /> Back to shop
        </Link>
      </div>
    );
  }

  const currency = order.currency || 'INR';
  const money = (n: number) => formatPrice(n, currency);

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom max-w-3xl py-12">
        <div className="mb-6 flex items-center gap-3">
          <CheckCircle2 size={28} className="text-emerald-500" />
          <div>
            <h1 className="heading-sm text-brand-text">Order confirmed</h1>
            <p className="font-body text-sm text-brand-muted">
              #{order.orderId} · placed {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-brand-border bg-brand-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-body text-xs font-semibold uppercase tracking-wide text-brand-muted">Status</span>
            <span className="rounded-full bg-primary/10 px-3 py-1 font-body text-xs font-semibold capitalize text-primary">
              {order.status}
            </span>
          </div>

          <div className="space-y-3">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-brand-bg">
                  {item.product?.images?.[0] && (
                    <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm text-brand-text">{item.product?.name || item.variant?.sku}</p>
                  <p className="font-body text-xs text-brand-muted">Qty {item.quantity}</p>
                </div>
                <p className="font-body text-sm font-semibold text-brand-text">{money(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-1.5 border-t border-brand-border pt-4 font-body text-sm">
            <div className="flex justify-between text-brand-muted"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−{money(order.discount)}</span></div>
            )}
            <div className="flex justify-between text-brand-muted">
              <span>Shipping</span><span>{order.shippingCharge > 0 ? money(order.shippingCharge) : 'Free'}</span>
            </div>
            <div className="flex justify-between pt-2 text-base font-semibold text-brand-text">
              <span>Total</span><span>{money(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <p className="mb-2 flex items-center gap-2 font-body text-xs font-semibold uppercase tracking-wide text-brand-muted">
            <Package size={13} /> Delivering to
          </p>
          <p className="font-body text-sm text-brand-text">{order.shippingAddress?.fullName}</p>
          <p className="font-body text-sm text-brand-muted">
            {order.shippingAddress?.line1}
            {order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ''},{' '}
            {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
          </p>
        </div>

        <p className="mt-6 text-center font-body text-xs text-brand-muted">
          Bookmark this page to check your order — we&rsquo;ve also emailed you the link.
        </p>
        <div className="mt-4 text-center">
          <Link to="/products" className="font-body text-sm text-primary hover:underline">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
