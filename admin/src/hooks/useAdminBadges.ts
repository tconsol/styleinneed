import { create } from 'zustand';
import client from '../api/client';

interface BadgeState {
  orders: number;
  support: number;
  setOrders: (n: number) => void;
  setSupport: (n: number) => void;
  clearOrders: () => void;
  clearSupport: () => void;
  incrementOrders: () => void;
  incrementSupport: () => void;
  fetch: () => Promise<void>;
}

export const useBadgeStore = create<BadgeState>((set, get) => ({
  orders: 0,
  support: 0,
  setOrders: (n) => set({ orders: n }),
  setSupport: (n) => set({ support: n }),
  clearOrders: () => set({ orders: 0 }),
  clearSupport: () => set({ support: 0 }),
  incrementOrders: () => set({ orders: get().orders + 1 }),
  incrementSupport: () => set({ support: get().support + 1 }),
  fetch: async () => {
    try {
      const [ordersRes, supportRes] = await Promise.all([
        client.get('/admin/orders', { params: { status: 'pending', limit: 1 } }),
        client.get('/support', { params: { status: 'open', limit: 1 } }),
      ]);
      set({
        orders: ordersRes.data?.pagination?.total ?? 0,
        support: supportRes.data?.pagination?.total ?? 0,
      });
    } catch {}
  },
}));
