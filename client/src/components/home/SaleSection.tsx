import { Link } from 'react-router-dom';
import { Tag, ArrowRight } from 'lucide-react';
import ProductCard from '../common/ProductCard';
import { usePromotionStore } from '../../stores/promotionStore';
import type { Product } from '../../types';

// Home "Special Sale" strip — only renders when a promotion is live. Shows the
// products picked for the active sales; hidden entirely when none are running.
export default function SaleSection() {
  const active = usePromotionStore((s) => s.active);
  if (active.length === 0) return null;

  // Union of the sale products (populated), de-duped, that have card data.
  const seen = new Set<string>();
  const products: Product[] = [];
  for (const promo of active) {
    for (const p of promo.applicableProducts) {
      const prod = p as Product;
      if (prod && prod._id && prod.images?.length && !seen.has(prod._id)) {
        seen.add(prod._id); products.push(prod);
      }
    }
  }

  const headline = active.length === 1 ? active[0].name : 'Special Sales';

  return (
    <section className="page-section overflow-hidden" style={{ background: 'rgb(var(--color-secondary) / 0.06)' }}>
      <div className="container-custom">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white animate-pulse" style={{ background: 'rgb(var(--color-secondary))' }}>
              <Tag size={11} /> Limited Time
            </span>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-brand-text mt-2">{headline}</h2>
          </div>
          <Link to="/sale" className="inline-flex items-center gap-1.5 font-body text-xs font-semibold uppercase tracking-wider text-secondary hover:opacity-80 transition-opacity">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="flex gap-3 sm:gap-5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 8).map((p) => (
              <div key={p._id} className="flex-shrink-0 w-[150px] sm:w-auto"><ProductCard product={p} /></div>
            ))}
          </div>
        ) : (
          <Link to="/sale" className="block text-center rounded-2xl py-10 text-white font-heading text-lg font-semibold"
            style={{ background: 'linear-gradient(120deg, rgb(var(--color-primary-dark)), rgb(var(--color-primary)) 60%, rgb(var(--color-secondary)))' }}>
            Explore the sale →
          </Link>
        )}
      </div>
    </section>
  );
}
