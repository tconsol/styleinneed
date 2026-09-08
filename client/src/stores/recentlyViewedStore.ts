import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../types';

const MAX = 12;

/** The slice of a product we keep — enough to render a card, nothing stale-prone. */
export interface RecentProduct {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  salePrice: number;
  usdSalePrice?: number;
  mrp: number;
  viewedAt: number;
}

interface RecentlyViewedState {
  items: RecentProduct[];
  add: (p: Product) => void;
  clear: () => void;
}

/**
 * Per-browser "Recently Viewed" list. Stored locally rather than server-side so
 * it works for signed-out visitors and needs no extra round-trip.
 */
export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      add: (p) =>
        set((state) => {
          const entry: RecentProduct = {
            _id: p._id,
            name: p.name,
            slug: p.slug,
            images: p.images?.slice(0, 1) || [],
            salePrice: p.salePrice,
            usdSalePrice: p.usdSalePrice,
            mrp: p.mrp,
            viewedAt: Date.now(),
          };
          // Most recent first, de-duplicated by id.
          const items = [entry, ...state.items.filter((i) => i._id !== p._id)].slice(0, MAX);
          return { items };
        }),
      clear: () => set({ items: [] }),
    }),
    { name: 'sin-recently-viewed' }
  )
);
