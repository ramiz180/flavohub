import { create } from 'zustand';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  setLocation: (loc: Partial<LocationState>) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  address: null,
  city: null,
  pincode: null,
  setLocation: (loc) => set((state) => ({ ...state, ...loc })),
  clearLocation: () => set({ latitude: null, longitude: null, address: null, city: null, pincode: null }),
}));
