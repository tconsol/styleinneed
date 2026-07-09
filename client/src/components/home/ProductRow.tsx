import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import ProductCard from '../common/ProductCard';
import SectionHeader from '../common/SectionHeader';
import Spinner from '../common/Spinner';
import type { Product } from '../../types';

interface Props {
  label?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  isLoading?: boolean;
  viewAllHref: string;
}

export default function ProductRow({ label, title, subtitle, products, isLoading, viewAllHref }: Props) {
  const swiperRef = useRef<SwiperType | null>(null);

  return (
    <section className="page-section">
      <div className="container-custom">
        <div className="flex items-end justify-between mb-10">
          <SectionHeader label={label} title={title} subtitle={subtitle} center={false} />
          <Link
            to={viewAllHref}
            className="hidden md:flex items-center gap-2 font-body text-sm text-primary hover:gap-3 transition-all duration-200"
          >
            View All <ArrowRight size={16} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="relative">
            <Swiper
              modules={[Navigation, A11y]}
              spaceBetween={16}
              slidesPerView={1.2}
              breakpoints={{
                480: { slidesPerView: 2.2, spaceBetween: 16 },
                768: { slidesPerView: 3.2, spaceBetween: 20 },
                1024: { slidesPerView: 4, spaceBetween: 24 },
                1280: { slidesPerView: 5, spaceBetween: 24 },
              }}
              onSwiper={(s) => (swiperRef.current = s)}
            >
              {products.map((product) => (
                <SwiperSlide key={product._id}>
                  <ProductCard product={product} />
                </SwiperSlide>
              ))}
            </Swiper>

            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white border border-brand-border shadow-md flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-200 hidden md:flex"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white border border-brand-border shadow-md flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-200 hidden md:flex"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link to={viewAllHref} className="btn-outline">
            View All <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
