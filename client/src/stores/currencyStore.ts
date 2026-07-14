import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsApi } from '../api/misc.api';

export type Currency = 'INR' | 'USD';

/**
 * Auto-detect the display currency from the visitor's local timezone (with a
 * language + IP fallback). USA/Canada → USD, India → INR. There is no manual
 * toggle — currency always follows the device locale.
 */
function detectFromLocale(): Currency | null {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata') return 'INR';
  if (tz.startsWith('America/')) return 'USD';
  const lang = navigator.language || '';
  if (lang === 'en-IN' || /^(hi|ta|te|bn|mr|gu|kn|ml|pa)/.test(lang)) return 'INR';
  if (lang === 'en-US' || lang === 'en-CA' || lang === 'fr-CA') return 'USD';
  return null;
}

interface CurrencyState {
  currency: Currency;
  rate: number;              // INR per 1 USD
  freeShipThreshold: number; // INR free-shipping threshold (India)
  ready: boolean;
  init: () => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: 'INR',
      rate: 83,
      freeShipThreshold: 999,
      ready: false,

      init: async () => {
        // 1) Load the live exchange rate + India shipping config from the server.
        try {
          const { data } = await settingsApi.get();
          if (data?.data?.usdExchangeRate) set({ rate: data.data.usdExchangeRate });
          if (data?.data?.indiaFreeShipThreshold != null) set({ freeShipThreshold: data.data.indiaFreeShipThreshold });
        } catch { /* keep defaults */ }

        // 2) Auto-pick the currency from the device timezone/locale.
        const local = detectFromLocale();
        if (local) { set({ currency: local, ready: true }); return; }

        // 3) Unknown locale — fall back to IP geolocation.
        try {
          const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
          const json = await res.json();
          const cc: string = json?.country_code || '';
          set({ currency: cc === 'US' || cc === 'CA' ? 'USD' : 'INR', ready: true });
        } catch {
          set({ ready: true });
        }
      },
    }),
    { name: 'sin-currency', partialize: (s) => ({ currency: s.currency }) }
  )
);
