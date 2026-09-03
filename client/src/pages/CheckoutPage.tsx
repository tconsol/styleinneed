import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Plus, Tag, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCartStore, selectSubtotal } from '../stores/cartStore';
import { useCurrencyStore } from '../stores/currencyStore';
import { orderApi } from '../api/order.api';
import { authApi } from '../api/auth.api';
import { couponApi, shippingApi } from '../api/misc.api';
import { formatPrice } from '../utils/format';
import toast from 'react-hot-toast';

// Mirror the server's country -> region mapping so the checkout currency and
// shipping match exactly what will be charged.
const regionOf = (country?: string): 'IN' | 'US' | 'CA' => {
  const c = (country || '').trim().toLowerCase();
  if (/united states|u\.s\.a|usa|^us$/.test(c)) return 'US';
  if (/canada|^ca$/.test(c)) return 'CA';
  return 'IN';
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, fetchMe } = useAuthStore();
  const { items, couponCode, couponDiscount, setCoupon, clearCoupon, clearCart } = useCartStore();
  const subtotal = useCartStore(selectSubtotal); // INR
  const rate = useCurrencyStore((s) => s.rate);

  const [selectedAddress, setSelectedAddress] = useState(
    user?.addresses.find((a) => a.isDefault)?._id || user?.addresses[0]?._id || ''
  );
  const [paymentMethod, setPaymentMethod] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [payConfig, setPayConfig] = useState<{ razorpayKeyId: string | null; stripePublishableKey: string | null }>({ razorpayKeyId: null, stripePublishableKey: null });
  const [payConfigError, setPayConfigError] = useState(false);
  const [shipping, setShipping] = useState<{ charge: number; currency: 'INR' | 'USD'; freeShippingEligible: boolean } | null>(null);

  // Inline add-address form (no need to leave checkout).
  const emptyAddr = { label: 'Home', fullName: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India', isDefault: false };
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState(emptyAddr);
  const [savingAddr, setSavingAddr] = useState(false);

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      await authApi.manageAddresses({ action: 'add', address: addrForm });
      await fetchMe();
      const fresh = useAuthStore.getState().user;
      const newest = fresh?.addresses?.[fresh.addresses.length - 1];
      if (newest?._id) setSelectedAddress(newest._id);
      setShowAddrForm(false);
      setAddrForm(emptyAddr);
      toast.success('Address added');
    } catch { /* interceptor toasts */ } finally { setSavingAddr(false); }
  };

  // Currency + region follow the SELECTED ADDRESS (this is what the server charges).
  const addr = user?.addresses.find((a) => a._id === selectedAddress);
  const region = regionOf(addr?.country);
  const currency: 'INR' | 'USD' = region === 'IN' ? 'INR' : 'USD';
  const isUSA = currency === 'USD';

  // Convert an INR amount into the checkout currency for display.
  const toDisplay = (inr: number): number => (isUSA ? Math.round((inr / rate) * 100) / 100 : inr);
  const fmt = (inr: number) => formatPrice(toDisplay(inr), currency);

  useEffect(() => {
    orderApi.getPaymentConfig()
      .then(({ data }) => { setPayConfig(data.data); setPayConfigError(false); })
      .catch(() => setPayConfigError(true));
  }, []);

  // Fetch the real shipping charge for the selected address + cart subtotal.
  useEffect(() => {
    if (!addr) { setShipping(null); return; }
    shippingApi.quote(addr.country || 'India', addr.state || '', subtotal)
      .then(({ data }) => setShipping(data.data))
      .catch(() => setShipping(null));
  }, [addr?._id, addr?.country, addr?.state, subtotal]);

  // Default payment method to the one valid for this address's currency.
  useEffect(() => {
    if (isUSA && payConfig.stripePublishableKey) { setPaymentMethod('stripe'); return; }
    if (!isUSA && payConfig.razorpayKeyId) { setPaymentMethod('razorpay'); return; }
    if (payConfig.stripePublishableKey) setPaymentMethod('stripe');
    else if (payConfig.razorpayKeyId) setPaymentMethod('razorpay');
  }, [isUSA, payConfig]);

  const paymentMethods = [
    { id: 'cod', label: 'Cash on Delivery', sub: isUSA ? 'India only' : 'Coming Soon — not available yet', enabled: false, badge: 'Coming Soon' },
    { id: 'razorpay', label: 'UPI / Cards / Net Banking', sub: 'Secure payment via Razorpay', enabled: !!payConfig.razorpayKeyId && !isUSA, hidden: isUSA },
    { id: 'stripe', label: 'International Cards', sub: 'Secure payment via Stripe', enabled: !!payConfig.stripePublishableKey && isUSA, hidden: !isUSA },
  ].filter((pm) => !pm.hidden);

  const hasEnabledMethod = paymentMethods.some((pm) => pm.enabled);

  // Shipping charge is returned already in the checkout currency. Discount/subtotal are INR -> convert.
  const shippingDisplay = shipping ? shipping.charge : 0;
  const subtotalDisplay = toDisplay(subtotal);
  const discountDisplay = toDisplay(couponDiscount);
  const total = Math.max(0, subtotalDisplay - discountDisplay + shippingDisplay);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await couponApi.applyCoupon(couponInput, subtotal);
      setCoupon(data.data.code, data.data.discountAmount, data.data.freeShipping);
      toast.success(`Coupon applied! Saved ${fmt(data.data.discountAmount)}`);
    } catch { /* interceptor */ } finally { setCouponLoading(false); }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
    if (items.length === 0) { toast.error('Your cart is empty'); return; }
    if (!paymentMethod) { toast.error('Select a payment method'); return; }

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

      // Online → hosted gateway. Stash the SESSION so the return page can verify.
      if (data.data.url && data.data.sessionId) {
        localStorage.setItem('pendingPayment', JSON.stringify({ sessionId: data.data.sessionId, provider: data.data.provider }));
        window.location.href = data.data.url;
        return;
      }
      toast.error('Could not start payment. Please try again.');
    } catch { /* interceptor */ } finally { setPlacing(false); }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-10">
        <h1 className="heading-sm text-brand-text mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left */}
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Address */}
            <section className="bg-white border border-brand-border p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading text-lg font-semibold">Delivery Address</h2>
                {(user?.addresses.length ?? 0) > 0 && (
                  <button onClick={() => setShowAddrForm((s) => !s)} className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
                    {showAddrForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add New</>}
                  </button>
                )}
              </div>

              {user?.addresses.length === 0 && !showAddrForm ? (
                <div className="text-center py-6">
                  <p className="font-body text-sm text-brand-muted mb-3">No saved addresses</p>
                  <button onClick={() => setShowAddrForm(true)} className="btn-outline text-sm">
                    <Plus size={16} /> Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {user?.addresses.map((address) => (
                    <label key={address._id}
                      className={`flex gap-4 p-4 border-2 cursor-pointer transition-colors ${
                        selectedAddress === address._id ? 'border-primary bg-primary/3' : 'border-brand-border hover:border-primary/40'
                      }`}>
                      <input type="radio" name="address" value={address._id}
                        checked={selectedAddress === address._id}
                        onChange={() => setSelectedAddress(address._id || '')}
                        className="mt-1 accent-primary" />
                      <div>
                        <p className="font-body text-sm font-semibold">{address.fullName} · {address.label}</p>
                        <p className="font-body text-sm text-brand-muted mt-0.5">
                          {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} - {address.pincode}
                        </p>
                        <p className="font-body text-sm text-brand-muted">{address.phone} · {address.country || 'India'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Inline add-address form */}
              {showAddrForm && (
                <form onSubmit={saveAddress} className="mt-4 border-2 border-primary/30 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { k: 'label', ph: 'Label (Home/Work)', col: 1 },
                      { k: 'fullName', ph: 'Full name', col: 1 },
                      { k: 'phone', ph: 'Phone (10-digit)', col: 1 },
                      { k: 'email', ph: 'Email (order updates)', col: 1 },
                      { k: 'line1', ph: 'Address line 1', col: 2 },
                      { k: 'line2', ph: 'Line 2 (optional)', col: 2 },
                      { k: 'city', ph: 'City', col: 1 },
                      { k: 'state', ph: 'State', col: 1 },
                      { k: 'pincode', ph: 'Pincode', col: 1 },
                      { k: 'country', ph: 'Country', col: 1 },
                    ] as const).map(({ k, ph, col }) => (
                      <input key={k} value={String(addrForm[k])}
                        onChange={(e) => setAddrForm({ ...addrForm, [k]: e.target.value })}
                        placeholder={ph} required={k !== 'line2'}
                        className={`${col === 2 ? 'sm:col-span-2' : ''} w-full px-3.5 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-brand-text text-sm outline-none focus:border-primary transition-colors placeholder:text-brand-muted/60`} />
                    ))}
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })} className="w-4 h-4 accent-primary" />
                    <span className="font-body text-sm text-brand-text">Set as default</span>
                  </label>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddrForm(false)} className="btn-outline text-sm rounded-lg">Cancel</button>
                    <button type="submit" disabled={savingAddr} className="btn-primary text-sm rounded-lg">{savingAddr ? 'Saving…' : 'Save Address'}</button>
                  </div>
                </form>
              )}
            </section>

            {/* Payment */}
            <section className="bg-white border border-brand-border p-6">
              <h2 className="font-heading text-lg font-semibold mb-5">Payment Method</h2>
              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <label key={pm.id}
                    className={`flex gap-4 p-4 border-2 transition-colors ${!pm.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
                      paymentMethod === pm.id ? 'border-primary bg-primary/3' : 'border-brand-border hover:border-primary/40'
                    }`}>
                    <input type="radio" name="payment" value={pm.id}
                      checked={paymentMethod === pm.id} disabled={!pm.enabled}
                      onChange={() => setPaymentMethod(pm.id)} className="mt-1 accent-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm font-semibold">{pm.label}</p>
                        {'badge' in pm && pm.badge && (
                          <span className="font-body text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pm.badge}</span>
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

                {/* No selectable method — tell the user why instead of a dead form. */}
                {!hasEnabledMethod && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-body text-sm font-semibold text-amber-800">Payment is temporarily unavailable</p>
                    <p className="font-body text-xs text-amber-700 mt-1">
                      {payConfigError
                        ? 'We couldn\'t load payment options. Please refresh, or sign out and sign back in.'
                        : 'Online payment isn\'t configured for your region yet. Please try again later or contact support.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Order Summary */}
          <aside className="space-y-5">
            <div className="bg-white border border-brand-border p-6">
              <h2 className="font-heading text-lg font-semibold mb-5">Order Summary</h2>

              <ul className="space-y-3 mb-5 pb-5 border-b border-brand-border">
                {items.map((item) => (
                  <li key={`${item.product._id}-${item.variantSku}`} className="flex gap-3">
                    <img src={item.product.images?.[0]} alt={item.product.name}
                      className="w-14 h-16 object-cover bg-brand-surface flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs font-medium line-clamp-2">{item.product.name}</p>
                      <p className="font-body text-xs text-brand-muted mt-0.5">Qty: {item.quantity}</p>
                      <p className="font-body text-sm font-semibold text-primary mt-1">{fmt(item.price * item.quantity)}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mb-5 pb-5 border-b border-brand-border">
                <label className="input-label flex items-center gap-1"><Tag size={14} /> Apply Coupon</label>
                <div className="flex gap-2 mt-1.5">
                  <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="COUPON CODE" className="input-field flex-1 uppercase text-xs tracking-wider" disabled={!!couponCode} />
                  {couponCode ? (
                    <button onClick={clearCoupon} className="px-3 text-sm text-red-500 border border-brand-border">Remove</button>
                  ) : (
                    <button onClick={applyCoupon} disabled={couponLoading || !couponInput} className="btn-primary text-xs px-4 py-2 disabled:opacity-60">Apply</button>
                  )}
                </div>
                {couponCode && <p className="font-body text-xs text-green-600 mt-1">{'✓'} {couponCode} applied</p>}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between font-body text-sm text-brand-muted">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between font-body text-sm text-green-600">
                    <span>Discount</span><span>-{fmt(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-body text-sm text-brand-muted">
                  <span>Shipping{isUSA && addr?.state ? ` (${addr.state})` : ''}</span>
                  <span>{!shipping ? '—' : shippingDisplay === 0 ? 'FREE' : formatPrice(shippingDisplay, currency)}</span>
                </div>
                <div className="flex justify-between font-heading text-xl font-bold text-brand-text border-t border-brand-border pt-3 mt-1">
                  <span>Total</span><span>{formatPrice(total, currency)}</span>
                </div>
                {isUSA && (
                  <p className="font-body text-[11px] text-brand-muted pt-1">Prices in USD. Delivery charged per state — no free shipping for USA/Canada.</p>
                )}
              </div>

              <motion.button onClick={handlePlaceOrder} disabled={placing || !selectedAddress}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full justify-center mt-6 disabled:opacity-60 disabled:cursor-not-allowed">
                {placing ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : paymentMethod === 'cod' ? 'Place Order' : 'Proceed to Pay'}
              </motion.button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
