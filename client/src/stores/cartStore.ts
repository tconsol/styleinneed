import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product } from '../types';
import { cartApi } from '../api/cart.api';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  couponCode: string | null;
  couponDiscount: number;
  freeShipping: boolean;
  fetchCart: () => Promise<void>;
  /** `product` is required for guests — it's the snapshot rendered from local state. */
  addItem: (productId: string, variantSku: string, quantity?: number, product?: Product) => Promise<void>;
  updateItem: (productId: string, variantSku: string, quantity: number) => Promise<void>;
  removeItem: (productId: string, variantSku: string) => Promise<void>;
  clearCart: () => Promise<void>;
  /** Push a guest's local cart into their account, then adopt the server cart. */
  mergeGuestCart: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setCoupon: (code: string, discount: number, freeShipping: boolean) => void;
  clearCoupon: () => void;
}

// Drop items whose product no longer exists (e.g. hard-deleted from the catalog)
// so components never dereference a null product and crash.
const cleanItems = (items?: CartItem[]): CartItem[] =>
  (items || []).filter((i) => !!i && !!i.product && !!i.product._id);

const isLoggedIn = () => useAuthStore.getState().isAuthenticated;

// Selectors — always derived fresh from items, never stored as state
export const selectSubtotal = (state: CartState) =>
  state.items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);

export const selectItemCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

/**
 * Cart for both signed-in shoppers and guests.
 *
 * Signed in, it's a thin client over the server cart. Signed out, the same
 * shape is kept in localStorage so a guest can fill a cart and check out
 * without an account; `mergeGuestCart` folds it into the server cart on login.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isLoading: false,
      couponCode: null,
      couponDiscount: 0,
      freeShipping: false,

      fetchCart: async () => {
        if (!isLoggedIn()) return; // guest cart already lives in this store
        try {
          const { data } = await cartApi.getCart();
          set({ items: cleanItems(data.data?.items) });
        } catch {}
      },

      addItem: async (productId, variantSku, quantity = 1, product) => {
        set({ isLoading: true });

        if (!isLoggedIn()) {
          if (!product) { set({ isLoading: false }); toast.error('Could not add to cart'); return; }
          // Guests keep a full product snapshot locally so the drawer and
          // checkout can render with no session.
          set((s) => {
            const idx = s.items.findIndex((i) => i.product._id === productId && i.variantSku === variantSku);
            const items = [...s.items];
            if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity };
            else items.push({ product, variantSku, quantity, price: product.salePrice });
            return { items, isLoading: false, isOpen: true };
          });
          toast.success('Added to cart');
          return;
        }

        try {
          const { data } = await cartApi.addToCart({ productId, variantSku, quantity });
          set({ items: cleanItems(data.data?.items), isLoading: false, isOpen: true });
          toast.success('Added to cart');
        } catch {
          set({ isLoading: false });
        }
      },

      updateItem: async (productId, variantSku, quantity) => {
        if (!isLoggedIn()) {
          set((s) => ({
            items: s.items.map((i) =>
              i.product._id === productId && i.variantSku === variantSku ? { ...i, quantity } : i
            ),
          }));
          return;
        }
        set({ isLoading: true });
        try {
          const { data } = await cartApi.updateCartItem(productId, { variantSku, quantity });
          set({ items: cleanItems(data.data?.items), isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      removeItem: async (productId, variantSku) => {
        if (!isLoggedIn()) {
          set((s) => ({
            items: s.items.filter((i) => !(i.product._id === productId && i.variantSku === variantSku)),
          }));
          toast.success('Item removed');
          return;
        }
        set({ isLoading: true });
        try {
          const { data } = await cartApi.removeFromCart(productId, variantSku);
          set({ items: cleanItems(data.data?.items), isLoading: false });
          toast.success('Item removed');
        } catch {
          set({ isLoading: false });
        }
      },

      clearCart: async () => {
        if (!isLoggedIn()) {
          set({ items: [], couponCode: null, couponDiscount: 0, freeShipping: false });
          return;
        }
        try {
          await cartApi.clearCart();
          set({ items: [], couponCode: null, couponDiscount: 0, freeShipping: false });
        } catch {}
      },

      mergeGuestCart: async () => {
        const local = get().items;
        if (local.length === 0) { await get().fetchCart(); return; }
        // Add each guest line to the server cart; the API merges quantities for
        // lines that already exist there.
        for (const item of local) {
          await cartApi
            .addToCart({ productId: item.product._id, variantSku: item.variantSku, quantity: item.quantity })
            .catch(() => null);
        }
        set({ items: [] });
        await get().fetchCart();
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      setCoupon: (code, discount, freeShipping) =>
        set({ couponCode: code, couponDiscount: discount, freeShipping }),

      clearCoupon: () =>
        set({ couponCode: null, couponDiscount: 0, freeShipping: false }),
    }),
    {
      name: 'sin-guest-cart',
      // Only the guest's lines are worth persisting — a signed-in cart is
      // authoritative on the server and refetched on load.
      partialize: (s) => ({ items: isLoggedIn() ? [] : s.items }),
    }
  )
);
