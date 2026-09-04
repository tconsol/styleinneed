import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option { value: string; label: string }

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

// Storefront-styled select — bordered trigger + animated panel, primary-tinted
// hover/selected states. Replaces the native <select> in filters.
export default function Dropdown({ value, onChange, options, placeholder = 'Select', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border bg-brand-surface text-sm transition-colors ${open ? 'border-primary' : 'border-brand-border hover:border-primary/50'}`}>
        <span className={`truncate ${selected ? 'text-brand-text' : 'text-brand-muted'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={15} className={`text-brand-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-lg border border-brand-border bg-brand-surface shadow-luxury max-h-64 overflow-y-auto py-1">
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors ${sel ? 'text-primary bg-primary/10 font-medium' : 'text-brand-text hover:bg-primary/5'}`}>
                <span className="truncate">{o.label}</span>
                {sel && <Check size={14} className="text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
