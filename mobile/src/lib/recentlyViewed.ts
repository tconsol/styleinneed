import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../types';

const KEY = 'recently_viewed';
const MAX = 12;

// Minimal snapshot so the rail renders offline without refetching.
export type MiniProduct = Pick<
  Product,
  '_id' | 'slug' | 'name' | 'images' | 'salePrice' | 'mrp' | 'discountPercentage'
> & { category?: { name: string } };

export const recentlyViewed = {
  get: async (): Promise<MiniProduct[]> => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as MiniProduct[]) : [];
    } catch {
      return [];
    }
  },
  add: async (p: Product): Promise<void> => {
    try {
      const list = await recentlyViewed.get();
      const mini: MiniProduct = {
        _id: p._id, slug: p.slug, name: p.name, images: p.images?.slice(0, 1) ?? [],
        salePrice: p.salePrice, mrp: p.mrp, discountPercentage: p.discountPercentage,
        category: p.category ? { name: p.category.name } : undefined,
      };
      const next = [mini, ...list.filter((x) => x._id !== p._id)].slice(0, MAX);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  },
};
