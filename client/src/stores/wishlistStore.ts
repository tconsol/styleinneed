import { create } from 'zustand';
import type { Product } from '../types';
import { wishlistApi } from '../api/wishlist.api';
import toast from 'react-hot-toast';

interface WishlistState {
  products: Product[];
  isLoading: boolean;
  fetchWishlist: () => Promise<void>;
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  products: [],
  isLoading: false,

  fetchWishlist: async () => {
    try {
      const { data } = await wishlistApi.getWishlist();
      set({ products: data.data || [] });
    } catch {}
  },

  toggle: async (productId) => {
    set({ isLoading: true });
    try {
      const { data } = await wishlistApi.toggleWishlist(productId);
      if (data.data?.added) {
        toast.success('Added to wishlist');
      } else {
        toast.success('Removed from wishlist');
        set((s) => ({ products: s.products.filter((p) => p._id !== productId) }));
      }
      await get().fetchWishlist();
      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  isWishlisted: (productId) =>
    get().products.some((p) => p._id === productId),
}));
