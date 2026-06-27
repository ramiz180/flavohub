import { create } from 'zustand';
import * as Location from 'expo-location';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  isLocating: boolean;
  // Aliases for screens that use shorter names
  lat: number | null;
  lng: number | null;
  setLocation: (loc: Partial<Omit<LocationState, 'lat' | 'lng' | 'isLocating' | 'setLocation' | 'clearLocation' | 'requestLocation'>>) => void;
  clearLocation: () => void;
  requestLocation: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  address: null,
  city: null,
  pincode: null,
  isLocating: false,
  // lat/lng are always in sync with latitude/longitude
  lat: null,
  lng: null,

  setLocation: (loc) => {
    set((state) => ({
      ...state,
      ...loc,
      // Keep lat/lng aliases in sync
      lat: loc.latitude !== undefined ? loc.latitude : state.latitude,
      lng: loc.longitude !== undefined ? loc.longitude : state.longitude,
    }));
  },

  clearLocation: () =>
    set({
      latitude: null,
      longitude: null,
      address: null,
      city: null,
      pincode: null,
      lat: null,
      lng: null,
      isLocating: false,
    }),

  requestLocation: async () => {
    const state = get();
    if (state.isLocating) return; // prevent concurrent calls

    set({ isLocating: true });
    try {
      console.log('[Location] Requesting foreground permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.warn('[Location] Permission denied by user');
        set({ isLocating: false });
        return;
      }

      console.log('[Location] Getting current position...');
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      console.log(`[Location] Customer Latitude: ${latitude}`);
      console.log(`[Location] Customer Longitude: ${longitude}`);

      // Try to reverse-geocode for city name (best-effort)
      let city: string | null = null;
      let address: string | null = null;
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocoded.length > 0 && geocoded[0]) {
          const g = geocoded[0];
          city = g.city ?? g.district ?? g.region ?? null;
          address = [g.name, g.street, g.city, g.region].filter(Boolean).join(', ');
        }
      } catch (e) {
        console.warn('[Location] Reverse geocode failed (non-critical):', e);
      }

      set({
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        city,
        address,
        isLocating: false,
      });

      console.log(`[Location] Location stored: lat=${latitude}, lng=${longitude}, city=${city ?? 'unknown'}`);
    } catch (e) {
      console.error('[Location] Failed to get location:', e);
      set({ isLocating: false });
    }
  },
}));
