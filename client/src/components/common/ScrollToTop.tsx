import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getLenis } from '../../hooks/useLenis';

/**
 * Resets scroll to the top on every route change so each page (and its
 * buttons/header) is shown from the top. Handles both the Lenis-driven
 * desktop scroll and native mobile scroll.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const lenis = getLenis();
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    }
    // Always reset native scroll too (mobile, and any inner doc scroll).
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
