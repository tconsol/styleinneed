import { create } from 'zustand';

interface UiState {
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  isLoaderDone: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setLoaderDone: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,
  isLoaderDone: false,

  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  setLoaderDone: () => set({ isLoaderDone: true }),
}));
