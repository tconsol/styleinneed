import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AccountHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  backTo?: string;
  backLabel?: string;
  right?: React.ReactNode;
}

export default function AccountHeader({
  title,
  subtitle,
  eyebrow,
  backTo = '/account',
  backLabel = 'My Account',
  right,
}: AccountHeaderProps) {
  return (
    <header className="mb-8 md:mb-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-muted bg-white border border-brand-border rounded-full pl-3 pr-5 py-2.5 hover:text-primary hover:border-primary/50 transition-colors group"
        >
          <span className="w-6 h-6 rounded-full border border-brand-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
            <ArrowLeft size={12} />
          </span>
          {backLabel}
        </Link>
        {right}
      </div>
      <div className="mt-6 md:mt-7 flex items-start gap-4">
        <span className="mt-1.5 w-10 h-[2px] bg-gradient-to-r from-primary to-primary-light flex-shrink-0" />
        <div>
          {eyebrow && (
            <p className="font-body text-[10px] tracking-[0.35em] uppercase text-primary font-semibold mb-1.5">{eyebrow}</p>
          )}
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-brand-text leading-tight">{title}</h1>
          {subtitle && <p className="font-body text-sm text-brand-muted mt-2 max-w-lg leading-relaxed">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}
