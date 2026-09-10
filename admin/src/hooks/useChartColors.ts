import { useEffect, useState } from 'react';
import { useThemeStore } from '../stores/themeStore';

export interface ChartColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  grid: string;
  text: string;
  muted: string;
  /** A ready-made series palette for multi-line/bar charts. */
  series: string[];
}

const FALLBACK: ChartColors = {
  primary: '#4F46E5', primaryDark: '#3730A3', secondary: '#EC4899',
  success: '#10B981', warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6',
  grid: '#E5E7EB', text: '#111827', muted: '#6B7280',
  series: ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
};

const readVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

/**
 * The active theme's colours, as concrete values recharts can use.
 *
 * Charts cannot take `var(--c-primary)` directly: recharts writes colours as
 * SVG presentation attributes (and into gradient stops), where a CSS variable
 * does not resolve in every browser. So the tokens are read off the document
 * and handed over as real hex strings.
 *
 * Re-reads whenever the theme changes, so switching palette or dark mode
 * recolours the charts instead of leaving them on the old brand colour.
 */
export function useChartColors(): ChartColors {
  const isDark = useThemeStore((s) => s.isDark);
  const [colors, setColors] = useState<ChartColors>(FALLBACK);

  useEffect(() => {
    const read = () => {
      const primary = readVar('--c-primary', FALLBACK.primary);
      const secondary = readVar('--c-secondary', FALLBACK.secondary);
      const success = readVar('--c-success', FALLBACK.success);
      const warning = readVar('--c-warning', FALLBACK.warning);
      const info = readVar('--c-info', FALLBACK.info);
      const danger = readVar('--c-danger', FALLBACK.danger);

      setColors({
        primary,
        primaryDark: readVar('--c-primary-dark', FALLBACK.primaryDark),
        secondary,
        success,
        warning,
        danger,
        info,
        grid: readVar('--c-border', FALLBACK.grid),
        text: readVar('--c-text', FALLBACK.text),
        muted: readVar('--c-muted', FALLBACK.muted),
        series: [primary, secondary, success, warning, info, danger],
      });
    };

    // A frame's delay: the theme class/variables are applied by a sibling
    // effect, so reading synchronously can catch the previous palette.
    const id = requestAnimationFrame(read);

    // Themes can also change from elsewhere (the Themes page, or a socket
    // broadcast) without `isDark` moving, so watch the attributes that carry them.
    const observer = new MutationObserver(() => requestAnimationFrame(read));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });

    return () => { cancelAnimationFrame(id); observer.disconnect(); };
  }, [isDark]);

  return colors;
}
