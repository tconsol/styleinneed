import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentPage {
  href: string;
  label: string;
  at: number;
}

interface RecentPagesState {
  pages: RecentPage[];
  visit: (page: { href: string; label: string }) => void;
  clear: () => void;
}

const MAX_RECENT = 8;

/**
 * The pages this admin actually opens, most recent first.
 *
 * Persisted per browser so the palette is useful the moment it opens rather
 * than after a few clicks. Deliberately not server-side: it is a personal
 * convenience, not shared state, and it should not cost a request per
 * navigation.
 */
export const useRecentPagesStore = create<RecentPagesState>()(
  persist(
    (set) => ({
      pages: [],

      visit: ({ href, label }) =>
        set((state) => ({
          // Re-visiting moves a page to the front instead of duplicating it.
          pages: [
            { href, label, at: Date.now() },
            ...state.pages.filter((p) => p.href !== href),
          ].slice(0, MAX_RECENT),
        })),

      clear: () => set({ pages: [] }),
    }),
    { name: 'styleinneed-admin-recent' }
  )
);
