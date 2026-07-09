import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-2 font-body text-xs text-brand-muted" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight size={12} className="text-brand-border flex-shrink-0" />}
          {crumb.href && i < crumbs.length - 1 ? (
            <Link to={crumb.href} className="hover:text-primary transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className={i === crumbs.length - 1 ? 'text-brand-text' : ''}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
