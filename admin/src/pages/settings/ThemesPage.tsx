import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Palette, Check, Plus, Trash2, Save, Star, ShoppingBag, Sparkles, Pencil,
  Type, ChevronDown, Search, MonitorCog, RotateCcw,
} from 'lucide-react';
import { themeApi } from '../../api';
import { applyAppearance, refreshTheme, loadGoogleFont, type ThemeTokens } from '../../lib/theme';
import { FONTS } from '../../lib/fonts';
import Modal from '../../components/common/Modal';
import { useConfirm } from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const DEFAULT_HEADING = 'Poppins';
const DEFAULT_BODY = 'Inter';

const FIELDS: { key: keyof ThemeTokens; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'primaryLight', label: 'Primary Light' },
  { key: 'primaryDark', label: 'Primary Dark' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'secondaryLight', label: 'Secondary Light' },
  { key: 'secondaryDark', label: 'Secondary Dark' },
  { key: 'bg', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted' },
  { key: 'border', label: 'Border' },
];

const PALETTE_KEYS: (keyof ThemeTokens)[] = ['primary', 'primaryDark', 'secondary', 'bg', 'surface', 'text', 'muted', 'border'];

const BLANK: ThemeTokens = {
  key: '', name: '',
  primary: '#4F46E5', primaryLight: '#818CF8', primaryDark: '#3730A3',
  secondary: '#EC4899', secondaryLight: '#F9A8D4', secondaryDark: '#BE185D',
  bg: '#F1F5F9', surface: '#FFFFFF', text: '#1E293B', muted: '#64748B', border: '#E2E8F0',
};

function readable(hex: string): string {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(n, 16);
  const [r, g, b] = [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#111827' : '#FFFFFF';
}

// ── Custom font dropdown: each option previewed in its own typeface ──
function FontSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { loadGoogleFont(value); }, [value]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const list = useMemo(() => FONTS.filter((f) => f.toLowerCase().includes(q.toLowerCase())), [q]);
  // Load previews for the visible options.
  useEffect(() => { if (open) list.slice(0, 80).forEach(loadGoogleFont); }, [open, list]);

  return (
    <div ref={ref} className="relative">
      <label className="input-label flex items-center gap-1.5"><Type size={12} /> {label}</label>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl transition-all"
        style={{ background: 'var(--c-input)', border: `1.5px solid ${open ? 'var(--c-primary)' : 'var(--c-border)'}`, boxShadow: open ? '0 0 0 4px var(--c-primary-soft)' : 'none' }}>
        <span className="text-[15px] truncate" style={{ fontFamily: `'${value}', sans-serif`, color: 'var(--c-text)' }}>{value}</span>
        <ChevronDown size={15} style={{ color: 'var(--c-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden z-30"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: '0 16px 40px rgba(0,0,0,0.18)' }}>
          <div className="p-2" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--c-bg)' }}>
              <Search size={13} style={{ color: 'var(--c-muted)' }} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts…"
                className="flex-1 bg-transparent outline-none text-[12px]" style={{ color: 'var(--c-text)' }} />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {list.length === 0 && <p className="px-3 py-4 text-center text-[11px]" style={{ color: 'var(--c-muted)' }}>No fonts found</p>}
            {list.map((f) => {
              const sel = f === value;
              return (
                <button key={f} type="button" onClick={() => { onChange(f); setOpen(false); setQ(''); }}
                  className="w-full flex items-center justify-between gap-2 px-3.5 py-2 transition-colors text-left"
                  style={{ background: sel ? 'var(--c-primary-soft)' : 'transparent' }}
                  onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'var(--c-tr-hover)'; }}
                  onMouseLeave={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <span className="flex flex-col min-w-0">
                    <span className="text-[15px] truncate leading-tight" style={{ fontFamily: `'${f}', sans-serif`, color: 'var(--c-text)' }}>{f}</span>
                    <span className="text-[9px]" style={{ color: 'var(--c-muted)' }}>Aa Bb 123 — Elegance</span>
                  </span>
                  {sel && <Check size={14} style={{ color: 'var(--c-primary)', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<ThemeTokens[]>([]);
  const [active, setActive] = useState('');
  const [previewKey, setPreviewKey] = useState('');
  const [editing, setEditing] = useState<ThemeTokens | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  // Staged fonts (preview only until Apply); saved = what's actually committed.
  const [fontHeading, setFontHeading] = useState(DEFAULT_HEADING);
  const [fontBody, setFontBody] = useState(DEFAULT_BODY);
  const [savedFonts, setSavedFonts] = useState({ heading: DEFAULT_HEADING, body: DEFAULT_BODY });
  const [fontSaving, setFontSaving] = useState(false);
  const [applyToAdmin, setApplyToAdmin] = useState(true);
  const confirm = useConfirm();

  const load = async () => {
    const { data } = await themeApi.getAll();
    const list: ThemeTokens[] = data.data.themes || [];
    setThemes(list);
    setActive(data.data.activeTheme || '');
    const h = data.data.fontHeading || DEFAULT_HEADING;
    const b = data.data.fontBody || DEFAULT_BODY;
    setFontHeading(h); setFontBody(b); setSavedFonts({ heading: h, body: b });
    setApplyToAdmin(data.data.applyToAdmin ?? true);
    setPreviewKey((prev) => prev || data.data.activeTheme || list[0]?.key || '');
    loadGoogleFont(h); loadGoogleFont(b);
  };
  useEffect(() => { void load(); }, []);

  const activeTokens = useMemo(() => themes.find((t) => t.key === active) || themes[0], [themes, active]);
  const preview = useMemo(() => editing || themes.find((t) => t.key === previewKey) || themes[0], [editing, themes, previewKey]);
  const fontsDirty = fontHeading !== savedFonts.heading || fontBody !== savedFonts.body;

  // Live apply uses SAVED fonts by default — staged font picks don't commit until "Apply Fonts".
  const applyLive = (o: Partial<{ theme: ThemeTokens; fontHeading: string; fontBody: string; applyToAdmin: boolean }> = {}) => {
    const t = o.theme || activeTokens;
    if (!t) return;
    applyAppearance({
      ...t,
      fontHeading: o.fontHeading ?? savedFonts.heading,
      fontBody: o.fontBody ?? savedFonts.body,
      applyToAdmin: o.applyToAdmin ?? applyToAdmin,
    });
  };

  const activate = async (t: ThemeTokens) => {
    setActive(t.key); applyLive({ theme: t });
    try { await themeApi.setActive(t.key); toast.success(`"${t.name}" applied`); } catch { toast.error('Failed to apply'); }
  };

  // Dropdown / default button only stage the choice (updates the preview).
  const stageFont = (which: 'heading' | 'body', value: string) => {
    loadGoogleFont(value);
    if (which === 'heading') setFontHeading(value); else setFontBody(value);
  };
  const resetFonts = () => { setFontHeading(DEFAULT_HEADING); setFontBody(DEFAULT_BODY); loadGoogleFont(DEFAULT_HEADING); loadGoogleFont(DEFAULT_BODY); };

  // Apply button commits fonts → applies live + broadcasts to the storefront.
  const applyFonts = async () => {
    setFontSaving(true);
    try {
      applyLive({ fontHeading, fontBody });
      await themeApi.setAppearance({ fontHeading, fontBody });
      setSavedFonts({ heading: fontHeading, body: fontBody });
      toast.success('Fonts applied');
    } catch { toast.error('Failed to apply fonts'); } finally { setFontSaving(false); }
  };

  const toggleAdmin = async () => {
    const next = !applyToAdmin;
    setApplyToAdmin(next); applyLive({ applyToAdmin: next });
    try { await themeApi.setAppearance({ applyToAdmin: next }); toast.success(next ? 'Theme applies to admin' : 'Admin uses default look'); }
    catch { toast.error('Failed to save'); }
  };

  const openEdit = (t: ThemeTokens) => { setEditing({ ...t }); setIsNew(false); };
  const openNew = () => { setEditing({ ...BLANK }); setIsNew(true); };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error('Theme name required'); return; }
    setSaving(true);
    try {
      const payload = { ...editing, key: isNew ? editing.name : editing.key };
      const { data } = await themeApi.save(payload);
      toast.success('Theme saved');
      if (data.data.key === active) applyLive({ theme: data.data });
      setEditing(null); await load(); setPreviewKey(data.data.key);
    } catch { /* toasts */ } finally { setSaving(false); }
  };

  const remove = async (t: ThemeTokens) => {
    if (!(await confirm({ title: 'Delete theme?', message: `"${t.name}" will be removed.`, confirmText: 'Delete', danger: true }))) return;
    try { await themeApi.remove(t.key); toast.success('Theme deleted'); await load(); await refreshTheme(); }
    catch { toast.error('Failed to delete'); }
  };

  const headFam = `'${fontHeading}', serif`;
  const bodyFam = `'${fontBody}', sans-serif`;

  return (
    <div className="space-y-5 pb-4">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: 'linear-gradient(120deg, var(--c-primary-dark), var(--c-primary) 60%, var(--c-secondary))' }}>
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
              <Palette size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-[20px] font-black text-white leading-none">Appearance Studio</h1>
              <p className="text-[11px] text-white/70 mt-1.5">{themes.length} themes · colours & typography for the storefront and admin</p>
            </div>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all"
            style={{ background: '#fff', color: 'var(--c-primary-dark)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.96)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}>
            <Plus size={15} /> New Theme
          </button>
        </div>
      </div>

      {/* Typography */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type size={15} style={{ color: 'var(--c-primary)' }} />
            <p className="text-[13px] font-bold text-brand-text">Typography</p>
            {fontsDirty && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#FEF3C7', color: '#92400E' }}>Unsaved</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetFonts} className="btn-outline !py-1.5 text-[11px]"><RotateCcw size={12} /> Default</button>
            <button onClick={applyFonts} disabled={!fontsDirty || fontSaving} className="btn-primary !py-1.5 text-[11px] disabled:opacity-50">
              <Check size={13} /> {fontSaving ? 'Applying…' : 'Apply Fonts'}
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <FontSelect label="Heading Font" value={fontHeading} onChange={(v) => stageFont('heading', v)} />
            <div className="mt-2.5 px-3.5 py-3 rounded-xl" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
              <p className="text-[20px] font-bold leading-tight truncate" style={{ fontFamily: headFam, color: 'var(--c-text)' }}>Elegance Redefined</p>
            </div>
          </div>
          <div>
            <FontSelect label="Body Font" value={fontBody} onChange={(v) => stageFont('body', v)} />
            <div className="mt-2.5 px-3.5 py-3 rounded-xl" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
              <p className="text-[12px] leading-relaxed" style={{ fontFamily: bodyFam, color: 'var(--c-muted)' }}>Premium ethnic &amp; western wear. The quick brown fox jumps over the lazy dog — 1234567890.</p>
            </div>
          </div>
        </div>
        {fontsDirty && <p className="text-[10px] text-brand-muted -mt-1">Preview shown above · click <b>Apply Fonts</b> to update the storefront{applyToAdmin ? ' and admin' : ''}.</p>}

        {/* Apply-to-admin toggle row */}
        <button onClick={toggleAdmin}
          className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
          style={{ border: '1px solid var(--c-border)', background: applyToAdmin ? 'var(--c-primary-soft)' : 'var(--c-bg)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--c-surface)', color: 'var(--c-primary)', border: '1px solid var(--c-border)' }}>
            <MonitorCog size={16} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[12px] font-bold text-brand-text leading-none">Apply to admin panel</p>
            <p className="text-[10px] text-brand-muted mt-1">{applyToAdmin ? 'This panel uses the active theme & fonts' : 'This panel keeps its default look'}</p>
          </div>
          <span className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0" style={{ background: applyToAdmin ? 'var(--c-primary)' : 'var(--c-border)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: applyToAdmin ? '22px' : '2px' }} />
          </span>
        </button>
      </div>

      {/* Themes + preview */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {themes.map((t) => {
            const isActive = t.key === active;
            const isPrev = t.key === previewKey && !editing;
            return (
              <button key={t.key} onClick={() => { setPreviewKey(t.key); setEditing(null); }}
                className="text-left rounded-2xl overflow-hidden transition-all"
                style={{
                  background: 'var(--c-surface)',
                  border: `2px solid ${isActive ? 'var(--c-primary)' : isPrev ? 'var(--c-primary-soft)' : 'var(--c-border)'}`,
                  boxShadow: isPrev ? '0 10px 28px rgba(0,0,0,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transform: isPrev ? 'translateY(-2px)' : 'none',
                }}>
                <div className="h-20 relative flex items-end p-2.5" style={{ background: `linear-gradient(120deg, ${t.primaryDark}, ${t.primary} 55%, ${t.secondary})` }}>
                  <div className="flex gap-1">
                    {[t.primary, t.secondary, t.bg, t.surface].map((c, i) => (
                      <span key={i} className="w-4 h-4 rounded-full" style={{ background: c, border: '1.5px solid rgba(255,255,255,0.7)' }} />
                    ))}
                  </div>
                  {isActive && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fff', color: t.primaryDark }}>
                      <Check size={9} /> Active
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[12.5px] font-bold text-brand-text truncate">{t.name}</p>
                  <div className="flex items-center gap-1 mt-2.5">
                    {!isActive
                      ? <span onClick={(e) => { e.stopPropagation(); activate(t); }} className="btn-primary flex-1 justify-center !py-1.5 text-[11px] cursor-pointer">Apply</span>
                      : <span className="flex-1 text-center text-[10px] font-bold py-1.5 rounded-lg" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary)' }}>In use</span>}
                    <span onClick={(e) => { e.stopPropagation(); openEdit(t); }} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" style={{ color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                      <Pencil size={12} />
                    </span>
                    <span onClick={(e) => { e.stopPropagation(); remove(t); }} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" style={{ color: '#EF4444', border: '1px solid var(--c-border)' }}>
                      <Trash2 size={12} />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live preview rail */}
        <div className="lg:sticky lg:top-4 space-y-4">
          {preview && (
            <div className="card !p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--c-border)' }}>
                <Sparkles size={14} className="text-brand-muted" />
                <p className="text-[12px] font-bold text-brand-text">Live Preview</p>
                <span className="ml-auto text-[10px] text-brand-muted truncate max-w-[45%]">{preview.name || 'New theme'}</span>
              </div>

              <div className="p-4" style={{ background: preview.bg }}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: preview.surface, border: `1px solid ${preview.border}` }}>
                  <ShoppingBag size={14} style={{ color: preview.primary }} />
                  <span className="text-[12px] font-bold" style={{ color: preview.text, fontFamily: headFam }}>Style In Need</span>
                  <span className="ml-auto w-6 h-6 rounded-full" style={{ background: preview.primary }} />
                </div>
                <p className="text-[17px] font-black leading-tight" style={{ color: preview.text, fontFamily: headFam }}>Elegance Redefined</p>
                <p className="text-[11px] mt-0.5" style={{ color: preview.muted, fontFamily: bodyFam }}>Premium ethnic &amp; western wear.</p>
                <div className="flex gap-2 mt-3" style={{ fontFamily: bodyFam }}>
                  <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: preview.primary, color: readable(preview.primary) }}>Shop Now</span>
                  <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ color: preview.primary, border: `1.5px solid ${preview.primary}` }}>Collections</span>
                </div>
                <div className="mt-3 rounded-xl overflow-hidden" style={{ background: preview.surface, border: `1px solid ${preview.border}` }}>
                  <div className="h-16" style={{ background: `linear-gradient(135deg, ${preview.secondaryLight}, ${preview.primaryLight})` }} />
                  <div className="p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color: preview.text, fontFamily: headFam }}>Silk Saree</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: preview.secondary, color: readable(preview.secondary) }}>NEW</span>
                    </div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={10} style={{ color: preview.primary, fill: preview.primary }} />)}
                      <span className="text-[9px] ml-1" style={{ color: preview.muted, fontFamily: bodyFam }}>(128)</span>
                    </div>
                    <p className="text-[12px] font-black mt-1" style={{ color: preview.text, fontFamily: headFam }}>₹2,499</p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3" style={{ borderTop: '1px solid var(--c-border)' }}>
                <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted mb-2">Palette</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PALETTE_KEYS.map((k) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md flex-shrink-0" style={{ background: preview[k], border: '1px solid var(--c-border)' }} />
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold text-brand-text capitalize leading-none">{k.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-[9px] text-brand-muted font-mono uppercase leading-none mt-0.5">{preview[k]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!editing && preview.key !== active && (
                <div className="px-4 pb-4">
                  <button onClick={() => activate(preview)} className="btn-primary w-full justify-center">
                    <Check size={14} /> Apply "{preview.name}"
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Editor — modal popup */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'New Theme' : `Edit — ${editing?.name || ''}`} size="xl">
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="input-label">Theme Name</label>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input-field" placeholder="e.g. Midnight Blue" autoFocus />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <input type="color" value={editing[f.key] || '#000000'} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    className="w-9 h-9 rounded-lg border cursor-pointer flex-shrink-0" style={{ borderColor: 'var(--c-border)' }} />
                  <div className="flex-1 min-w-0">
                    <label className="input-label !mb-0.5">{f.label}</label>
                    <input value={editing[f.key] || ''} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                      className="input-field !py-1.5 text-[11px] font-mono" placeholder="#000000" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="btn-outline flex-1 justify-center">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center">
                <Save size={14} /> {saving ? 'Saving…' : 'Save Theme'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
