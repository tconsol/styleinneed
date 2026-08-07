import { themeApi } from '../api';

export interface ThemeTokens {
  key: string;
  name: string;
  primary: string; primaryLight: string; primaryDark: string;
  secondary: string; secondaryLight: string; secondaryDark: string;
  bg: string; surface: string; text: string; muted: string; border: string;
}

export interface Appearance extends ThemeTokens {
  fontHeading: string;
  fontBody: string;
  applyToAdmin: boolean;
}

const CACHE_KEY = 'admin-appearance';

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(n, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

function buildCss(t: ThemeTokens): string {
  const rgb = hexToRgb(t.primary);
  return `:root{
  --c-primary:${t.primary};
  --c-primary-dark:${t.primaryDark};
  --c-secondary:${t.secondary};
  --c-bg:${t.bg};
  --c-surface:${t.surface};
  --c-text:${t.text};
  --c-muted:${t.muted};
  --c-border:${t.border};
  --c-input:${t.surface};
  --c-th-bg:${t.bg};
  --c-tr-hover:rgba(${rgb},0.05);
  --c-primary-soft:rgba(${rgb},0.12);
  --c-primary-rgb:${rgb};
  --c-primary-light-rgb:${hexToRgb(t.primaryLight)};
  --c-primary-dark-rgb:${hexToRgb(t.primaryDark)};
  --c-bg-rgb:${hexToRgb(t.bg)};
  --c-surface-rgb:${hexToRgb(t.surface)};
  --c-text-rgb:${hexToRgb(t.text)};
  --c-muted-rgb:${hexToRgb(t.muted)};
  --c-border-rgb:${hexToRgb(t.border)};
}
.dark{
  --c-primary:${t.primaryLight};
  --c-tr-hover:rgba(${hexToRgb(t.primaryLight)},0.06);
  --c-primary-soft:rgba(${hexToRgb(t.primaryLight)},0.16);
  --c-primary-rgb:${hexToRgb(t.primaryLight)};
}`;
}

// ── Colours ──
export function applyColors(t: ThemeTokens): void {
  let el = document.getElementById('app-theme') as HTMLStyleElement | null;
  if (!el) { el = document.createElement('style'); el.id = 'app-theme'; document.head.appendChild(el); }
  el.textContent = buildCss(t);
}
export function clearColors(): void {
  document.getElementById('app-theme')?.remove();
}
// Back-compat alias (used by the quick switcher preview).
export const applyTheme = applyColors;

// ── Fonts ──
const loaded = new Set<string>();
export function loadGoogleFont(family: string): void {
  if (!family || loaded.has(family)) return;
  loaded.add(family);
  const id = 'gf-' + family.replace(/\s+/g, '-');
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  // No weight axis — single-weight display/script fonts 400-error otherwise; the
  // browser synthesises bold where a face is missing.
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}&display=swap`;
  document.head.appendChild(link);
}
export function applyFonts(heading: string, body: string): void {
  if (heading) { loadGoogleFont(heading); document.documentElement.style.setProperty('--font-heading', `'${heading}', system-ui, sans-serif`); }
  if (body) { loadGoogleFont(body); document.documentElement.style.setProperty('--font-body', `'${body}', system-ui, sans-serif`); }
}
export function clearFonts(): void {
  document.documentElement.style.removeProperty('--font-heading');
  document.documentElement.style.removeProperty('--font-body');
}

// ── Full appearance (colours + fonts), gated by the admin-apply flag ──
export function applyAppearance(a: Appearance): void {
  if (a.applyToAdmin) { applyColors(a); applyFonts(a.fontHeading, a.fontBody); }
  else { clearColors(); clearFonts(); }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(a)); } catch { /* ignore */ }
}

export function applyCachedAppearance(): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) applyAppearance(JSON.parse(raw));
  } catch { /* ignore */ }
}

export async function refreshTheme(): Promise<void> {
  try {
    const { data } = await themeApi.getActive();
    if (data?.data) applyAppearance(data.data);
  } catch { /* keep cached/default */ }
}
