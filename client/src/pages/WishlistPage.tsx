import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product } from '../types';
import { useWishlistStore } from '../stores/wishlistStore';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useMoney } from '../hooks/useMoney';
import AccountHeader from '../components/account/AccountHeader';

export default function WishlistPage() {
  const { products, fetchWishlist, toggle } = useWishlistStore();
  const { addItem, openCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { format } = useMoney();
  const navigate = useNavigate();
  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  // Quick add — drops the first in-stock variant straight into the cart.
  const handleAddToCart = async (p: Product) => {
    if (!isAuthenticated) { navigate('/auth/login', { state: { from: '/wishlist' } }); return; }
    const variant = p.variants?.find((v) => v.stock > 0) || p.variants?.[0];
    if (!variant) { toast.error('Out of stock'); return; }
    await addItem(p._id, variant.sku);
    openCart();
  };

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-8 md:py-12 max-w-5xl">
        <AccountHeader
          eyebrow="Account"
          title="My Wishlist"
          subtitle="Your saved styles — ready when you are."
          right={
            <span className="hidden sm:inline-flex items-center gap-2 font-heading text-sm font-semibold text-primary bg-primary/10 border border-primary/20 px-4 py-2.5 rounded-full">
              <Heart size={14} fill="currentColor" />
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          }
        />

        {products.length === 0 ? (
          <div className="bg-white border border-dashed border-brand-border rounded-2xl py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
              <Heart size={24} className="text-primary" />
            </div>
            <p className="font-heading text-lg font-semibold text-brand-text mb-1.5">Nothing saved yet</p>
            <p className="font-body text-sm text-brand-muted mb-7">Tap the heart on any style to keep it here for later.</p>
            <Link to="/products" className="btn-primary inline-flex">Browse Products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
            {products.map((p: Product, i: number) => (
              <div key={p._id} className="group relative animate-[fadeUp_0.5s_ease_both]" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <Link to={`/products/${p.slug}`} className="block">
                  <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-brand-surface relative">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-text/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="pt-3 px-1">
                    <p className="font-body text-[13px] text-brand-text line-clamp-1">{p.name}</p>
                    <p className="font-heading text-sm font-bold text-primary mt-0.5">{format(p.salePrice, p.usdSalePrice)}</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleAddToCart(p)}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 bg-primary text-white font-body text-[12px] font-semibold uppercase tracking-wider py-2.5 rounded-full hover:bg-primary-dark transition-colors duration-200"
                >
                  <ShoppingBag size={14} /> Add to Cart
                </button>
                <button
                  onClick={() => toggle(p._id)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white hover:scale-110 transition-all duration-200"
                  aria-label="Remove from wishlist"
                >
                  <Heart size={15} fill="currentColor" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
