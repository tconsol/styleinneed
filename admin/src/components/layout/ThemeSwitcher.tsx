import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { themeApi } from '../../api';
import { applyAppearance, type ThemeTokens } from '../../lib/theme';
import toast from 'react-hot-toast';

// Quick theme picker in the navbar — apply any theme in one click, live.
export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [themes, setThemes] = useState<ThemeTokens[]>([]);
  const [active, setActive] = useState('');
  const [appear, setAppear] = useState<{ fontHeading: string; fontBody: string; applyToAdmin: boolean }>({ fontHeading: 'Poppins', fontBody: 'Inter', applyToAdmin: true });
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const { data } = await themeApi.getAll();
      setThemes(data.data.themes || []);
      setActive(data.data.activeTheme || '');
      setAppear({ fontHeading: data.data.fontHeading, fontBody: data.data.fontBody, applyToAdmin: data.data.applyToAdmin });
    } catch { /* ignore */ }
  };

  // Load lazily the first time the menu opens.
  useEffect(() => { if (open && themes.length === 0) void load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const pick = async (t: ThemeTokens) => {
    setActive(t.key);
    applyAppearance({ ...t, ...appear }); // instant, respects the admin-apply flag
    setOpen(false);
    try { await themeApi.setActive(t.key); toast.success(`"${t.name}" applied`); }
    catch { toast.error('Failed to apply'); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Change theme"
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.97)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
      >
        <Palette size={16} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl overflow-hidden z-50"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: '0 12px 32px rgba(0,0,0,0.16)' }}>
          <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <span className="text-[11px] font-bold" style={{ color: 'var(--c-text)' }}>Quick Theme</span>
            <Link to="/themes" onClick={() => setOpen(false)} className="text-[10px] font-semibold" style={{ color: 'var(--c-primary)' }}>Manage</Link>
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {themes.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px]" style={{ color: 'var(--c-muted)' }}>Loading…</div>
            ) : themes.map((t) => {
              const isActive = t.key === active;
              return (
                <button key={t.key} onClick={() => pick(t)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left"
                  style={{ background: isActive ? 'var(--c-primary-soft)' : 'transparent' }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--c-tr-hover)'; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  {/* Swatch */}
                  <span className="flex gap-0.5 flex-shrink-0">
                    {[t.primary, t.secondary, t.primaryDark].map((c, i) => (
                      <span key={i} className="w-3.5 h-3.5 rounded-full" style={{ background: c, border: '1px solid var(--c-border)' }} />
                    ))}
                  </span>
                  <span className="flex-1 text-[12px] font-medium truncate" style={{ color: 'var(--c-text)' }}>{t.name}</span>
                  {isActive && <Check size={13} style={{ color: 'var(--c-primary)' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
