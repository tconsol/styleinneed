import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function normalise(opt: SelectOption | string): SelectOption {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

export default function Select({ value, onChange, options, placeholder = 'Select...', disabled, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const opts = options.map(normalise);
  const selected = opts.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[12px] font-medium rounded-lg transition-all duration-150 text-left"
        style={{
          background: 'var(--c-input)',
          border: open ? '1.5px solid var(--c-primary)' : '1.5px solid var(--c-border)',
          color: selected ? 'var(--c-text)' : 'var(--c-muted)',
          minHeight: '36px',
          boxShadow: open ? '0 0 0 3px rgba(79,70,229,0.1)' : 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown
          size={14}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ color: '#94A3B8', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 py-1 rounded-xl overflow-hidden"
          style={{
            background: 'var(--c-surface)',
            border: '1.5px solid var(--c-border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {opts.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-[12px] text-left transition-colors"
                style={{
                  background: isSelected ? 'rgba(79,70,229,0.12)' : 'transparent',
                  color: isSelected ? 'var(--c-primary)' : 'var(--c-text)',
                  fontWeight: isSelected ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--c-bg)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={12} style={{ color: '#4F46E5', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
