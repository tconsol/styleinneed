import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: string;
  growth?: string | null;
  index?: number;
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = '#C8A97E', growth, index = 0 }: Props) {
  const growthNum = growth ? parseFloat(growth) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {growthNum !== null && (
          <span className={`flex items-center gap-1 text-xs font-medium font-body px-2 py-1 rounded-full ${
            growthNum > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
          }`}>
            {growthNum > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(growthNum)}%
          </span>
        )}
      </div>
      <p className="font-heading text-2xl font-bold text-brand-text mb-0.5">{value}</p>
      <p className="font-body text-xs font-semibold text-brand-text">{title}</p>
      {subtitle && <p className="font-body text-xs text-brand-muted mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}
