import { create } from 'zustand';
import type { Address } from '../types';

interface DeliveryState {
  selected: Address | null;
  currentLabel: string | null; // reverse-geocoded current location
  draft: Partial<Address> | null; // geocoded location to prefill a new-address form
  setSelected: (a: Address | null) => void;
  setCurrentLabel: (s: string | null) => void;
  setDraft: (a: Partial<Address> | null) => void;
}

export const useDelivery = create<DeliveryState>((set) => ({
  selected: null,
  currentLabel: null,
  draft: null,
  setSelected: (selected) => set({ selected }),
  setCurrentLabel: (currentLabel) => set({ currentLabel }),
  setDraft: (draft) => set({ draft }),
}));
