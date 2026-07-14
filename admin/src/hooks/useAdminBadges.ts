import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import client from '../api/client';

type Section = 'orders' | 'support';

interface BadgeState {
  orders: number;
  support: number;
  // Persisted per-section "last viewed" timestamps (ms epoch). A badge only
  // counts items created AFTER this — so opening a page clears it for good,
  // and only genuinely new items bring the badge back.
  lastViewed: Record<Section, number>;
  markViewed: (section: Section) => void;
  incrementOrders: () => void;
  incrementSupport: () => void;
  fetch: () => Promise<void>;
}

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      orders: 0,
      support: 0,
      lastViewed: { orders: 0, support: 0 },

      // Mark viewed NOW and drop the badge. Persisted, so it stays cleared
      // across refreshes until something newer arrives.
      markViewed: (section) =>
        set((s) => ({ lastViewed: { ...s.lastViewed, [section]: Date.now() }, [section]: 0 } as Partial<BadgeState>)),

      incrementOrders: () => set((s) => ({ orders: s.orders + 1 })),
      incrementSupport: () => set((s) => ({ support: s.support + 1 })),

      fetch: async () => {
        const { lastViewed } = get();
        try {
          const [ordersRes, supportRes] = await Promise.all([
            client.get('/admin/orders', { params: { status: 'pending', since: lastViewed.orders || undefined, limit: 1 } }),
            client.get('/support', { params: { status: 'open', since: lastViewed.support || undefined, limit: 1 } }),
          ]);
          set({
            orders: ordersRes.data?.pagination?.total ?? 0,
            support: supportRes.data?.pagination?.total ?? 0,
          });
        } catch { /* keep current */ }
      },
    }),
    { name: 'sin-admin-badges', partialize: (s) => ({ lastViewed: s.lastViewed }) }
  )
);
