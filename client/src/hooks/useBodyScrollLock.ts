import { useEffect } from 'react';

// Plain `body { overflow: hidden }` is unreliable on iOS Safari — it can leave
// the page in a half-frozen state where the background won't scroll again
// even after the modal closes. Pinning the body with `position: fixed` and
// restoring the exact scroll offset afterward is the standard iOS-safe fix.
// A module-level counter lets multiple overlays (menu, drawer, sheet) be
// open at once without fighting over who unlocks the body.
let lockCount = 0;
let savedScrollY = 0;

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    lockCount += 1;
    if (lockCount === 1) {
      savedScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [active]);
}
