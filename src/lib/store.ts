import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FavoriteStop, FavoriteRoute, RecentItem, TransitMode } from './types';

interface AppState {
  // Favorites
  favoriteStops: FavoriteStop[];
  favoriteRoutes: FavoriteRoute[];
  addFavoriteStop: (stop: FavoriteStop) => void;
  removeFavoriteStop: (stopId: string) => void;
  addFavoriteRoute: (route: FavoriteRoute) => void;
  removeFavoriteRoute: (routeId: string) => void;
  isFavoriteStop: (stopId: string) => boolean;
  isFavoriteRoute: (routeId: string) => boolean;

  // Recents
  recentItems: RecentItem[];
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void;
  clearRecents: () => void;

  // User preferences
  preferredModes: TransitMode[];
  setPreferredModes: (modes: TransitMode[]) => void;

  // Location - now persisted!
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  locationPermission: 'granted' | 'denied' | 'prompt';
  setLocationPermission: (permission: 'granted' | 'denied' | 'prompt') => void;
  
  // Saved places
  savedPlaces: { name: string; address: string; lat: number; lng: number; type: 'home' | 'work' | 'other' }[];
  addSavedPlace: (place: { name: string; address: string; lat: number; lng: number; type: 'home' | 'work' | 'other' }) => void;
  removeSavedPlace: (name: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Favorites
      favoriteStops: [],
      favoriteRoutes: [],

      addFavoriteStop: (stop) =>
        set((state) => ({
          favoriteStops: state.favoriteStops.some((s) => s.stopId === stop.stopId)
            ? state.favoriteStops
            : [...state.favoriteStops, stop],
        })),

      removeFavoriteStop: (stopId) =>
        set((state) => ({
          favoriteStops: state.favoriteStops.filter((s) => s.stopId !== stopId),
        })),

      addFavoriteRoute: (route) =>
        set((state) => ({
          favoriteRoutes: state.favoriteRoutes.some((r) => r.routeId === route.routeId)
            ? state.favoriteRoutes
            : [...state.favoriteRoutes, route],
        })),

      removeFavoriteRoute: (routeId) =>
        set((state) => ({
          favoriteRoutes: state.favoriteRoutes.filter((r) => r.routeId !== routeId),
        })),

      isFavoriteStop: (stopId) => get().favoriteStops.some((s) => s.stopId === stopId),

      isFavoriteRoute: (routeId) => get().favoriteRoutes.some((r) => r.routeId === routeId),

      // Recents
      recentItems: [],

      addRecentItem: (item) =>
        set((state) => {
          const filtered = state.recentItems.filter(
            (r) => !(r.type === item.type && r.id === item.id)
          );
          return {
            recentItems: [
              { ...item, timestamp: new Date().toISOString() },
              ...filtered,
            ].slice(0, 20),
          };
        }),

      clearRecents: () => set({ recentItems: [] }),

      // User preferences
      preferredModes: ['bus', 'trolley', 'subway', 'regional_rail', 'nhsl'],

      setPreferredModes: (modes) => set({ preferredModes: modes }),

      // Location - persisted now
      userLocation: null,
      setUserLocation: (location) => set({ userLocation: location }),

      locationPermission: 'prompt',
      setLocationPermission: (permission) => set({ locationPermission: permission }),
      
      // Saved places
      savedPlaces: [],
      addSavedPlace: (place) =>
        set((state) => ({
          savedPlaces: [...state.savedPlaces.filter(p => p.type !== place.type || place.type === 'other'), place],
        })),
      removeSavedPlace: (name) =>
        set((state) => ({
          savedPlaces: state.savedPlaces.filter(p => p.name !== name),
        })),
    }),
    {
      name: 'septa-app-storage',
      partialize: (state) => ({
        favoriteStops: state.favoriteStops,
        favoriteRoutes: state.favoriteRoutes,
        recentItems: state.recentItems,
        preferredModes: state.preferredModes,
        locationPermission: state.locationPermission, // Now persisted!
        savedPlaces: state.savedPlaces,
      }),
    }
  )
);

// Helper hooks
export function useFavorites() {
  const favoriteStops = useAppStore((state) => state.favoriteStops);
  const favoriteRoutes = useAppStore((state) => state.favoriteRoutes);
  const addFavoriteStop = useAppStore((state) => state.addFavoriteStop);
  const removeFavoriteStop = useAppStore((state) => state.removeFavoriteStop);
  const addFavoriteRoute = useAppStore((state) => state.addFavoriteRoute);
  const removeFavoriteRoute = useAppStore((state) => state.removeFavoriteRoute);
  const isFavoriteStop = useAppStore((state) => state.isFavoriteStop);
  const isFavoriteRoute = useAppStore((state) => state.isFavoriteRoute);

  return {
    favoriteStops,
    favoriteRoutes,
    addFavoriteStop,
    removeFavoriteStop,
    addFavoriteRoute,
    removeFavoriteRoute,
    isFavoriteStop,
    isFavoriteRoute,
  };
}

export function useRecents() {
  const recentItems = useAppStore((state) => state.recentItems);
  const addRecentItem = useAppStore((state) => state.addRecentItem);
  const clearRecents = useAppStore((state) => state.clearRecents);

  return { recentItems, addRecentItem, clearRecents };
}

export function useLocation() {
  const userLocation = useAppStore((state) => state.userLocation);
  const setUserLocation = useAppStore((state) => state.setUserLocation);
  const locationPermission = useAppStore((state) => state.locationPermission);
  const setLocationPermission = useAppStore((state) => state.setLocationPermission);

  return { userLocation, setUserLocation, locationPermission, setLocationPermission };
}

export function useSavedPlaces() {
  const savedPlaces = useAppStore((state) => state.savedPlaces);
  const addSavedPlace = useAppStore((state) => state.addSavedPlace);
  const removeSavedPlace = useAppStore((state) => state.removeSavedPlace);

  return { savedPlaces, addSavedPlace, removeSavedPlace };
}
