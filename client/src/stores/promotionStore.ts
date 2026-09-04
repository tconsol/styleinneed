import { create } from 'zustand';
import { promotionApi } from '../api/misc.api';
import { socket, SOCKET_EVENTS } from '../lib/socket';
import type { Product } from '../types';

export interface Promotion {
  _id: string;
  name: string;
  type: 'flash_sale' | 'category_discount' | 'product_discount' | 'buy_x_get_y' | 'festival';
  discountType: 'percentage' | 'flat';
  discountValue: number;
  applicableProducts: (Product | { _id: string })[];
  applicableCategories: { _id: string; name?: string; slug?: string }[];
  startDate: string;
  expiryDate: string;
  description?: string;
  bannerImage?: string;
  badgeText?: string;
}

interface PromotionState {
  active: Promotion[];
  loaded: boolean;
  fetchActive: () => Promise<void>;
}

export const usePromotionStore = create<PromotionState>((set) => ({
  active: [],
  loaded: false,
  fetchActive: async () => {
    try {
      const { data } = await promotionApi.getActive();
      set({ active: data.data || [], loaded: true });
    } catch { set({ loaded: true }); }
  },
}));

// Refresh active promotions when the admin changes them (content:updated is a
// catch-all broadcast; harmless if it fires for other content).
socket.on(SOCKET_EVENTS.contentUpdated, () => usePromotionStore.getState().fetchActive());

// Does a promotion apply to a product? Empty product+category lists = all products.
const applies = (product: Product, promo: Promotion): boolean => {
  const prods = promo.applicableProducts || [];
  const cats = promo.applicableCategories || [];
  if (!prods.length && !cats.length) return true;
  if (prods.some((p) => (typeof p === 'string' ? p : p._id) === product._id)) return true;
  if (cats.some((c) => c._id === product.category?._id)) return true;
  return false;
};

export interface PromoResult { promo: Promotion; price: number; off: number }

/** Best (lowest) promo price for a product in INR, or null if none apply. */
export const promoFor = (product: Product, active: Promotion[]): PromoResult | null => {
  let best: PromoResult | null = null;
  for (const promo of active) {
    if (!applies(product, promo)) continue;
    const price = promo.discountType === 'percentage'
      ? Math.round(product.salePrice * (1 - promo.discountValue / 100))
      : Math.max(0, product.salePrice - promo.discountValue);
    const off = product.salePrice > 0 ? Math.round(((product.salePrice - price) / product.salePrice) * 100) : 0;
    if (!best || price < best.price) best = { promo, price, off };
  }
  return best;
};
