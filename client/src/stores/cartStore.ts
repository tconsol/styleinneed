import { create } from 'zustand';
import type { CartItem } from '../types';
import { cartApi } from '../api/cart.api';
import toast from 'react-hot-toast';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  couponCode: string | null;
  couponDiscount: number;
  freeShipping: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, variantSku: string, quantity?: number) => Promise<void>;
  updateItem: (productId: string, variantSku: string, quantity: number) => Promise<void>;
  removeItem: (productId: string, variantSku: string) => Promise<void>;
  clearCart: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setCoupon: (code: string, discount: number, freeShipping: boolean) => void;
  clearCoupon: () => void;
}

// Selectors — always derived fresh from items, never stored as state
export const selectSubtotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);

export const selectItemCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

export const useCartStore = create<CartState>()((set) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  couponCode: null,
  couponDiscount: 0,
  freeShipping: false,

  fetchCart: async () => {
    try {
      const { data } = await cartApi.getCart();
      set({ items: data.data?.items || [] });
    } catch {}
  },

  addItem: async (productId, variantSku, quantity = 1) => {
    set({ isLoading: true });
    try {
      const { data } = await cartApi.addToCart({ productId, variantSku, quantity });
      set({ items: data.data?.items || [], isLoading: false, isOpen: true });
      toast.success('Added to cart');
    } catch {
      set({ isLoading: false });
    }
  },

  updateItem: async (productId, variantSku, quantity) => {
    set({ isLoading: true });
    try {
      const { data } = await cartApi.updateCartItem(productId, { variantSku, quantity });
      set({ items: data.data?.items || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  removeItem: async (productId, variantSku) => {
    set({ isLoading: true });
    try {
      const { data } = await cartApi.removeFromCart(productId, variantSku);
      set({ items: data.data?.items || [], isLoading: false });
      toast.success('Item removed');
    } catch {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    try {
      await cartApi.clearCart();
      set({ items: [], couponCode: null, couponDiscount: 0, freeShipping: false });
    } catch {}
  },

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

  setCoupon: (code, discount, freeShipping) =>
    set({ couponCode: code, couponDiscount: discount, freeShipping }),

  clearCoupon: () =>
    set({ couponCode: null, couponDiscount: 0, freeShipping: false }),
}));
