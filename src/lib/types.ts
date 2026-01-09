// SEPTA API Types

export type TransitMode = 'bus' | 'trolley' | 'subway' | 'regional_rail' | 'nhsl';

export interface Stop {
  stopId: string;
  stopName: string;
  lat: number;
  lng: number;
  routes: string[];
  wheelchairAccessible?: boolean;
}

export interface Route {
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  routeType: TransitMode;
  routeColor?: string;
  routeTextColor?: string;
  directions: RouteDirection[];
}

export interface RouteDirection {
  directionId: number;
  directionName: string;
  destinationName: string;
}

export interface Arrival {
  tripId: string;
  routeId: string;
  routeShortName: string;
  direction: string;
  destinationName: string;
  arrivalTime: string; // ISO timestamp
  minutesUntilArrival: number;
  trackingStatus: TrackingStatus;
  vehicleId?: string;
  lastUpdated?: string; // ISO timestamp
  isDelayed: boolean;
  delayMinutes?: number;
  scheduledTime?: string;
}

export type TrackingStatus = 'live' | 'estimated' | 'scheduled' | 'no_data';

export interface Alert {
  alertId: string;
  routeId?: string;
  stopId?: string;
  severity: 'info' | 'warning' | 'severe';
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  affectedRoutes: string[];
  affectedStops: string[];
}

export interface NearbyStop extends Stop {
  distanceMeters: number;
  distanceText: string;
}

export interface SearchResult {
  type: 'stop' | 'route' | 'location';
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  data: Stop | Route | Location;
}

export interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Favorites & Recents
export interface FavoriteStop {
  stopId: string;
  stopName: string;
  customName?: string;
  addedAt: string;
}

export interface FavoriteRoute {
  routeId: string;
  routeShortName: string;
  routeLongName: string;
  routeType: TransitMode;
  addedAt: string;
}

export interface RecentItem {
  type: 'stop' | 'route' | 'search';
  id: string;
  title: string;
  subtitle?: string;
  timestamp: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isStale: boolean;
  lastUpdated: string | null;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}
