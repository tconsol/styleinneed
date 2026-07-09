import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import SectionHeader from '../common/SectionHeader';
import type { TestimonialCms } from '../../hooks/useHomepageCms';

interface Props { data: TestimonialCms[]; }

export default function Testimonials({ data }: Props) {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + data.length) % data.length);
  const next = () => setCurrent((c) => (c + 1) % data.length);

  const t = data[current] || data[0];

  return (
    <section className="page-section bg-brand-surface overflow-hidden">
      <div className="container-custom max-w-4xl">
        <SectionHeader
          label="Love from our Customers"
          title="What Our Customers Say"
          subtitle="Real stories from real women who chose elegance"
        />

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center px-4 md:px-12"
            >
              {/* Stars */}
              <div className="flex justify-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={20} className="text-primary fill-primary" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="font-heading text-xl md:text-2xl text-brand-text italic leading-relaxed mb-8 text-balance">
                "{t.text}"
              </blockquote>

              {/* Author */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-heading font-bold text-lg">
                  {t.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-body font-semibold text-brand-text">{t.name}</p>
                  <p className="font-body text-sm text-brand-muted">{t.city} · {t.product}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <button onClick={prev} className="w-10 h-10 border border-brand-border flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-200">
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              {data.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`transition-all duration-300 rounded-full ${
                    i === current ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-brand-border hover:bg-primary/50'
                  }`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button onClick={next} className="w-10 h-10 border border-brand-border flex items-center justify-center hover:border-primary hover:text-primary transition-all duration-200">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
