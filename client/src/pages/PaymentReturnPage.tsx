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

  const orderId = params.get('order');
  const status = params.get('status');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      if (!orderId) { setState('failed'); return; }
      if (status === 'cancel') {
        toast('Payment cancelled');
        setState('failed');
        return;
      }

      // Provider stashed before the redirect.
      let provider: 'razorpay' | 'stripe' = 'razorpay';
      try {
        const pending = JSON.parse(localStorage.getItem('pendingPayment') || '{}');
        if (pending.provider) provider = pending.provider;
      } catch { /* ignore */ }

      try {
        if (provider === 'stripe') await orderApi.verifyStripePayment({ orderId });
        else await orderApi.verifyPayment({ orderId });
        localStorage.removeItem('pendingPayment');
        await clearCart();
        setState('success');
        toast.success('Payment confirmed!');
        setTimeout(() => navigate(`/orders/${orderId}`), 1200);
      } catch {
        setState('failed');
      }
    };
    void run();
  }, [orderId, status, clearCart, navigate]);

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
            {orderId && <button onClick={() => navigate(`/orders/${orderId}`)} className="btn-primary text-sm">View Order</button>}
            <button onClick={() => navigate('/checkout')} className="btn-outline text-sm">Back to Checkout</button>
          </div>
        </>
      )}
    </div>
  );
}
