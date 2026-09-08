import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types';
import toast from 'react-hot-toast';

/** More than four columns stops being readable on any screen. */
const MAX = 4;

interface CompareState {
  items: Product[];
  toggle: (p: Product) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

/** Per-browser compare tray. Persisted so it survives navigation and reloads. */
export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (p) => {
        const { items } = get();
        if (items.some((i) => i._id === p._id)) {
          set({ items: items.filter((i) => i._id !== p._id) });
          return;
        }
        if (items.length >= MAX) {
          toast.error(`You can compare up to ${MAX} products at a time`);
          return;
        }
        set({ items: [...items, p] });
      },

      remove: (id) => set((s) => ({ items: s.items.filter((i) => i._id !== id) })),
      clear: () => set({ items: [] }),
      has: (id) => get().items.some((i) => i._id === id),
    }),
    { name: 'sin-compare' }
  )
);

export const COMPARE_MAX = MAX;
