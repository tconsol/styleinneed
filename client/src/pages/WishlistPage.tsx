import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChevronLeft } from 'lucide-react';
import type { Product } from '../types';
import { useWishlistStore } from '../stores/wishlistStore';
import { formatPrice } from '../utils/format';

export default function WishlistPage() {
  const { products, fetchWishlist, toggle } = useWishlistStore();
  useEffect(() => { fetchWishlist(); }, []);

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-10 max-w-4xl">
        <Link to="/account" className="lg:hidden inline-flex items-center gap-1 font-body text-sm text-brand-muted hover:text-primary mb-4">
          <ChevronLeft size={16} /> My Account
        </Link>
        <div className="bg-white border border-brand-border p-6">
          <h1 className="font-heading text-xl font-semibold mb-6">My Wishlist ({products.length})</h1>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Heart size={40} className="text-brand-border mx-auto mb-3" />
              <p className="font-body text-brand-muted">No saved items</p>
              <Link to="/products" className="btn-primary mt-4 inline-flex">Browse Products</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((p: Product) => (
                <div key={p._id} className="group relative">
                  <Link to={`/products/${p.slug}`}>
                    <div className="aspect-[3/4] overflow-hidden bg-brand-surface mb-2">
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                    <p className="font-body text-sm text-brand-text line-clamp-1">{p.name}</p>
                    <p className="font-heading text-sm font-semibold text-primary mt-0.5">{formatPrice(p.salePrice)}</p>
                  </Link>
                  <button onClick={() => toggle(p._id)} className="absolute top-2 right-2 w-7 h-7 bg-white/90 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <Heart size={14} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
