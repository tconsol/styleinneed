import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { formatPrice } from '../utils/format';

export type Currency = 'INR' | 'USD';

function detectFromDevice(): Currency | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata') return 'INR';
    if (tz.startsWith('America/')) return 'USD';
  } catch { /* Intl may be limited */ }
  return null;
}

interface CurrencyState {
  currency: Currency;
  rate: number;              // INR per 1 USD
  freeShipThreshold: number; // INR
  userChose: boolean;
  hydrated: boolean;
  setCurrency: (c: Currency) => void;
  init: () => Promise<void>;
}

export const useCurrency = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'INR',
      rate: 83,
      freeShipThreshold: 999,
      userChose: false,
      hydrated: false,

      setCurrency: (c) => set({ currency: c, userChose: true }),

      init: async () => {
        try {
          const { data } = await api.get('/settings');
          if (data?.data?.usdExchangeRate) set({ rate: data.data.usdExchangeRate });
          if (data?.data?.indiaFreeShipThreshold != null) set({ freeShipThreshold: data.data.indiaFreeShipThreshold });
        } catch { /* keep defaults */ }

        if (!get().userChose) {
          const guess = detectFromDevice();
          if (guess) set({ currency: guess });
        }
      },
    }),
    {
      name: 'sin-currency',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ currency: s.currency, userChose: s.userChose }),
      onRehydrateStorage: () => (state) => { if (state) state.hydrated = true; },
    }
  )
);

/** Currency-aware money helper mirroring the web `useMoney`. */
export function useMoney() {
  const currency = useCurrency((s) => s.currency);
  const rate = useCurrency((s) => s.rate);
  const value = (inr: number, usdOverride?: number): number =>
    currency === 'USD' ? (usdOverride != null ? usdOverride : Math.round((inr / rate) * 100) / 100) : inr;
  const format = (inr: number, usdOverride?: number): string => formatPrice(value(inr, usdOverride), currency);
  return { currency, rate, value, format, isUSA: currency === 'USD' };
}
