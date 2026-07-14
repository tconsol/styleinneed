import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Plus, Tag } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore, selectSubtotal } from '../stores/cartStore';
import { orderApi } from '../api/order.api';
import { couponApi } from '../api/misc.api';
import { formatPrice } from '../utils/format';
import { useRegion } from '../hooks/useRegion';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, couponCode, couponDiscount, freeShipping, setCoupon, clearCoupon, clearCart } = useCartStore();
  const subtotal = useCartStore(selectSubtotal);

  const [selectedAddress, setSelectedAddress] = useState(
    user?.addresses.find((a) => a.isDefault)?._id || user?.addresses[0]?._id || ''
  );
  const { isIndia, isUSA } = useRegion();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [payConfig, setPayConfig] = useState<{ razorpayKeyId: string | null; stripePublishableKey: string | null }>({ razorpayKeyId: null, stripePublishableKey: null });

  useEffect(() => {
    orderApi.getPaymentConfig().then(({ data }) => setPayConfig(data.data)).catch(() => {});
  }, []);

  // Set default payment method based on region once payConfig loads
  useEffect(() => {
    if (paymentMethod) return; // already set
    if (isIndia && payConfig.razorpayKeyId) { setPaymentMethod('razorpay'); return; }
    if (isUSA && payConfig.stripePublishableKey) { setPaymentMethod('stripe'); return; }
    if (payConfig.razorpayKeyId) setPaymentMethod('razorpay');
    else if (payConfig.stripePublishableKey) setPaymentMethod('stripe');
  }, [isIndia, isUSA, payConfig]);

  const paymentMethods = [
    {
      id: 'cod',
      label: 'Cash on Delivery',
      sub: 'Coming Soon — not available yet',
      enabled: false,
      badge: 'Coming Soon',
    },
    {
      id: 'razorpay',
      label: 'UPI / Cards / Net Banking',
      sub: 'Secure payment via Razorpay',
      enabled: !!payConfig.razorpayKeyId && (isIndia || (!isIndia && !isUSA)),
      hidden: isUSA,
    },
    {
      id: 'stripe',
      label: 'International Cards',
      sub: 'Secure payment via Stripe',
      enabled: !!payConfig.stripePublishableKey && (isUSA || (!isIndia && !isUSA)),
      hidden: isIndia,
    },
  ].filter((pm) => !pm.hidden);

  const currency = isUSA ? 'USD' : 'INR';
  const shippingCharge = freeShipping || subtotal >= 999 ? 0 : 99;
  const total = subtotal - couponDiscount + shippingCharge;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await couponApi.applyCoupon(couponInput, subtotal);
      setCoupon(data.data.code, data.data.discountAmount, data.data.freeShipping);
      toast.success(`Coupon applied! Saved ${formatPrice(data.data.discountAmount, currency)}`);
    } catch {
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
    if (items.length === 0) { toast.error('Your cart is empty'); return; }

    setPlacing(true);
    try {
      const { data } = await orderApi.createOrder({
        addressId: selectedAddress,
        paymentMethod,
        couponCode: couponCode || undefined,
      });

      if (paymentMethod === 'cod') {
        await clearCart();
        toast.success('Order placed successfully!');
        navigate(`/orders/${data.data.orderId}`);
        return;
      }

      // Online → hosted gateway. Stash the order so the return page can verify.
      if (data.data.url) {
        localStorage.setItem('pendingPayment', JSON.stringify({ orderId: data.data.orderId, provider: data.data.provider }));
        window.location.href = data.data.url;
        return;
      }

      toast.error('Could not start payment. Please try again.');
    } catch {
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: "var(--topbar-height)" }}>
      <div className="container-custom py-10">
        <h1 className="heading-sm text-brand-text mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left */}
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Address */}
            <section className="bg-white border border-brand-border p-6">
              <h2 className="font-heading text-lg font-semibold mb-5">Delivery Address</h2>
              {user?.addresses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="font-body text-sm text-brand-muted mb-3">No saved addresses</p>
                  <button
                    onClick={() => navigate('/addresses')}
                    className="btn-outline text-sm"
                  >
                    <Plus size={16} /> Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {user?.addresses.map((addr) => (
                    <label
                      key={addr._id}
                      className={`flex gap-4 p-4 border-2 cursor-pointer transition-colors ${
                        selectedAddress === addr._id ? 'border-primary bg-primary/3' : 'border-brand-border hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={addr._id}
                        checked={selectedAddress === addr._id}
                        onChange={() => setSelectedAddress(addr._id || '')}
                        className="mt-1 accent-primary"
                      />
                      <div>
                        <p className="font-body text-sm font-semibold">{addr.fullName} · {addr.label}</p>
                        <p className="font-body text-sm text-brand-muted mt-0.5">
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="font-body text-sm text-brand-muted">{addr.phone}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Payment */}
            <section className="bg-white border border-brand-border p-6">
              <h2 className="font-heading text-lg font-semibold mb-5">Payment Method</h2>
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <label
                    key={pm.id}
                    className={`flex gap-4 p-4 border-2 transition-colors ${!pm.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
                      paymentMethod === pm.id ? 'border-primary bg-primary/3' : 'border-brand-border hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={pm.id}
                      checked={paymentMethod === pm.id}
                      disabled={!pm.enabled}
                      onChange={() => setPaymentMethod(pm.id)}
                      className="mt-1 accent-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm font-semibold">{pm.label}</p>
                        {'badge' in pm && pm.badge && (
                          <span className="font-body text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {pm.badge}
                          </span>
                        )}
                      </div>
                      <p className="font-body text-xs text-brand-muted mt-0.5">{pm.sub}</p>
                    </div>
                    {paymentMethod === pm.id && (
                      <div className="ml-auto w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Order Summary */}
          <aside className="space-y-5">
            <div className="bg-white border border-brand-border p-6">
              <h2 className="font-heading text-lg font-semibold mb-5">Order Summary</h2>

              {/* Items */}
              <ul className="space-y-3 mb-5 pb-5 border-b border-brand-border">
                {items.map((item) => (
                  <li key={`${item.product._id}-${item.variantSku}`} className="flex gap-3">
                    <img
                      src={item.product.images?.[0] || '/placeholder.jpg'}
                      alt={item.product.name}
                      className="w-14 h-16 object-cover bg-brand-surface flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs font-medium line-clamp-2">{item.product.name}</p>
                      <p className="font-body text-xs text-brand-muted mt-0.5">Qty: {item.quantity}</p>
                      <p className="font-body text-sm font-semibold text-primary mt-1">{formatPrice(item.price * item.quantity, currency)}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Coupon */}
              <div className="mb-5 pb-5 border-b border-brand-border">
                <label className="input-label flex items-center gap-1">
                  <Tag size={14} /> Apply Coupon
                </label>
                <div className="flex gap-2 mt-1.5">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="COUPON CODE"
                    className="input-field flex-1 uppercase text-xs tracking-wider"
                    disabled={!!couponCode}
                  />
                  {couponCode ? (
                    <button onClick={clearCoupon} className="px-3 text-sm text-red-500 border border-brand-border">
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponInput}
                      className="btn-primary text-xs px-4 py-2 disabled:opacity-60"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {couponCode && (
                  <p className="font-body text-xs text-green-600 mt-1">{'✓'} {couponCode} applied</p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between font-body text-sm text-brand-muted">
                  <span>Subtotal</span><span>{formatPrice(subtotal, currency)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between font-body text-sm text-green-600">
                    <span>Discount</span><span>-{formatPrice(couponDiscount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-body text-sm text-brand-muted">
                  <span>Shipping</span><span>{shippingCharge === 0 ? 'FREE' : formatPrice(shippingCharge, currency)}</span>
                </div>
                <div className="flex justify-between font-heading text-xl font-bold text-brand-text border-t border-brand-border pt-3 mt-1">
                  <span>Total</span><span>{formatPrice(total, currency)}</span>
                </div>
              </div>

              <motion.button
                onClick={handlePlaceOrder}
                disabled={placing || !selectedAddress}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full justify-center mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {placing ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  paymentMethod === 'cod' ? 'Place Order' : 'Proceed to Pay'
                )}
              </motion.button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
