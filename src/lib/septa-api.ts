import type {
  Stop,
  Route,
  Arrival,
  Alert,
  NearbyStop,
  TrackingStatus,
  TransitMode,
  ApiResponse,
  CacheEntry,
} from './types';

// SEPTA API Base URLs
const SEPTA_API_BASE = 'https://www3.septa.org/api';

// Cache configuration
const CACHE_DURATION = {
  arrivals: 30 * 1000, // 30 seconds
  stops: 24 * 60 * 60 * 1000, // 24 hours
  routes: 24 * 60 * 60 * 1000, // 24 hours
  alerts: 5 * 60 * 1000, // 5 minutes
};

// In-memory cache
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, duration: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + duration,
  });
}

// Helper to safely fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 10000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// API Functions

export async function getBusArrivals(stopId: string): Promise<ApiResponse<Arrival[]>> {
  const cacheKey = `arrivals-bus-${stopId}`;
  const cached = getCached<Arrival[]>(cacheKey);

  if (cached) {
    return {
      data: cached,
      error: null,
      isStale: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    // SEPTA Bus/Trolley Arrivals API
    const response = await fetchWithTimeout(
      `${SEPTA_API_BASE}/BusSchedules/index.php?stop_id=${stopId}`
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const rawData = await response.json();
    const arrivals = transformBusArrivals(rawData, stopId);

    setCache(cacheKey, arrivals, CACHE_DURATION.arrivals);

    return {
      data: arrivals,
      error: null,
      isStale: false,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    // Try to return stale cache if available
    const staleEntry = cache.get(cacheKey) as CacheEntry<Arrival[]> | undefined;
    if (staleEntry) {
      return {
        data: staleEntry.data,
        error: 'Using cached data - live updates unavailable',
        isStale: true,
        lastUpdated: new Date(staleEntry.timestamp).toISOString(),
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch arrivals',
      isStale: false,
      lastUpdated: null,
    };
  }
}

export async function getRealTimeArrivals(stopId: string): Promise<ApiResponse<Arrival[]>> {
  const cacheKey = `arrivals-realtime-${stopId}`;
  const cached = getCached<Arrival[]>(cacheKey);

  if (cached) {
    return {
      data: cached,
      error: null,
      isStale: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    // SEPTA Real-Time Bus/Trolley API
    const response = await fetchWithTimeout(
      `${SEPTA_API_BASE}/bustracker/index.php?stopid=${stopId}`
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const rawData = await response.json();
    const arrivals = transformRealTimeArrivals(rawData);

    setCache(cacheKey, arrivals, CACHE_DURATION.arrivals);

    return {
      data: arrivals,
      error: null,
      isStale: false,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    const staleEntry = cache.get(cacheKey) as CacheEntry<Arrival[]> | undefined;
    if (staleEntry) {
      return {
        data: staleEntry.data,
        error: 'Using cached data - live updates unavailable',
        isStale: true,
        lastUpdated: new Date(staleEntry.timestamp).toISOString(),
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch arrivals',
      isStale: false,
      lastUpdated: null,
    };
  }
}

export async function getTransitView(routeId: string): Promise<ApiResponse<unknown>> {
  try {
    const response = await fetchWithTimeout(
      `${SEPTA_API_BASE}/TransitView/index.php?route=${routeId}`
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return {
      data,
      error: null,
      isStale: false,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch transit view',
      isStale: false,
      lastUpdated: null,
    };
  }
}

export async function getAlerts(): Promise<ApiResponse<Alert[]>> {
  const cacheKey = 'alerts';
  const cached = getCached<Alert[]>(cacheKey);

  if (cached) {
    return {
      data: cached,
      error: null,
      isStale: false,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const response = await fetchWithTimeout(`${SEPTA_API_BASE}/Alerts/index.php`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const rawData = await response.json();
    const alerts = transformAlerts(rawData);

    setCache(cacheKey, alerts, CACHE_DURATION.alerts);

    return {
      data: alerts,
      error: null,
      isStale: false,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    const staleEntry = cache.get(cacheKey) as CacheEntry<Alert[]> | undefined;
    if (staleEntry) {
      return {
        data: staleEntry.data,
        error: 'Using cached data',
        isStale: true,
        lastUpdated: new Date(staleEntry.timestamp).toISOString(),
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch alerts',
      isStale: false,
      lastUpdated: null,
    };
  }
}

export async function getRouteAlerts(routeId: string): Promise<ApiResponse<Alert[]>> {
  try {
    const response = await fetchWithTimeout(
      `${SEPTA_API_BASE}/Alerts/index.php?route=${routeId}`
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const rawData = await response.json();
    const alerts = transformAlerts(rawData);

    return {
      data: alerts,
      error: null,
      isStale: false,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch alerts',
      isStale: false,
      lastUpdated: null,
    };
  }
}

// Transform functions to normalize SEPTA API responses

function transformBusArrivals(rawData: unknown, stopId: string): Arrival[] {
  if (!rawData || typeof rawData !== 'object') return [];

  const arrivals: Arrival[] = [];
  const data = rawData as Record<string, unknown[]>;

  // SEPTA returns data keyed by route
  for (const [routeId, trips] of Object.entries(data)) {
    if (!Array.isArray(trips)) continue;

    for (const trip of trips) {
      const tripData = trip as Record<string, unknown>;
      const arrival = parseArrival(tripData, routeId);
      if (arrival) arrivals.push(arrival);
    }
  }

  return arrivals.sort((a, b) => a.minutesUntilArrival - b.minutesUntilArrival);
}

function transformRealTimeArrivals(rawData: unknown): Arrival[] {
  if (!rawData || typeof rawData !== 'object') return [];

  const arrivals: Arrival[] = [];
  const data = rawData as Record<string, unknown>;

  // Handle different SEPTA response formats
  const busList = data.bus || data.routes || [];
  if (!Array.isArray(busList)) return [];

  for (const bus of busList) {
    const busData = bus as Record<string, unknown>;
    const arrival: Arrival = {
      tripId: String(busData.trip || busData.TripID || Math.random()),
      routeId: String(busData.route || busData.Route || ''),
      routeShortName: String(busData.route || busData.Route || ''),
      direction: String(busData.Direction || busData.direction || ''),
      destinationName: String(busData.destination || busData.Destination || 'Unknown'),
      arrivalTime: new Date(Date.now() + Number(busData.late || 0) * 60000).toISOString(),
      minutesUntilArrival: Number(busData.late || busData.minutes || 0),
      trackingStatus: determineTrackingStatus(busData),
      vehicleId: String(busData.VehicleID || busData.vehicle_id || ''),
      lastUpdated: busData.Offset ? new Date().toISOString() : undefined,
      isDelayed: Number(busData.late || 0) > 5,
      delayMinutes: Number(busData.late || 0),
    };
    arrivals.push(arrival);
  }

  return arrivals.sort((a, b) => a.minutesUntilArrival - b.minutesUntilArrival);
}

function parseArrival(tripData: Record<string, unknown>, routeId: string): Arrival | null {
  try {
    const dateStr = String(tripData.DateCalender || tripData.date || '');
    const direction = String(tripData.Direction || tripData.direction || '');

    // Parse arrival time
    let minutesUntil = 0;
    if (tripData.minutes !== undefined) {
      minutesUntil = Number(tripData.minutes);
    } else if (dateStr) {
      const arrivalDate = new Date(dateStr);
      minutesUntil = Math.max(0, Math.round((arrivalDate.getTime() - Date.now()) / 60000));
    }

    return {
      tripId: String(tripData.trip_id || tripData.TripID || Math.random()),
      routeId,
      routeShortName: routeId,
      direction,
      destinationName: String(tripData.DirectionDesc || tripData.destination || direction),
      arrivalTime: dateStr || new Date(Date.now() + minutesUntil * 60000).toISOString(),
      minutesUntilArrival: minutesUntil,
      trackingStatus: determineTrackingStatus(tripData),
      vehicleId: tripData.VehicleID ? String(tripData.VehicleID) : undefined,
      lastUpdated: tripData.Offset ? new Date().toISOString() : undefined,
      isDelayed: Boolean(tripData.late && Number(tripData.late) > 5),
      delayMinutes: tripData.late ? Number(tripData.late) : undefined,
      scheduledTime: tripData.scheduled ? String(tripData.scheduled) : undefined,
    };
  } catch {
    return null;
  }
}

function determineTrackingStatus(data: Record<string, unknown>): TrackingStatus {
  // Check for real-time indicators
  if (data.Offset !== undefined || data.VehicleID || data.lat) {
    return 'live';
  }
  if (data.estimated === true || data.late !== undefined) {
    return 'estimated';
  }
  if (data.scheduled === true) {
    return 'scheduled';
  }
  return 'no_data';
}

function transformAlerts(rawData: unknown): Alert[] {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .map((alert) => {
      const alertData = alert as Record<string, unknown>;
      return {
        alertId: String(alertData.alert_id || alertData.id || Math.random()),
        routeId: alertData.route_id ? String(alertData.route_id) : undefined,
        stopId: alertData.stop_id ? String(alertData.stop_id) : undefined,
        severity: determineSeverity(alertData),
        title: String(alertData.current_message || alertData.title || 'Service Alert'),
        description: String(alertData.advisory_message || alertData.description || ''),
        startTime: String(alertData.start_time || new Date().toISOString()),
        endTime: alertData.end_time ? String(alertData.end_time) : undefined,
        affectedRoutes: parseAffectedItems(alertData.route_id || alertData.routes),
        affectedStops: parseAffectedItems(alertData.stop_id || alertData.stops),
      };
    })
    .filter((alert) => alert.title);
}

function determineSeverity(data: Record<string, unknown>): 'info' | 'warning' | 'severe' {
  const severity = String(data.severity || data.alert_type || '').toLowerCase();
  if (severity.includes('severe') || severity.includes('emergency')) return 'severe';
  if (severity.includes('warning') || severity.includes('delay')) return 'warning';
  return 'info';
}

function parseAffectedItems(items: unknown): string[] {
  if (!items) return [];
  if (typeof items === 'string') return [items];
  if (Array.isArray(items)) return items.map(String);
  return [];
}

// Static data for routes and stops (would be fetched from GTFS in production)
export const SEPTA_ROUTES: Route[] = [
  // Bus Routes
  { routeId: '17', routeShortName: '17', routeLongName: '20th-Johnston', routeType: 'bus', routeColor: '004F9F', directions: [{ directionId: 0, directionName: 'Northbound', destinationName: '20th & Olney' }, { directionId: 1, directionName: 'Southbound', destinationName: '20th & Johnston' }] },
  { routeId: '21', routeShortName: '21', routeLongName: '21st Street', routeType: 'bus', routeColor: '004F9F', directions: [{ directionId: 0, directionName: 'Northbound', destinationName: 'Ogontz' }, { directionId: 1, directionName: 'Southbound', destinationName: 'Oregon' }] },
  { routeId: '23', routeShortName: '23', routeLongName: '23rd-Germantown', routeType: 'bus', routeColor: '004F9F', directions: [{ directionId: 0, directionName: 'Northbound', destinationName: 'Chestnut Hill' }, { directionId: 1, directionName: 'Southbound', destinationName: '11th & Oregon' }] },
  { routeId: '42', routeShortName: '42', routeLongName: 'Spruce-Pine', routeType: 'bus', routeColor: '004F9F', directions: [{ directionId: 0, directionName: 'Eastbound', destinationName: 'Penn\'s Landing' }, { directionId: 1, directionName: 'Westbound', destinationName: '46th & Market' }] },
  { routeId: '47', routeShortName: '47', routeLongName: '5th Street-Whitman Plaza', routeType: 'bus', routeColor: '004F9F', directions: [{ directionId: 0, directionName: 'Northbound', destinationName: '8th & Spring Garden' }, { directionId: 1, directionName: 'Southbound', destinationName: 'Whitman Plaza' }] },
  { routeId: 'LUCY', routeShortName: 'LUCY', routeLongName: 'Loop through University City', routeType: 'bus', routeColor: '9B59B6', directions: [{ directionId: 0, directionName: 'Loop', destinationName: 'University City' }] },
  
  // Trolley Routes
  { routeId: '10', routeShortName: '10', routeLongName: 'Lancaster-Overbrook', routeType: 'trolley', routeColor: '00A550', directions: [{ directionId: 0, directionName: 'Westbound', destinationName: 'Malvern Loop' }, { directionId: 1, directionName: 'Eastbound', destinationName: '13th & Market' }] },
  { routeId: '11', routeShortName: '11', routeLongName: 'Woodland', routeType: 'trolley', routeColor: '00A550', directions: [{ directionId: 0, directionName: 'Westbound', destinationName: 'Darby' }, { directionId: 1, directionName: 'Eastbound', destinationName: '13th & Market' }] },
  { routeId: '13', routeShortName: '13', routeLongName: 'Chester', routeType: 'trolley', routeColor: '00A550', directions: [{ directionId: 0, directionName: 'Westbound', destinationName: 'Yeadon Loop' }, { directionId: 1, directionName: 'Eastbound', destinationName: '13th & Market' }] },
  { routeId: '34', routeShortName: '34', routeLongName: 'Baltimore-61st', routeType: 'trolley', routeColor: '00A550', directions: [{ directionId: 0, directionName: 'Westbound', destinationName: '61st-Baltimore' }, { directionId: 1, directionName: 'Eastbound', destinationName: '13th & Market' }] },
  { routeId: '36', routeShortName: '36', routeLongName: 'Eastwick', routeType: 'trolley', routeColor: '00A550', directions: [{ directionId: 0, directionName: 'Westbound', destinationName: 'Eastwick Loop' }, { directionId: 1, directionName: 'Eastbound', destinationName: '13th & Market' }] },
  
  // Subway
  { routeId: 'MFL', routeShortName: 'MFL', routeLongName: 'Market-Frankford Line', routeType: 'subway', routeColor: '0066CC', directions: [{ directionId: 0, directionName: 'Eastbound', destinationName: 'Frankford' }, { directionId: 1, directionName: 'Westbound', destinationName: '69th Street' }] },
  { routeId: 'BSL', routeShortName: 'BSL', routeLongName: 'Broad Street Line', routeType: 'subway', routeColor: 'F37021', directions: [{ directionId: 0, directionName: 'Northbound', destinationName: 'Fern Rock' }, { directionId: 1, directionName: 'Southbound', destinationName: 'NRG Station' }] },
  
  // Regional Rail
  { routeId: 'AIR', routeShortName: 'AIR', routeLongName: 'Airport Line', routeType: 'regional_rail', routeColor: '91456C', directions: [{ directionId: 0, directionName: 'To Airport', destinationName: 'Airport' }, { directionId: 1, directionName: 'To Center City', destinationName: 'Temple University' }] },
  { routeId: 'CHE', routeShortName: 'CHE', routeLongName: 'Chestnut Hill East', routeType: 'regional_rail', routeColor: '91456C', directions: [{ directionId: 0, directionName: 'Outbound', destinationName: 'Chestnut Hill East' }, { directionId: 1, directionName: 'Inbound', destinationName: 'Temple University' }] },
  { routeId: 'CHW', routeShortName: 'CHW', routeLongName: 'Chestnut Hill West', routeType: 'regional_rail', routeColor: '91456C', directions: [{ directionId: 0, directionName: 'Outbound', destinationName: 'Chestnut Hill West' }, { directionId: 1, directionName: 'Inbound', destinationName: 'Temple University' }] },
  { routeId: 'LAN', routeShortName: 'LAN', routeLongName: 'Lansdale/Doylestown', routeType: 'regional_rail', routeColor: '91456C', directions: [{ directionId: 0, directionName: 'Outbound', destinationName: 'Doylestown' }, { directionId: 1, directionName: 'Inbound', destinationName: 'Temple University' }] },
  { routeId: 'MED', routeShortName: 'MED', routeLongName: 'Media/Wawa', routeType: 'regional_rail', routeColor: '91456C', directions: [{ directionId: 0, directionName: 'Outbound', destinationName: 'Wawa' }, { directionId: 1, directionName: 'Inbound', destinationName: 'Temple University' }] },
  { routeId: 'PAO', routeShortName: 'PAO', routeLongName: 'Paoli/Thorndale', routeType: 'regional_rail', routeColor: '91456C', directions: [{ directionId: 0, directionName: 'Outbound', destinationName: 'Thorndale' }, { directionId: 1, directionName: 'Inbound', destinationName: 'Temple University' }] },
  { routeId: 'TRE', routeShortName: 'TRE', routeLongName: 'Trenton', routeType: 'regional_rail', routeColor: '91456C', directions: [{ directionId: 0, directionName: 'Outbound', destinationName: 'Trenton' }, { directionId: 1, directionName: 'Inbound', destinationName: 'Temple University' }] },
  { routeId: 'WAR', routeShortName: 'WAR', routeLongName: 'Warminster', routeType: 'regional_rail', routeColor: '91456C', directions: [{ directionId: 0, directionName: 'Outbound', destinationName: 'Warminster' }, { directionId: 1, directionName: 'Inbound', destinationName: 'Temple University' }] },
  { routeId: 'WIL', routeShortName: 'WIL', routeLongName: 'Wilmington/Newark', routeType: 'regional_rail', routeColor: '91456C', directions: [{ directionId: 0, directionName: 'Outbound', destinationName: 'Newark' }, { directionId: 1, directionName: 'Inbound', destinationName: 'Temple University' }] },
  
  // NHSL
  { routeId: 'NHSL', routeShortName: 'NHSL', routeLongName: 'Norristown High Speed Line', routeType: 'nhsl', routeColor: '9B2D9B', directions: [{ directionId: 0, directionName: 'Outbound', destinationName: 'Norristown' }, { directionId: 1, directionName: 'Inbound', destinationName: '69th Street' }] },
];

// Sample stops for demo
export const SAMPLE_STOPS: Stop[] = [
  { stopId: '1234', stopName: '15th & Market', lat: 39.9526, lng: -75.1652, routes: ['MFL', '17', '42', '47'], wheelchairAccessible: true },
  { stopId: '2345', stopName: '30th Street Station', lat: 39.9557, lng: -75.1822, routes: ['MFL', 'AIR', 'PAO', 'TRE', 'WIL', '30', '42', 'LUCY'], wheelchairAccessible: true },
  { stopId: '3456', stopName: 'City Hall', lat: 39.9526, lng: -75.1635, routes: ['BSL', 'MFL', '17', '23', '47'], wheelchairAccessible: true },
  { stopId: '4567', stopName: '69th Street Transportation Center', lat: 39.9694, lng: -75.2593, routes: ['MFL', 'NHSL', '10', '11', '13', '34', '36', '104', '109'], wheelchairAccessible: true },
  { stopId: '5678', stopName: 'Suburban Station', lat: 39.9539, lng: -75.1680, routes: ['AIR', 'CHE', 'CHW', 'LAN', 'MED', 'PAO', 'TRE', 'WAR', 'WIL'], wheelchairAccessible: true },
  { stopId: '6789', stopName: 'Temple University', lat: 39.9812, lng: -75.1495, routes: ['BSL', 'AIR', 'CHE', 'CHW', 'LAN', 'MED', 'PAO', 'TRE', 'WAR', 'WIL'], wheelchairAccessible: true },
  { stopId: '7890', stopName: 'Frankford Transportation Center', lat: 40.0236, lng: -75.0816, routes: ['MFL', '3', '5', '14', '20', '25', '66', '67', '88'], wheelchairAccessible: true },
  { stopId: '8901', stopName: '40th & Market', lat: 39.9611, lng: -75.2005, routes: ['MFL', '10', '11', '13', '34', '36', '42', 'LUCY'], wheelchairAccessible: true },
  { stopId: '9012', stopName: 'Fern Rock Transportation Center', lat: 40.0460, lng: -75.1139, routes: ['BSL', 'CHE', 'CHW', 'LAN', 'WAR', '16', 'C', 'R'], wheelchairAccessible: true },
  { stopId: '0123', stopName: 'Olney Transportation Center', lat: 40.0339, lng: -75.1206, routes: ['BSL', '6', '16', '18', '22', '26', '55', 'C', 'R'], wheelchairAccessible: true },
];

export function searchStopsAndRoutes(query: string): (Stop | Route)[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const results: (Stop | Route)[] = [];

  // Search stops
  for (const stop of SAMPLE_STOPS) {
    if (
      stop.stopId.includes(normalizedQuery) ||
      stop.stopName.toLowerCase().includes(normalizedQuery)
    ) {
      results.push(stop);
    }
  }

  // Search routes
  for (const route of SEPTA_ROUTES) {
    if (
      route.routeId.toLowerCase().includes(normalizedQuery) ||
      route.routeShortName.toLowerCase().includes(normalizedQuery) ||
      route.routeLongName.toLowerCase().includes(normalizedQuery)
    ) {
      results.push(route);
    }
  }

  return results.slice(0, 10);
}

export function getStopById(stopId: string): Stop | undefined {
  return SAMPLE_STOPS.find((s) => s.stopId === stopId);
}

export function getRouteById(routeId: string): Route | undefined {
  return SEPTA_ROUTES.find((r) => r.routeId === routeId);
}

export function getRoutesByType(type: TransitMode): Route[] {
  return SEPTA_ROUTES.filter((r) => r.routeType === type);
}

export function getNearbyStops(lat: number, lng: number, radiusMeters = 500): NearbyStop[] {
  return SAMPLE_STOPS.map((stop) => {
    const distance = calculateDistance(lat, lng, stop.lat, stop.lng);
    return {
      ...stop,
      distanceMeters: distance,
      distanceText: formatDistance(distance),
    };
  })
    .filter((stop) => stop.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters: number): string {
  if (meters < 100) return `${Math.round(meters)} m`;
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

