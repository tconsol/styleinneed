import { motion } from 'framer-motion';

interface Props {
  label?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}

export default function SectionHeader({ label, title, subtitle, center = true }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`mb-10 md:mb-14 ${center ? 'text-center' : ''}`}
    >
      {label && <p className="section-label mb-3">{label}</p>}
      <h2 className="heading-md text-brand-text">{title}</h2>
      {subtitle && (
        <p className="font-body text-brand-muted mt-3 max-w-xl mx-auto leading-relaxed text-sm md:text-base">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
