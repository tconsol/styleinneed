import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import type { Product } from '../../types';
import { formatPrice } from '../../utils/format';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useWishlistStore } from '../../stores/wishlistStore';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const [imgIdx, setImgIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const { toggle, isWishlisted } = useWishlistStore();
  const wishlisted = isWishlisted(product._id);

  const defaultVariant = product.variants?.[0];
  const hasStock = product.variants?.some((v) => v.stock > 0) ?? false;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!defaultVariant) return;
    await addItem(product._id, defaultVariant.sku);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { window.location.href = '/auth/login'; return; }
    await toggle(product._id);
  };

  return (
    <article className="group">
      <Link to={`/products/${product.slug}`} className="block">
        {/* Image container */}
        <div className="relative overflow-hidden bg-brand-surface aspect-product">
          {/* Skeleton */}
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}

          <img
            src={product.images?.[imgIdx] || '/placeholder.jpg'}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.04] ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onMouseEnter={() => product.images?.[1] && setImgIdx(1)}
            onMouseLeave={() => setImgIdx(0)}
            loading="lazy"
          />

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
            {product.isNewArrival && (
              <span className="bg-brand-text text-white font-body text-[9px] tracking-widest uppercase px-2 py-1 leading-none">
                New
              </span>
            )}
            {product.discountPercentage > 0 && (
              <span className="bg-primary text-white font-body text-[9px] tracking-widest uppercase px-2 py-1 leading-none">
                -{product.discountPercentage}%
              </span>
            )}
            {!hasStock && (
              <span className="bg-brand-muted text-white font-body text-[9px] tracking-widest uppercase px-2 py-1 leading-none">
                Sold Out
              </span>
            )}
          </div>

          {/* Wishlist — always visible on mobile, hover on desktop */}
          <button
            onClick={handleWishlist}
            className={`absolute top-2.5 right-2.5 w-9 h-9 flex items-center justify-center transition-all duration-200 shadow-md sm:opacity-0 sm:translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 ${
              wishlisted ? 'bg-primary text-white' : 'bg-white text-brand-text hover:bg-primary hover:text-white'
            }`}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            style={{ minWidth: 36, minHeight: 36 }}
          >
            <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>

          {/* Quick Add — bottom overlay */}
          {hasStock && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-0 left-0 right-0 bg-brand-text/90 text-white font-body text-[11px] tracking-[0.2em] uppercase py-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-2"
              style={{ minHeight: '44px' }}
            >
              <ShoppingBag size={13} /> Add to Bag
            </button>
          )}

          {/* Image counter — mobile */}
          {product.images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/40 text-white font-body text-[9px] px-1.5 py-0.5 sm:hidden">
              {product.images.length} pics
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pt-2.5 pb-1">
          <p className="font-body text-[10px] sm:text-xs text-brand-muted tracking-wide mb-0.5 truncate">
            {product.category?.name}
          </p>
          <h3 className="font-body text-xs sm:text-sm font-medium text-brand-text group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {/* Ratings */}
          {product.ratings.count > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={10}
                    className={s <= Math.round(product.ratings.average) ? 'text-primary fill-primary' : 'text-brand-border fill-brand-border'}
                  />
                ))}
              </div>
              <span className="font-body text-[10px] text-brand-muted">({product.ratings.count})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="font-heading text-sm sm:text-base font-semibold text-brand-text">
              {formatPrice(product.salePrice)}
            </span>
            {product.mrp > product.salePrice && (
              <span className="font-body text-xs text-brand-muted line-through">
                {formatPrice(product.mrp)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
