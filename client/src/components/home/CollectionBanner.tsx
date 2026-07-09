import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface Props {
  label: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  cta: string;
  reverse?: boolean;
  dark?: boolean;
}

export default function CollectionBanner({ label, title, subtitle, image, href, cta, reverse, dark }: Props) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 ${reverse ? 'lg:grid-flow-col-dense' : ''}`}>
      {/* Image */}
      <div className={`relative overflow-hidden aspect-[4/3] lg:aspect-auto min-h-[400px] ${reverse ? 'lg:col-start-2' : ''}`}>
        <motion.img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          loading="lazy"
          whileHover={{ scale: 1.04 }}
          transition={{ duration: 0.6 }}
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: reverse ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className={`flex flex-col justify-center p-10 md:p-16 lg:p-20 ${
          dark ? 'bg-brand-text text-white' : 'bg-brand-surface'
        } ${reverse ? 'lg:col-start-1' : ''}`}
      >
        <p className="section-label mb-4 text-primary">{label}</p>
        <h2 className={`heading-md mb-5 ${dark ? 'text-white' : 'text-brand-text'}`}>{title}</h2>
        <p className={`font-body leading-relaxed mb-8 text-sm md:text-base ${dark ? 'text-white/70' : 'text-brand-muted'}`}>
          {subtitle}
        </p>
        <Link to={href} className={dark ? 'btn-primary self-start' : 'btn-outline self-start'}>
          {cta} <ArrowRight size={16} />
        </Link>
      </motion.div>
    </div>
  );
}
