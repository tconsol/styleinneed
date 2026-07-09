import { useEffect, useState } from 'react';
import HeroSection from '../components/home/HeroSection';
import ProductRow from '../components/home/ProductRow';
import ShopByCategory from '../components/home/ShopByCategory';
import FashionStory from '../components/home/FashionStory';
import CollectionBanner from '../components/home/CollectionBanner';
import Testimonials from '../components/home/Testimonials';
import NewsletterSection from '../components/home/NewsletterSection';
import InfiniteMarquee from '../components/home/InfiniteMarquee';
import { productApi } from '../api/product.api';
import { useHomepageCms } from '../hooks/useHomepageCms';
import type { Product } from '../types';

export default function HomePage() {
  const cms = useHomepageCms();
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [na, bs, tr] = await Promise.all([
          productApi.getProducts({ isNewArrival: true, limit: 10 }),
          productApi.getProducts({ isBestSeller: true, limit: 10 }),
          productApi.getProducts({ isTrending: true, limit: 10 }),
        ]);
        setNewArrivals(na.data.data || []);
        setBestSellers(bs.data.data || []);
        setTrending(tr.data.data || []);
      } catch {}
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const b = cms.banners;

  return (
    <>
      <HeroSection slides={cms.hero} />

      <InfiniteMarquee items={cms.marquee} />

      <ProductRow
        label="Fresh Drops"
        title="New Arrivals"
        subtitle="First looks at the latest additions to our collection"
        products={newArrivals}
        isLoading={loading}
        viewAllHref="/products?isNewArrival=true"
      />

      <ShopByCategory />

      {b[0] && (
        <CollectionBanner
          label={b[0].label}
          title={b[0].title}
          subtitle={b[0].subtitle}
          image={b[0].image}
          href={b[0].href}
          cta={b[0].cta}
          dark={b[0].dark}
          reverse={b[0].reverse}
        />
      )}

      <ProductRow
        label="Top Picks"
        title="Best Sellers"
        subtitle="The pieces our customers can't stop talking about"
        products={bestSellers}
        isLoading={loading}
        viewAllHref="/products?isBestSeller=true"
      />

      {b[1] && (
        <CollectionBanner
          label={b[1].label}
          title={b[1].title}
          subtitle={b[1].subtitle}
          image={b[1].image}
          href={b[1].href}
          cta={b[1].cta}
          dark={b[1].dark}
          reverse={b[1].reverse}
        />
      )}

      <ProductRow
        label="What's Hot"
        title="Trending Now"
        products={trending}
        isLoading={loading}
        viewAllHref="/products?isTrending=true"
      />

      <FashionStory data={cms.fashionStory} />

      <Testimonials data={cms.testimonials} />

      <InfiniteMarquee items={cms.marquee} reverse />

      <NewsletterSection data={cms.newsletter} />
    </>
  );
}
