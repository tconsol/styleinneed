import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsApi } from '../api/misc.api';

export type Currency = 'INR' | 'USD';

/** Best-effort synchronous region guess from the browser. */
function detectFromBrowser(): Currency | null {
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
  userChose: boolean;        // did the user pick via the header toggle?
  ready: boolean;
  setCurrency: (c: Currency) => void;
  init: () => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'INR',
      rate: 83,
      freeShipThreshold: 999,
      userChose: false,
      ready: false,

      setCurrency: (c) => set({ currency: c, userChose: true }),

      init: async () => {
        // 1) Load the live exchange rate + India shipping config from the server.
        try {
          const { data } = await settingsApi.get();
          if (data?.data?.usdExchangeRate) set({ rate: data.data.usdExchangeRate });
          if (data?.data?.indiaFreeShipThreshold != null) set({ freeShipThreshold: data.data.indiaFreeShipThreshold });
        } catch { /* keep defaults */ }

        // 2) Auto-pick currency only if the user hasn't chosen one.
        if (get().userChose) { set({ ready: true }); return; }

        const browser = detectFromBrowser();
        if (browser) { set({ currency: browser, ready: true }); return; }

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
    { name: 'sin-currency', partialize: (s) => ({ currency: s.currency, userChose: s.userChose }) }
  )
);
