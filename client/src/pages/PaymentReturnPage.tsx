import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { orderApi } from '../api/order.api';
import { useCartStore } from '../stores/cartStore';
import toast from 'react-hot-toast';

export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clearCart = useCartStore((s) => s.clearCart);
  const [state, setState] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const ran = useRef(false);

  // New flow: the gateway returns with a payment-session id. (Legacy `order`
  // param is still read as a fallback for any in-flight old links.)
  const sessionId = params.get('session') || undefined;
  const status = params.get('status');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      if (status === 'cancel') {
        toast('Payment cancelled');
        setState('failed');
        return;
      }

      // Provider + session stashed before the redirect.
      let provider: 'razorpay' | 'stripe' = 'razorpay';
      let sid = sessionId;
      try {
        const pending = JSON.parse(localStorage.getItem('pendingPayment') || '{}');
        if (pending.provider) provider = pending.provider;
        if (!sid && pending.sessionId) sid = pending.sessionId;
      } catch { /* ignore */ }

      if (!sid) { setState('failed'); return; }

      try {
        const { data } = provider === 'stripe'
          ? await orderApi.verifyStripePayment({ sessionId: sid })
          : await orderApi.verifyPayment({ sessionId: sid });
        localStorage.removeItem('pendingPayment');
        await clearCart();
        setState('success');
        toast.success('Payment confirmed!');
        const orderId = data?.data?.orderId;
        setTimeout(() => navigate(orderId ? `/orders/${orderId}` : '/orders'), 1200);
      } catch {
        setState('failed');
      }
    };
    void run();
  }, [sessionId, status, clearCart, navigate]);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 text-center" style={{ paddingTop: 'var(--topbar-height)' }}>
      {state === 'verifying' && (
        <>
          <span className="w-10 h-10 border-2 border-brand-border border-t-primary rounded-full animate-spin mb-4" />
          <p className="font-body text-brand-muted">Confirming your payment…</p>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle2 size={56} className="text-green-500 mb-4" />
          <h1 className="heading-sm text-brand-text">Payment Successful</h1>
          <p className="font-body text-sm text-brand-muted mt-2">Redirecting to your order…</p>
        </>
      )}
      {state === 'failed' && (
        <>
          <XCircle size={56} className="text-red-400 mb-4" />
          <h1 className="heading-sm text-brand-text">Payment Not Confirmed</h1>
          <p className="font-body text-sm text-brand-muted mt-2 max-w-sm">
            If you completed the payment it will reflect shortly. You can check your order status anytime.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate('/orders')} className="btn-primary text-sm">My Orders</button>
            <button onClick={() => navigate('/checkout')} className="btn-outline text-sm">Back to Checkout</button>
          </div>
        </>
      )}
    </div>
  );
}
