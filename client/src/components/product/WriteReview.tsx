import { useEffect, useState } from 'react';
import { Star, PenLine, X } from 'lucide-react';
import { reviewApi } from '../../api/misc.api';
import { orderApi } from '../../api/order.api';
import { useAuthStore } from '../../stores/authStore';
import type { Order } from '../../types';
import toast from 'react-hot-toast';

/**
 * Lets a signed-in shopper review a product they've had delivered.
 *
 * The delivered order is looked up client-side purely to pre-fill `orderId` and
 * explain eligibility — the server independently decides whether the review
 * counts as a verified purchase.
 */
export default function WriteReview({
  productId, onSubmitted,
}: { productId: string; onSubmitted: () => void }) {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({ rating: 0, title: '', body: '' });
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  // Find a delivered order containing this product.
  useEffect(() => {
    if (!isAuthenticated) { setChecking(false); return; }
    orderApi.getMyOrders()
      .then(({ data }) => {
        const orders: Order[] = data.data || [];
        const match = orders.find(
          (o) => o.status === 'delivered' && o.items?.some((i) => i.product?._id === productId)
        );
        setOrderId(match?._id || null);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [isAuthenticated, productId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rating < 1) { toast.error('Pick a star rating'); return; }
    if (form.body.trim().length < 10) { toast.error('Tell us a little more — at least 10 characters'); return; }

    setSaving(true);
    try {
      await reviewApi.createReview({
        productId,
        orderId: orderId || '',
        rating: form.rating,
        title: form.title.trim() || undefined,
        body: form.body.trim(),
      });
      toast.success('Thanks! Your review is pending approval.');
      setForm({ rating: 0, title: '', body: '' });
      setOpen(false);
      onSubmitted();
    } catch { /* interceptor toasts the reason */ } finally { setSaving(false); }
  };

  if (checking) return null;

  if (!isAuthenticated) {
    return (
      <p className="rounded-xl border border-brand-border bg-brand-surface px-4 py-3 font-body text-sm text-brand-muted">
        <a href="/auth/login" className="font-semibold text-primary hover:underline">Sign in</a> to write a review.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-brand-border px-5 py-2.5 font-body text-sm font-medium text-brand-text transition-colors hover:border-primary hover:text-primary"
      >
        <PenLine size={15} /> Write a review
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="font-heading text-base font-semibold text-brand-text">Write a review</p>
          <p className="font-body text-xs text-brand-muted">
            {orderId
              ? 'You bought this — your review will show as a verified purchase.'
              : 'Reviews are published after a quick check by our team.'}
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-brand-muted hover:text-brand-text">
          <X size={18} />
        </button>
      </div>

      {/* Stars */}
      <div className="mb-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setForm({ ...form, rating: n })}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              size={26}
              className={n <= (hover || form.rating) ? 'fill-primary text-primary' : 'text-brand-border'}
            />
          </button>
        ))}
        {form.rating > 0 && (
          <span className="ml-2 font-body text-sm text-brand-muted">{form.rating} of 5</span>
        )}
      </div>

      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Sum it up (optional)"
        maxLength={100}
        className="mb-3 w-full rounded-lg border border-brand-border bg-brand-bg px-3.5 py-2.5 font-body text-sm outline-none transition-colors focus:border-primary"
      />
      <textarea
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
        placeholder="How was the fit, fabric and finish?"
        rows={4}
        maxLength={1000}
        className="w-full resize-y rounded-lg border border-brand-border bg-brand-bg px-3.5 py-2.5 font-body text-sm outline-none transition-colors focus:border-primary"
      />

      <div className="mt-4 flex items-center justify-between">
        <span className="font-body text-[11px] text-brand-muted">{form.body.length}/1000</span>
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? 'Submitting…' : 'Submit review'}
        </button>
      </div>
    </form>
  );
}
