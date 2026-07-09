import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/common/ProductCard';
import Spinner from '../components/common/Spinner';
import { productApi } from '../api/product.api';
import type { Product } from '../types';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    productApi.searchProducts(q).then(({ data }) => {
      setProducts(data.data || []);
      setTotal(data.pagination?.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: "var(--topbar-height)" }}>
      <div className="container-custom py-10">
        <h1 className="heading-sm text-brand-text mb-2">
          {q ? `Search: "${q}"` : 'Search'}
        </h1>
        {!loading && q && (
          <p className="font-body text-sm text-brand-muted mb-8">{total} results found</p>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : products.length === 0 && q ? (
          <div className="text-center py-20">
            <p className="font-heading text-2xl text-brand-muted mb-2">No results for "{q}"</p>
            <p className="font-body text-sm text-brand-muted">Try different keywords or browse our collections.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
