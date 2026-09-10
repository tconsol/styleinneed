import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/** Where a "g then <key>" sequence jumps to. */
export const GOTO_KEYS: Record<string, { href: string; label: string }> = {
  d: { href: '/', label: 'Dashboard' },
  o: { href: '/orders', label: 'Orders' },
  p: { href: '/products', label: 'Products' },
  c: { href: '/customers', label: 'Customers' },
  i: { href: '/inventory', label: 'Inventory' },
  a: { href: '/analytics', label: 'Analytics' },
  s: { href: '/settings', label: 'Settings' },
};

/** True while the caret is somewhere the user is actually writing. */
const isTyping = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
};

/**
 * Global admin keyboard shortcuts.
 *
 * - Cmd/Ctrl+K, or "/" — open the command palette
 * - "g" then d/o/p/c/i/a/s — jump straight to a section
 *
 * Every binding is suppressed while typing, so a "/" in a product description
 * stays a slash. Cmd/Ctrl+K is the exception: it is a deliberate chord and
 * should work from inside a field too.
 */
export function useAdminShortcuts(openPalette: () => void, paletteOpen: boolean) {
  const navigate = useNavigate();
  // When "g" was last pressed — the sequence expires so a stray g doesn't
  // hijack the next keystroke minutes later.
  const gAt = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
        return;
      }

      // The palette owns its own keys once it is open.
      if (paletteOpen || isTyping(e.target) || e.altKey || mod) return;

      if (e.key === '/') { e.preventDefault(); openPalette(); return; }

      if (e.key.toLowerCase() === 'g') { gAt.current = Date.now(); return; }

      if (Date.now() - gAt.current < 1200) {
        const target = GOTO_KEYS[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          gAt.current = 0;
          navigate(target.href);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, openPalette, paletteOpen]);
}
