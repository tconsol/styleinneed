import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore, selectSubtotal } from '../../stores/cartStore';
import { formatPrice } from '../../utils/format';

export default function CartDrawer() {
  const { isOpen, closeCart, items, updateItem, removeItem, couponDiscount, freeShipping } = useCartStore();
  const subtotal = useCartStore(selectSubtotal);

  const shippingCharge = freeShipping || subtotal >= 999 ? 0 : 99;
  const total = subtotal - couponDiscount + shippingCharge;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/40 backdrop-blur-sm z-[75]"
            onClick={closeCart}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-brand-bg z-[80] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-primary" />
                <span className="font-heading text-lg font-semibold">Your Bag</span>
                <span className="font-body text-sm text-brand-muted">({items.length} items)</span>
              </div>
              <button onClick={closeCart} className="text-brand-muted hover:text-primary transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                  <ShoppingBag size={48} className="text-brand-border" />
                  <p className="font-heading text-xl text-brand-muted">Your bag is empty</p>
                  <button onClick={closeCart} className="btn-primary text-sm">
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-brand-border">
                  {items.map((item) => (
                    <li key={`${item.product._id}-${item.variantSku}`} className="p-4 flex gap-4">
                      <Link to={`/products/${item.product.slug}`} onClick={closeCart}>
                        <img
                          src={item.product.images?.[0] || '/placeholder.jpg'}
                          alt={item.product.name}
                          className="w-20 h-24 object-cover bg-brand-surface flex-shrink-0"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/products/${item.product.slug}`}
                          onClick={closeCart}
                          className="font-body text-sm font-medium text-brand-text hover:text-primary transition-colors line-clamp-2"
                        >
                          {item.product.name}
                        </Link>
                        <p className="font-body text-xs text-brand-muted mt-1">SKU: {item.variantSku}</p>
                        <p className="font-heading text-base font-semibold text-primary mt-1.5">
                          {formatPrice(item.price)}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-brand-border">
                            <button
                              onClick={() =>
                                item.quantity > 1
                                  ? updateItem(item.product._id, item.variantSku, item.quantity - 1)
                                  : removeItem(item.product._id, item.variantSku)
                              }
                              className="w-8 h-8 flex items-center justify-center hover:bg-brand-surface transition-colors"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-10 text-center font-body text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateItem(item.product._id, item.variantSku, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-brand-surface transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.product._id, item.variantSku)}
                            className="text-brand-muted hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-brand-border p-5 space-y-3 bg-brand-surface">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-body text-sm text-brand-muted">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between font-body text-sm text-green-600">
                      <span>Coupon Discount</span>
                      <span>-{formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-body text-sm text-brand-muted">
                    <span>Shipping</span>
                    <span>{shippingCharge === 0 ? 'FREE' : formatPrice(shippingCharge)}</span>
                  </div>
                  <div className="flex justify-between font-heading text-lg font-semibold text-brand-text border-t border-brand-border pt-2 mt-1">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                {subtotal < 999 && (
                  <p className="font-body text-xs text-brand-muted text-center">
                    Add {formatPrice(999 - subtotal)} more for free shipping
                  </p>
                )}
                <Link to="/checkout" onClick={closeCart} className="btn-primary w-full justify-center">
                  Proceed to Checkout
                </Link>
                <button onClick={closeCart} className="btn-ghost w-full justify-center text-sm">
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
