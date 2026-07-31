import client from '../api/client';

export interface ThemeTokens {
  key: string; name: string;
  primary: string; primaryLight: string; primaryDark: string;
  secondary: string; secondaryLight: string; secondaryDark: string;
  bg: string; surface: string; text: string; muted: string; border: string;
}

export interface Appearance extends ThemeTokens {
  fontHeading: string;
  fontBody: string;
  applyToAdmin: boolean;
}

const CACHE_KEY = 'store-appearance';

// Tailwind colours use `rgb(var(--color-x) / <alpha>)`, so vars hold RGB channels.
function rgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const int = parseInt(n, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

function buildCss(t: ThemeTokens): string {
  return `:root{
  --color-primary:${rgb(t.primary)};
  --color-primary-light:${rgb(t.primaryLight)};
  --color-primary-dark:${rgb(t.primaryDark)};
  --color-secondary:${rgb(t.secondary)};
  --color-secondary-light:${rgb(t.secondaryLight)};
  --color-secondary-dark:${rgb(t.secondaryDark)};
  --color-bg:${rgb(t.bg)};
  --color-surface:${rgb(t.surface)};
  --color-text:${rgb(t.text)};
  --color-muted:${rgb(t.muted)};
  --color-border:${rgb(t.border)};
}`;
}

function applyColors(t: ThemeTokens): void {
  let el = document.getElementById('app-theme') as HTMLStyleElement | null;
  if (!el) { el = document.createElement('style'); el.id = 'app-theme'; document.head.appendChild(el); }
  el.textContent = buildCss(t);
}

const loaded = new Set<string>();
function loadGoogleFont(family: string): void {
  if (!family || loaded.has(family)) return;
  loaded.add(family);
  const id = 'gf-' + family.replace(/\s+/g, '-');
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  // No weight axis — single-weight display/script fonts 400-error otherwise.
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}&display=swap`;
  document.head.appendChild(link);
}

function applyFonts(heading: string, body: string): void {
  if (heading) { loadGoogleFont(heading); document.documentElement.style.setProperty('--font-heading', `'${heading}', Georgia, serif`); }
  if (body) { loadGoogleFont(body); document.documentElement.style.setProperty('--font-body', `'${body}', system-ui, sans-serif`); }
}

export function applyAppearance(a: Appearance): void {
  applyColors(a);
  applyFonts(a.fontHeading, a.fontBody);
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
    const { data } = await client.get('/settings/theme');
    if (data?.data) applyAppearance(data.data);
  } catch { /* keep cached/default */ }
}
