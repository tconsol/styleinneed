import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CornerDownLeft, ArrowUp, ArrowDown, Clock, X, Command,
  Plus, LogOut, Palette, Sparkles, Settings, UserCircle, KeyRound,
} from 'lucide-react';
import { NAV_ITEMS, buildStaffNav } from './Sidebar';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useRecentPagesStore } from '../../stores/recentPagesStore';

type IconType = typeof Search;

interface Entry {
  id: string;
  label: string;
  section: string;
  icon: IconType;
  /** Extra words that should match, beyond the label. */
  keywords?: string;
  href?: string;
  run?: () => void;
}

/**
 * Pages that exist but are not in the sidebar's main nav — they live in its
 * footer, so without this they would be unreachable from search.
 */
const EXTRA_PAGES: { label: string; href: string; icon: IconType; keywords: string; adminOnly?: boolean }[] = [
  { label: 'Settings', href: '/settings', icon: Settings, keywords: 'settings config store options preferences', adminOnly: true },
  { label: 'My Profile', href: '/profile', icon: UserCircle, keywords: 'profile account me name' },
  { label: 'Change Password', href: '/change-password', icon: KeyRound, keywords: 'password credentials' },
];

/** Actions that aren't just a page — the "do something" half of the palette. */
const QUICK_ACTIONS: { label: string; href: string; icon: IconType; keywords: string }[] = [
  { label: 'New Product', href: '/products/new', icon: Plus, keywords: 'create add product item' },
  { label: 'New Role', href: '/roles/new', icon: Plus, keywords: 'create add role permission' },
];

/**
 * Rank a match so the most obvious answer lands first.
 *
 * A label that starts with the query beats one that merely contains it, and a
 * label match beats a keyword-only match — otherwise typing "or" could put
 * "Vendors" above "Orders".
 */
const score = (entry: Entry, q: string): number => {
  const label = entry.label.toLowerCase();
  const keywords = (entry.keywords || '').toLowerCase();

  if (label === q) return 100;
  if (label.startsWith(q)) return 90;

  // Word-boundary hit: "size" should match "Size Charts" strongly.
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 80;
  if (label.includes(q)) return 60;

  // Initials: "gc" finds "Gift Cards".
  const initials = label.split(/\s+/).map((w) => w[0]).join('');
  if (initials.startsWith(q)) return 55;

  if (keywords.split(/\s+/).some((w) => w.startsWith(q))) return 40;
  if (keywords.includes(q)) return 25;

  // Subsequence, so "whmk" still reaches "WhatsApp Marketing".
  let i = 0;
  for (const ch of label) if (ch === q[i]) i += 1;
  if (i === q.length) return 15;

  return 0;
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const { pages: recent, clear: clearRecent } = useRecentPagesStore();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** Only the pages this account can actually open. */
  const navSections = useMemo(() => {
    if (!user) return [];
    return user.role === 'admin'
      ? NAV_ITEMS
      : buildStaffNav(user.role, user.permissions || []);
  }, [user]);

  const entries = useMemo<Entry[]>(() => {
    const pages: Entry[] = navSections.flatMap((s) =>
      s.items.map((i) => ({
        id: `page:${i.href}`,
        label: i.label,
        section: s.section,
        icon: i.icon as IconType,
        href: i.href,
      }))
    );

    const extras: Entry[] = EXTRA_PAGES
      // Providers have no Settings page, matching the sidebar.
      .filter((e) => !e.adminOnly || user?.role !== 'provider')
      .map((e) => ({
        id: `page:${e.href}`,
        label: e.label,
        section: 'Account',
        icon: e.icon,
        keywords: e.keywords,
        href: e.href,
      }));

    const reachable = new Set(pages.map((p) => p.href));
    const actions: Entry[] = QUICK_ACTIONS
      // Don't offer "New Product" to someone with no Products page.
      .filter((a) => reachable.has(`/${a.href.split('/')[1]}`))
      .map((a) => ({
        id: `action:${a.href}`,
        label: a.label,
        section: 'Actions',
        icon: a.icon,
        keywords: a.keywords,
        href: a.href,
      }));

    const commands: Entry[] = [
      {
        id: 'cmd:theme',
        label: isDark ? 'Switch to light mode' : 'Switch to dark mode',
        section: 'Actions',
        icon: Palette,
        keywords: 'theme dark light appearance',
        run: () => toggle(),
      },
      {
        id: 'cmd:logout',
        label: 'Sign out',
        section: 'Actions',
        icon: LogOut,
        keywords: 'logout exit quit',
        run: () => { void logout().then(() => navigate('/login')); },
      },
    ];

    return [...pages, ...extras, ...actions, ...commands];
  }, [navSections, user?.role, isDark, toggle, logout, navigate]);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return entries
      .map((e) => ({ e, s: score(e, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.e.label.localeCompare(b.e.label))
      .slice(0, 12)
      .map((r) => r.e);
  }, [entries, q]);

  /** With no query the palette shows history, so it's useful immediately. */
  const recentEntries = useMemo<Entry[]>(() => {
    const byHref = new Map(entries.filter((e) => e.href).map((e) => [e.href!, e]));
    return recent
      .map((r) => byHref.get(r.href))
      .filter((e): e is Entry => !!e)
      .slice(0, 6);
  }, [recent, entries]);

  const shown = q ? results : recentEntries;

  useEffect(() => { setActive(0); }, [q, open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    // A frame's delay — the input does not exist until the modal has mounted.
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (entry?: Entry) => {
    if (!entry) return;
    onClose();
    if (entry.run) entry.run();
    else if (entry.href) navigate(entry.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % Math.max(shown.length, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + shown.length) % Math.max(shown.length, 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(shown[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  // Group headings, so a long result list stays readable.
  let lastSection = '';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9998] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          />

          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative w-full max-w-[560px] rounded-2xl overflow-hidden"
            style={{
              background: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.30)',
            }}
          >
            {/* Query */}
            <div className="flex items-center gap-2.5 px-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
              <Search size={16} style={{ color: 'var(--c-muted)' }} className="flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages and actions…"
                className="flex-1 bg-transparent outline-none py-3.5 text-[14px]"
                style={{ color: 'var(--c-text)' }}
              />
              {query && (
                <button onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ color: 'var(--c-muted)' }}>
                  <X size={13} />
                </button>
              )}
              <kbd className="hidden sm:block text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: 'var(--c-input)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} style={{ maxHeight: 340, overflowY: 'auto' }}>
              {!q && recentEntries.length > 0 && (
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--c-muted)' }}>
                    <Clock size={11} /> Recently opened
                  </span>
                  <button onClick={clearRecent} className="text-[10px] font-semibold" style={{ color: 'var(--c-muted)' }}>
                    Clear
                  </button>
                </div>
              )}

              {shown.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Sparkles size={24} className="mx-auto mb-2" style={{ color: 'var(--c-border)' }} />
                  <p className="text-[12px]" style={{ color: 'var(--c-muted)' }}>
                    {q ? `Nothing matches “${query}”` : 'Start typing to find a page'}
                  </p>
                </div>
              ) : shown.map((entry, i) => {
                const Icon = entry.icon;
                const isActive = i === active;
                const heading = q && entry.section !== lastSection ? entry.section : '';
                lastSection = entry.section;

                return (
                  <div key={entry.id}>
                    {heading && (
                      <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--c-muted)' }}>
                        {heading}
                      </p>
                    )}
                    <button
                      data-idx={i}
                      onClick={() => choose(entry)}
                      onMouseEnter={() => setActive(i)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ background: isActive ? 'var(--c-primary-soft)' : 'transparent' }}
                    >
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isActive ? 'var(--c-primary)' : 'var(--c-input)',
                          color: isActive ? '#fff' : 'var(--c-muted)',
                        }}>
                        <Icon size={14} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium truncate"
                          style={{ color: isActive ? 'var(--c-primary-dark)' : 'var(--c-text)' }}>
                          {entry.label}
                        </span>
                        {!q && (
                          <span className="block text-[10px] truncate" style={{ color: 'var(--c-muted)' }}>
                            {entry.href}
                          </span>
                        )}
                      </span>
                      {isActive && (
                        <CornerDownLeft size={13} className="flex-shrink-0" style={{ color: 'var(--c-primary)' }} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between gap-3 px-4 py-2 flex-wrap"
              style={{ borderTop: '1px solid var(--c-border)', background: 'var(--c-input)' }}>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--c-muted)' }}>
                <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> navigate</span>
                <span className="flex items-center gap-1"><CornerDownLeft size={10} /> open</span>
              </div>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--c-muted)' }}>
                <Command size={10} /> G then D/O/P for quick jumps
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
