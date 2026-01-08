'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MapPin,
  ArrowRight,
  Train,
  Bus,
  ArrowUpDown,
  X,
  AlertCircle,
  Navigation2,
  Locate,
  Building2,
  Footprints,
  Clock,
  ChevronRight,
  CircleDot,
  Square,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Bell,
} from 'lucide-react';
import { Header } from '@/components/Navigation';
import { useDebounce, useGeolocation, useLiveLocation, getDistanceMeters } from '@/lib/hooks';
import { getTransitTypeColors } from '@/lib/septa-colors';
import dynamic from 'next/dynamic';

// Dev simulator flag - set NEXT_PUBLIC_DEV_SIMULATOR=true in .env.local to enable
const DEV_SIMULATOR_ENABLED = process.env.NEXT_PUBLIC_DEV_SIMULATOR === 'true';

// Dynamically import the map component (no SSR)
const TripMap = dynamic(() => import('@/components/TripMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
      <div className="animate-pulse text-text-muted">Loading map...</div>
    </div>
  )
});

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface SelectedPlace {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  isStation?: boolean;
}

interface StepLocation {
  lat: number;
  lng: number;
}

interface TransitStep {
  mode: 'transit' | 'walking';
  type?: string;
  lineName?: string;
  lineColor?: string;
  lineTextColor?: string;
  headsign?: string;
  departureStop?: string;
  arrivalStop?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureTimestamp?: number;
  numStops?: number;
  duration: string;
  durationValue?: number;
  distance?: string;
  instructions?: string;
  agency?: string;
  // Location data
  startLocation?: StepLocation;
  endLocation?: StepLocation;
  departureLocation?: StepLocation;
  arrivalLocation?: StepLocation;
  polyline?: [number, number][];
}

interface Route {
  summary: string;
  duration: string;
  durationValue: number;
  departureTime: string;
  arrivalTime: string;
  departureTimestamp: number;
  distance: string;
  steps: TransitStep[];
  overviewPolyline?: [number, number][];
  startLocation?: StepLocation;
  endLocation?: StepLocation;
}

// Philadelphia area stations
const STATIONS_WITH_COORDS: { name: string; lat: number; lng: number }[] = [
  { name: '30th Street Station', lat: 39.9557, lng: -75.1822 },
  { name: 'Suburban Station', lat: 39.9538, lng: -75.1679 },
  { name: 'Jefferson Station', lat: 39.9525, lng: -75.1581 },
  { name: 'Temple University', lat: 39.9812, lng: -75.1495 },
  { name: 'Airport Terminal E-F', lat: 39.8769, lng: -75.2428 },
  { name: 'University City', lat: 39.9484, lng: -75.1906 },
  { name: 'Trenton', lat: 40.2170, lng: -74.7554 },
  { name: 'Norristown TC', lat: 40.1126, lng: -75.3435 },
  { name: 'Lansdale', lat: 40.2415, lng: -75.2835 },
  { name: 'Doylestown', lat: 40.3101, lng: -75.1299 },
  { name: 'Paoli', lat: 40.0432, lng: -75.4821 },
  { name: 'Wilmington', lat: 39.7366, lng: -75.5515 },
  { name: 'Chestnut Hill East', lat: 40.0780, lng: -75.2074 },
  { name: 'Chestnut Hill West', lat: 40.0774, lng: -75.2119 },
  { name: 'Fox Chase', lat: 40.0766, lng: -75.0830 },
  { name: 'Warminster', lat: 40.1952, lng: -75.0866 },
  { name: 'Wawa', lat: 39.8989, lng: -75.4601 },
  { name: 'Media', lat: 39.9168, lng: -75.3876 },
  { name: 'Wayne Junction', lat: 40.0236, lng: -75.1591 },
  { name: 'Fern Rock TC', lat: 40.0460, lng: -75.1139 },
  { name: 'Ardmore', lat: 40.0072, lng: -75.2908 },
  { name: 'Bryn Mawr', lat: 40.0219, lng: -75.3165 },
  { name: 'Manayunk', lat: 40.0266, lng: -75.2246 },
];

const POPULAR_STATIONS = [
  '30th Street Station',
  'Suburban Station',
  'Jefferson Station',
  'Temple University',
  'University City',
  'Airport Terminal E-F',
];

function getMinutesUntil(timestamp: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.round((timestamp - now) / 60);
}

// Get transit info with official SEPTA colors
function getTransitInfo(type?: string, lineName?: string): { 
  icon: typeof Train; 
  label: string; 
  bgHex: string;
  textHex: string;
} {
  const nameHasMode = lineName && /bus|trolley|train|rail|subway|metro/i.test(lineName);
  const colors = getTransitTypeColors(type, lineName);
  
  switch (type) {
    case 'BUS':
      return { icon: Bus, label: nameHasMode ? '' : 'Bus', bgHex: colors.bg, textHex: colors.text };
    case 'SUBWAY':
    case 'METRO_RAIL':
      return { icon: Train, label: nameHasMode ? '' : 'Subway', bgHex: colors.bg, textHex: colors.text };
    case 'TRAM':
    case 'LIGHT_RAIL':
      return { icon: Train, label: nameHasMode ? '' : 'Trolley', bgHex: colors.bg, textHex: colors.text };
    case 'HEAVY_RAIL':
    case 'COMMUTER_TRAIN':
      return { icon: Train, label: nameHasMode ? '' : 'Train', bgHex: colors.bg, textHex: colors.text };
    default:
      return { icon: Train, label: nameHasMode ? '' : 'Transit', bgHex: colors.bg, textHex: colors.text };
  }
}

function cleanLineName(name?: string): string {
  if (!name) return '';
  return name.replace(/\s*(Bus|Trolley|Train|Rail|Metro)$/i, '').trim() || name;
}

// Request notification permission
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Send notification
function sendNotification(title: string, body: string) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', tag: 'septa-trip' });
  }
}

// Proximity thresholds in meters
const PROXIMITY_ARRIVED = 50; // Close enough to consider arrived at a stop
const PROXIMITY_APPROACHING = 150; // Getting close, prepare for action

// Separate component for walking step to ensure proper event handling
function WalkingStepButton({ 
  step, 
  idx, 
  isCurrent, 
  onSelect 
}: { 
  step: TransitStep; 
  idx: number; 
  isCurrent: boolean; 
  onSelect: () => void;
}) {
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Walking step interaction:', idx);
    onSelect();
  };

  return (
    <div 
      className={`w-full text-left flex items-center justify-between py-3 px-3 -mx-2 rounded-lg transition-all cursor-pointer select-none
        ${isCurrent ? 'bg-septa-blue/10 border border-septa-blue/30' : 'hover:bg-bg-secondary active:bg-bg-tertiary'}`}
      onClick={handleInteraction}
      onTouchEnd={handleInteraction}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="flex items-center gap-2">
        <Footprints className={`w-4 h-4 ${isCurrent ? 'text-septa-blue' : 'text-text-muted'}`} />
        <span className={`text-sm ${isCurrent ? 'text-septa-blue font-medium' : 'text-text-primary'}`}>
          Walk {step.duration} ({step.distance})
        </span>
      </div>
      <ChevronRight className={`w-4 h-4 ${isCurrent ? 'text-septa-blue' : 'text-text-muted'}`} />
    </div>
  );
}

export default function TripPlannerPage() {
  const { location: userLocation, requestLocation } = useGeolocation();
  
  const [originInput, setOriginInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const [originPlace, setOriginPlace] = useState<SelectedPlace | null>(null);
  const [destPlace, setDestPlace] = useState<SelectedPlace | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originFocused, setOriginFocused] = useState(false);
  const [destFocused, setDestFocused] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [placesApiAvailable, setPlacesApiAvailable] = useState(true);
  
  // Active trip tracking
  const [isTracking, setIsTracking] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [arrivalState, setArrivalState] = useState<'traveling' | 'approaching' | 'arrived' | 'completed'>('traveling');
  
  // Dev simulator state
  const [simLocation, setSimLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [simHeading, setSimHeading] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 5x speed
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simProgressRef = useRef(0);
  const lastSimLocation = useRef<{ lat: number; lng: number } | null>(null);
  
  // Live location for navigation (use simulated location if dev simulator is active)
  const { location: realLiveLocation, error: liveLocationError } = useLiveLocation(isTracking && !isSimulating);
  const liveLocation = (DEV_SIMULATOR_ENABLED && isSimulating && simLocation) ? simLocation : realLiveLocation;
  
  // Get heading - use simulated heading for simulator, real heading otherwise
  const userHeading = (DEV_SIMULATOR_ENABLED && isSimulating) ? simHeading : realLiveLocation?.heading;
  
  // Track if we've notified about certain events
  const notifiedEvents = useRef<Set<string>>(new Set());
  
  // Search results
  const [originPlaces, setOriginPlaces] = useState<PlacePrediction[]>([]);
  const [destPlaces, setDestPlaces] = useState<PlacePrediction[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  const originInputRef = useRef<HTMLDivElement>(null);
  const destInputRef = useRef<HTMLDivElement>(null);

  const debouncedOrigin = useDebounce(originInput, 300);
  const debouncedDest = useDebounce(destInput, 300);

  // Refresh time every 10 seconds when tracking
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), isTracking ? 10000 : 30000);
    return () => clearInterval(interval);
  }, [isTracking]);

  // ========================================
  // DEV SIMULATOR: Simulate user movement along route
  // ========================================
  const startSimulation = useCallback(() => {
    if (!selectedRoute?.overviewPolyline || selectedRoute.overviewPolyline.length < 2) return;
    
    setIsSimulating(true);
    simProgressRef.current = 0;
    setSimLocation({
      lat: selectedRoute.overviewPolyline[0][0],
      lng: selectedRoute.overviewPolyline[0][1],
    });
  }, [selectedRoute]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  }, []);

  const resetSimulation = useCallback(() => {
    simProgressRef.current = 0;
    lastSimLocation.current = null;
    setSimHeading(null);
    if (selectedRoute?.overviewPolyline?.[0]) {
      setSimLocation({
        lat: selectedRoute.overviewPolyline[0][0],
        lng: selectedRoute.overviewPolyline[0][1],
      });
    }
  }, [selectedRoute]);

  const skipToNextWaypoint = useCallback(() => {
    if (!selectedRoute?.steps) return;
    const currentStep = selectedRoute.steps[currentStepIndex];
    if (currentStep?.endLocation) {
      setSimLocation({
        lat: currentStep.endLocation.lat,
        lng: currentStep.endLocation.lng,
      });
    }
  }, [selectedRoute, currentStepIndex]);

  // Calculate bearing between two points (for heading)
  const calculateBearing = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const x = Math.sin(dLng) * Math.cos(lat2Rad);
    const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let bearing = Math.atan2(x, y) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
  }, []);

  // Run simulation - move along polyline with heading calculation
  useEffect(() => {
    if (!isSimulating || !selectedRoute?.overviewPolyline) return;

    const polyline = selectedRoute.overviewPolyline;
    const stepTime = 500 / simSpeed; // Update every 500ms, adjusted by speed

    simIntervalRef.current = setInterval(() => {
      simProgressRef.current += 0.002 * simSpeed; // Progress increment
      
      if (simProgressRef.current >= 1) {
        simProgressRef.current = 1;
        stopSimulation();
        return;
      }

      // Interpolate position along polyline
      const totalPoints = polyline.length - 1;
      const exactIndex = simProgressRef.current * totalPoints;
      const index = Math.floor(exactIndex);
      const fraction = exactIndex - index;

      if (index >= totalPoints) {
        setSimLocation({
          lat: polyline[totalPoints][0],
          lng: polyline[totalPoints][1],
        });
        return;
      }

      const lat = polyline[index][0] + (polyline[index + 1][0] - polyline[index][0]) * fraction;
      const lng = polyline[index][1] + (polyline[index + 1][1] - polyline[index][1]) * fraction;
      
      // Calculate heading based on direction of movement
      const newLocation = { lat, lng };
      if (lastSimLocation.current) {
        const heading = calculateBearing(
          lastSimLocation.current.lat,
          lastSimLocation.current.lng,
          lat,
          lng
        );
        setSimHeading(heading);
      } else if (index < totalPoints) {
        // Calculate initial heading from first two polyline points
        const heading = calculateBearing(
          polyline[index][0],
          polyline[index][1],
          polyline[index + 1][0],
          polyline[index + 1][1]
        );
        setSimHeading(heading);
      }
      
      lastSimLocation.current = newLocation;
      setSimLocation(newLocation);
    }, stepTime);

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, [isSimulating, selectedRoute, simSpeed, stopSimulation, calculateBearing]);

  // ========================================
  // SMART AUTO-ADVANCE: Detect step transitions based on GPS
  // ========================================
  useEffect(() => {
    if (!isTracking || !selectedRoute || !liveLocation) return;

    const currentStep = selectedRoute.steps[currentStepIndex];
    if (!currentStep) {
      setArrivalState('completed');
      return;
    }

    // Get target location for current step (where we need to go)
    let targetLat: number | undefined;
    let targetLng: number | undefined;

    if (currentStep.mode === 'walking') {
      // For walking, target is the end of the walk
      targetLat = currentStep.endLocation?.lat;
      targetLng = currentStep.endLocation?.lng;
    } else if (currentStep.mode === 'transit') {
      // For transit, first we need to reach the boarding stop, then wait to reach the alighting stop
      // If we haven't boarded yet (close to departure), target is departure location
      // Once we're on the transit, target is the arrival location
      const distToDeparture = currentStep.departureLocation 
        ? getDistanceMeters(liveLocation.lat, liveLocation.lng, currentStep.departureLocation.lat, currentStep.departureLocation.lng)
        : Infinity;
      
      // If we're far from departure, we're still getting there (or already on transit)
      // Check if we're closer to arrival to determine if we've boarded
      const distToArrival = currentStep.arrivalLocation
        ? getDistanceMeters(liveLocation.lat, liveLocation.lng, currentStep.arrivalLocation.lat, currentStep.arrivalLocation.lng)
        : Infinity;

      // Simple heuristic: if closer to arrival than departure, we've boarded
      if (distToArrival < distToDeparture) {
        targetLat = currentStep.arrivalLocation?.lat;
        targetLng = currentStep.arrivalLocation?.lng;
        
        // Send boarding notification once
        const boardedKey = `boarded-${currentStepIndex}`;
        if (notificationsEnabled && !notifiedEvents.current.has(boardedKey)) {
          notifiedEvents.current.add(boardedKey);
          setStatusMessage(`On ${currentStep.lineName} → ${currentStep.headsign}`);
        }
      } else {
        targetLat = currentStep.departureLocation?.lat;
        targetLng = currentStep.departureLocation?.lng;
      }
    }

    if (!targetLat || !targetLng) return;

    const distance = getDistanceMeters(liveLocation.lat, liveLocation.lng, targetLat, targetLng);

    // Update arrival state based on proximity
    if (distance <= PROXIMITY_ARRIVED) {
      setArrivalState('arrived');
    } else if (distance <= PROXIMITY_APPROACHING) {
      setArrivalState('approaching');
    } else {
      setArrivalState('traveling');
    }

    // Check if approaching
    if (distance <= PROXIMITY_APPROACHING && distance > PROXIMITY_ARRIVED) {
      const approachKey = `approach-${currentStepIndex}`;
      if (!notifiedEvents.current.has(approachKey)) {
        notifiedEvents.current.add(approachKey);
        
        if (currentStep.mode === 'transit' && currentStep.arrivalStop) {
          setStatusMessage(`Approaching ${currentStep.arrivalStop}`);
          if (notificationsEnabled) {
            sendNotification('Get Ready! 🔔', `Approaching ${currentStep.arrivalStop}`);
          }
        } else if (currentStep.mode === 'walking') {
          setStatusMessage(`Almost there!`);
        }
      }
    }

    // Check if arrived at target
    if (distance <= PROXIMITY_ARRIVED) {
      const arrivedKey = `arrived-${currentStepIndex}`;
      if (!notifiedEvents.current.has(arrivedKey)) {
        notifiedEvents.current.add(arrivedKey);

        // Auto-advance to next step
        if (currentStepIndex < selectedRoute.steps.length - 1) {
          const nextStep = selectedRoute.steps[currentStepIndex + 1];
          setCurrentStepIndex(currentStepIndex + 1);
          
          if (nextStep.mode === 'walking') {
            setStatusMessage(`Walk to ${nextStep.instructions || 'the next stop'}`);
            if (notificationsEnabled) {
              sendNotification('Time to walk! 🚶', nextStep.instructions || `Walk ${nextStep.duration}`);
            }
          } else if (nextStep.mode === 'transit') {
            setStatusMessage(`Head to ${nextStep.departureStop} for ${nextStep.lineName}`);
            if (notificationsEnabled) {
              sendNotification(`Board ${nextStep.lineName}`, `At ${nextStep.departureStop} → ${nextStep.headsign}`);
            }
          }
        } else {
          // Trip complete!
          setStatusMessage('You have arrived! 🎉');
          if (notificationsEnabled) {
            sendNotification('You\'ve arrived! 🎉', `Welcome to ${destPlace?.name}`);
          }
        }
      }
    }
  }, [liveLocation, isTracking, selectedRoute, currentStepIndex, notificationsEnabled, destPlace?.name]);

  // Search for places
  const searchPlaces = useCallback(async (query: string, type: 'origin' | 'destination') => {
    if (!query.trim()) {
      if (type === 'origin') setOriginPlaces([]);
      else setDestPlaces([]);
      return;
    }

    if (type === 'origin') setIsSearchingOrigin(true);
    else setIsSearchingDest(true);

    try {
      const response = await fetch(`/api/places?query=${encodeURIComponent(query)}&type=autocomplete`);
      const data = await response.json();

      if (data.error === 'Google Places API not configured') {
        setPlacesApiAvailable(false);
      } else if (data.predictions) {
        setPlacesApiAvailable(true);
        if (type === 'origin') setOriginPlaces(data.predictions);
        else setDestPlaces(data.predictions);
      }
    } catch (err) {
      console.error('Places search error:', err);
    } finally {
      if (type === 'origin') setIsSearchingOrigin(false);
      else setIsSearchingDest(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedOrigin && originFocused) searchPlaces(debouncedOrigin, 'origin');
  }, [debouncedOrigin, originFocused, searchPlaces]);

  useEffect(() => {
    if (debouncedDest && destFocused) searchPlaces(debouncedDest, 'destination');
  }, [debouncedDest, destFocused, searchPlaces]);

  const selectPlace = async (prediction: PlacePrediction, type: 'origin' | 'destination') => {
    try {
      const response = await fetch(`/api/places?query=${prediction.placeId}&type=details`);
      const data = await response.json();

      if (data.lat && data.lng) {
        const place: SelectedPlace = {
          name: prediction.mainText || data.name,
          address: prediction.secondaryText || data.address,
          lat: data.lat,
          lng: data.lng,
        };

        if (type === 'origin') {
          setOriginPlace(place);
          setOriginInput(place.name);
          setOriginFocused(false);
        } else {
          setDestPlace(place);
          setDestInput(place.name);
          setDestFocused(false);
        }
      }
    } catch (err) {
      console.error('Failed to get place details:', err);
    }
  };

  const selectStation = (stationName: string, type: 'origin' | 'destination') => {
    const station = STATIONS_WITH_COORDS.find(s => s.name === stationName);
    if (!station) return;

    const place: SelectedPlace = {
      name: stationName,
      isStation: true,
      lat: station.lat,
      lng: station.lng,
    };

    if (type === 'origin') {
      setOriginPlace(place);
      setOriginInput(stationName);
      setOriginFocused(false);
    } else {
      setDestPlace(place);
      setDestInput(stationName);
      setDestFocused(false);
    }
  };

  const useCurrentLocation = async () => {
    if (!userLocation) {
      requestLocation();
      return;
    }

    // Set immediately with loading state
    const place: SelectedPlace = {
      name: 'Current Location',
      address: 'Finding your location...',
      lat: userLocation.lat,
      lng: userLocation.lng,
    };

    setOriginPlace(place);
    setOriginInput('Current Location');
    setOriginFocused(false);

    // Fetch human-readable address via reverse geocoding
    try {
      const response = await fetch(
        `/api/places?type=reverse&lat=${userLocation.lat}&lng=${userLocation.lng}`
      );
      const data = await response.json();
      
      if (data.address) {
        setOriginPlace(prev => prev ? { ...prev, address: data.address } : prev);
      }
    } catch {
      // Keep the location without address if reverse geocoding fails
      setOriginPlace(prev => prev ? { ...prev, address: undefined } : prev);
    }
  };

  useEffect(() => {
    if (!originPlace || !destPlace) {
      setRoutes([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch(`/api/directions?originLat=${originPlace.lat}&originLng=${originPlace.lng}&destLat=${destPlace.lat}&destLng=${destPlace.lng}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.message || data.error);
          setRoutes([]);
        } else if (data.routes) {
          setRoutes(data.routes);
        }
      })
      .catch(() => {
        setError('Failed to fetch routes. Please try again.');
        setRoutes([]);
      })
      .finally(() => setIsLoading(false));
  }, [originPlace, destPlace]);

  const handleSwap = () => {
    const tempInput = originInput;
    const tempPlace = originPlace;
    setOriginInput(destInput);
    setOriginPlace(destPlace);
    setDestInput(tempInput);
    setDestPlace(tempPlace);
  };

  const getMatchingStations = (query: string) => {
    if (!query.trim()) return POPULAR_STATIONS;
    const q = query.toLowerCase();
    return STATIONS_WITH_COORDS.map(s => s.name).filter(s => s.toLowerCase().includes(q)).slice(0, 6);
  };

  // Start trip tracking
  const startTrip = async () => {
    const hasNotifications = await requestNotificationPermission();
    setNotificationsEnabled(hasNotifications);
    setIsTracking(true);
    setCurrentStepIndex(0);
    notifiedEvents.current.clear();
    
    const firstStep = selectedRoute?.steps[0];
    if (firstStep?.mode === 'walking') {
      setStatusMessage(`Walk to ${firstStep.instructions || 'the first stop'}`);
    } else if (firstStep?.mode === 'transit') {
      setStatusMessage(`Head to ${firstStep.departureStop}`);
    }
    
    if (hasNotifications) {
      sendNotification('Trip Started! 🚀', `Heading to ${destPlace?.name}`);
    }
  };

  // End trip
  const endTrip = () => {
    setIsTracking(false);
    setSelectedRoute(null);
    setCurrentStepIndex(0);
    setStatusMessage(null);
    setArrivalState('traveling');
    notifiedEvents.current.clear();
    // Reset simulator state
    setIsSimulating(false);
    setSimLocation(null);
    setSimHeading(null);
    lastSimLocation.current = null;
    simProgressRef.current = 0;
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  };

  // ========================================
  // ACTIVE TRIP NAVIGATION VIEW - Google Maps Style
  // ========================================
  if (isTracking && selectedRoute) {
    const currentStep = selectedRoute.steps[currentStepIndex];
    const isLastStep = currentStepIndex === selectedRoute.steps.length - 1;
    const transitInfo = currentStep?.mode === 'transit' ? getTransitInfo(currentStep.type, currentStep.lineName) : null;
    const firstTransitStep = selectedRoute.steps.find(s => s.mode === 'transit');
    const firstTransitInfo = firstTransitStep ? getTransitInfo(firstTransitStep.type, firstTransitStep.lineName) : null;

    return (
      <div className="fixed inset-0 bg-bg-primary flex flex-col">
        {/* Map - Full width, takes remaining space */}
        <div className="flex-1 relative" style={{ minHeight: '35vh' }}>
          <TripMap
            route={selectedRoute}
            userLocation={liveLocation}
            userHeading={userHeading}
            currentStepIndex={currentStepIndex}
            originName={originPlace?.name}
            destinationName={destPlace?.name}
            arrivalState={arrivalState}
            isNavigating={true}
          />
          
          {/* Top Bar - Route summary */}
          <div className="absolute top-0 left-0 right-0 z-10">
            <div className="bg-bg-primary/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-border-subtle">
              <button onClick={endTrip} className="p-2 -ml-2 hover:bg-bg-tertiary rounded-full">
                <X className="w-5 h-5 text-text-primary" />
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Footprints className="w-4 h-4 text-text-muted flex-shrink-0" />
                {firstTransitInfo && (
                  <>
                    <ChevronRight className="w-3 h-3 text-text-muted" />
                    <span 
                      className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: firstTransitInfo.bgHex, color: firstTransitInfo.textHex }}
                    >
                      {cleanLineName(firstTransitStep?.lineName)}
                    </span>
                  </>
                )}
                {selectedRoute.steps.filter(s => s.mode === 'transit').length > 1 && (
                  <span className="text-text-muted text-xs">+{selectedRoute.steps.filter(s => s.mode === 'transit').length - 1}</span>
                )}
              </div>
            </div>
            
            {/* Status message */}
            {statusMessage && (
              <div className="bg-septa-blue/90 backdrop-blur-sm px-4 py-2.5 flex items-center gap-2 border-b border-septa-blue/50">
                <Navigation2 className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-sm text-white font-medium truncate">{statusMessage}</span>
                <button 
                  onClick={() => setStatusMessage(null)}
                  className="ml-auto p-1 hover:bg-white/20 rounded"
                >
                  <X className="w-3 h-3 text-white/70" />
                </button>
              </div>
            )}
          </div>

          {/* Dev Simulator - Floating panel */}
          {DEV_SIMULATOR_ENABLED && (
            <div className="absolute top-16 right-3 z-20 bg-black/80 backdrop-blur rounded-lg shadow-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] text-yellow-400 font-bold">DEV</span>
                {isSimulating && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={isSimulating ? stopSimulation : startSimulation}
                  className={`p-1.5 rounded ${isSimulating ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
                >
                  {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button onClick={resetSimulation} className="p-1.5 rounded bg-white/10 text-white/70">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button onClick={skipToNextWaypoint} className="p-1.5 rounded bg-white/10 text-white/70">
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <select
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(Number(e.target.value))}
                  className="text-[10px] bg-white/10 text-white rounded px-1 py-1"
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={5}>5x</option>
                  <option value={10}>10x</option>
                </select>
              </div>
              {/* Debug info */}
              <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[9px] text-white/50 font-mono">
                {simHeading !== null && (
                  <div className="flex items-center gap-1">
                    <Navigation2 
                      className="w-3 h-3" 
                      style={{ transform: `rotate(${simHeading}deg)` }} 
                    />
                    <span>{Math.round(simHeading)}°</span>
                    <span className="text-white/30">
                      {simHeading < 45 || simHeading >= 315 ? 'N' : 
                       simHeading < 135 ? 'E' : 
                       simHeading < 225 ? 'S' : 'W'}
                    </span>
                  </div>
                )}
                <div className="text-white/30">
                  {arrivalState === 'approaching' && '⚠️ Approaching'}
                  {arrivalState === 'arrived' && '✅ Arrived'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sheet - Google Maps style timeline */}
        <div 
          className={`bg-bg-primary rounded-t-2xl shadow-2xl transition-all duration-300 ${isSheetExpanded ? 'flex-1' : ''}`}
          style={{ maxHeight: isSheetExpanded ? '65vh' : '50vh' }}
        >
          {/* Drag handle */}
          <button 
            onClick={() => setIsSheetExpanded(!isSheetExpanded)}
            className="w-full py-2 flex justify-center"
          >
            <div className="w-10 h-1 bg-border-subtle rounded-full" />
          </button>

          {/* Scrollable timeline */}
          <div className="overflow-y-auto px-4 pb-24" style={{ maxHeight: isSheetExpanded ? 'calc(65vh - 40px)' : 'calc(50vh - 40px)' }}>
            {/* Timeline */}
            <div className="relative">
              {/* Your location */}
              <div className="flex gap-3 pb-1">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
                  <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-600 my-1" style={{ minHeight: 20 }} />
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm text-text-secondary">Your location</p>
                </div>
              </div>

              {/* Steps */}
              {selectedRoute.steps.map((step, idx) => {
                const info = step.mode === 'transit' ? getTransitInfo(step.type, step.lineName) : null;
                const isComplete = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isNextTransit = step.mode === 'transit';

                return (
                  <div key={idx} className="flex gap-3">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center" style={{ width: 12 }}>
                      {step.mode === 'walking' ? (
                        <>
                          <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <div className="flex-1 border-l-2 border-dashed border-gray-400 my-1" style={{ minHeight: 30 }} />
                        </>
                      ) : (
                        <>
                          <div 
                            className="w-3 h-3 rounded-full border-2 border-white shadow"
                            style={{ backgroundColor: info?.bgHex || '#666' }}
                          />
                          <div 
                            className="w-1 flex-1 my-1 rounded-full" 
                            style={{ backgroundColor: info?.bgHex || '#666', minHeight: 50 }}
                          />
                        </>
                      )}
                    </div>

                    {/* Step content */}
                    <div className={`flex-1 pb-4 ${isCurrent ? '' : ''}`}>
                      {step.mode === 'walking' ? (
                        <WalkingStepButton
                          step={step}
                          idx={idx}
                          isCurrent={isCurrent}
                          onSelect={() => {
                            setCurrentStepIndex(idx);
                            setIsSheetExpanded(false);
                            const message = step.instructions || `Walk ${step.duration} (${step.distance})`;
                            setStatusMessage(message);
                          }}
                        />
                      ) : (
                        <div 
                          className={`rounded-xl cursor-pointer transition-colors ${isCurrent ? 'bg-bg-secondary p-3' : 'hover:bg-bg-secondary/50 active:bg-bg-tertiary p-1 -m-1'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Transit step clicked:', idx);
                            setCurrentStepIndex(idx);
                            setIsSheetExpanded(false);
                            setStatusMessage(`Board ${step.lineName} at ${step.departureStop}`);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          {/* Departure stop */}
                          <div className="mb-2">
                            <p className="font-semibold text-text-primary">{step.departureStop}</p>
                            {step.instructions && (
                              <p className="text-xs text-text-muted mt-0.5">{step.instructions}</p>
                            )}
                          </div>

                          {/* Transit line info */}
                          <div className="flex items-center gap-2 mb-2">
                            <span 
                              className="px-2 py-0.5 rounded text-xs font-bold"
                              style={{ backgroundColor: info?.bgHex || '#666', color: info?.textHex || '#fff' }}
                            >
                              {cleanLineName(step.lineName)}
                            </span>
                            <span className="text-sm text-text-secondary">{step.headsign}</span>
                          </div>

                          {/* Departure time */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">Scheduled</span>
                            <span className="font-mono font-semibold text-text-primary">{step.departureTime}</span>
                          </div>

                          {/* Ride info */}
                          <button className="w-full flex items-center gap-1 mt-2 text-text-muted text-xs">
                            <ChevronDown className="w-3 h-3" />
                            <span>Ride {step.numStops} stops ({step.duration})</span>
                          </button>

                          {/* Arrival stop */}
                          <div className="mt-3 pt-3 border-t border-border-subtle">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: info?.bgHex || '#666' }}
                                />
                                <span className="text-sm text-text-primary">{step.arrivalStop}</span>
                              </div>
                              <span className="font-mono text-sm text-text-primary">{step.arrivalTime}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Destination */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center" style={{ width: 12 }}>
                  <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text-primary">{destPlace?.name}</p>
                  {destPlace?.address && (
                    <p className="text-xs text-text-muted">{destPlace.address}</p>
                  )}
                </div>
                <span className="font-mono text-sm text-text-primary">{selectedRoute.arrivalTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Bar - Google Maps style */}
        <div className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border-subtle safe-bottom">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={endTrip}
                className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-full"
              >
                End
              </button>
              <button className="px-4 py-2 bg-bg-tertiary text-text-primary text-sm font-medium rounded-full flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                {notificationsEnabled ? 'Alerts On' : 'Alerts'}
              </button>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-text-primary">{selectedRoute.duration}</p>
              <p className="text-xs text-text-muted">{selectedRoute.arrivalTime}</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="flex h-1">
            {selectedRoute.steps.map((step, idx) => {
              const info = step.mode === 'transit' ? getTransitInfo(step.type, step.lineName) : null;
              const isComplete = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              
              return (
                <div 
                  key={idx}
                  className="flex-1 transition-opacity"
                  style={{ 
                    backgroundColor: step.mode === 'walking' ? '#9ca3af' : info?.bgHex || '#666',
                    opacity: isComplete ? 0.4 : 1,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* GPS Error Warning */}
        {liveLocationError && !isSimulating && (
          <div className="fixed top-20 left-4 right-4 z-30">
            <div className="bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
              📍 GPS unavailable - using simulated location for testing
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================
  // ROUTE DETAIL VIEW (Before starting trip)
  // ========================================
  if (selectedRoute) {
    const minutesUntil = getMinutesUntil(selectedRoute.departureTimestamp);
    const isUrgent = minutesUntil <= 5;

    return (
      <div className="min-h-screen bg-bg-primary flex flex-col">
        {/* Map Preview */}
        <div className="relative h-48 sm:h-56 bg-bg-secondary">
          <TripMap
            route={selectedRoute}
            userLocation={userLocation}
            userHeading={null}
            currentStepIndex={0}
            originName={originPlace?.name}
            destinationName={destPlace?.name}
            isNavigating={false}
          />
          <button 
            onClick={() => setSelectedRoute(null)} 
            className="absolute top-4 left-4 z-[1000] p-2.5 bg-bg-primary/95 backdrop-blur-sm rounded-full shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 -mt-6 rounded-t-3xl bg-bg-primary relative z-10 overflow-auto">
          <div className="w-12 h-1 bg-border-subtle rounded-full mx-auto mt-3" />
          
          {/* Countdown */}
          <div className="p-6 text-center border-b border-border-subtle">
            <p className="text-text-muted mb-1">Leave in</p>
            <div className={`font-mono text-5xl font-bold ${isUrgent ? 'text-urgent animate-pulse' : 'text-live'}`}>
              {minutesUntil <= 0 ? 'NOW' : minutesUntil}
            </div>
            {minutesUntil > 0 && <p className="text-text-muted">minutes</p>}
            <p className="text-sm text-text-secondary mt-2">
              {selectedRoute.departureTime} → {selectedRoute.arrivalTime} • {selectedRoute.duration}
            </p>
          </div>

          {/* Steps */}
          <div className="p-4 space-y-0">
            {selectedRoute.steps.map((step, index) => {
              const transitInfo = step.mode === 'transit' ? getTransitInfo(step.type, step.lineName) : null;

              if (step.mode === 'walking') {
                return (
                  <div key={index} className="flex items-start gap-3 py-3">
                    <div className="w-10 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
                        <Footprints className="w-5 h-5 text-text-muted" />
                      </div>
                      {index < selectedRoute.steps.length - 1 && (
                        <div className="w-0.5 flex-1 bg-border-subtle mt-2" style={{ minHeight: 20 }} />
                      )}
                    </div>
                    <div className="flex-1 pt-2">
                      <p className="text-text-primary font-medium">Walk {step.duration}</p>
                      <p className="text-text-muted text-sm">{step.distance}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className="flex items-start gap-3 py-3">
                  <div className="w-10 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: transitInfo?.bgHex || '#666' }}>
                      {transitInfo && <transitInfo.icon className="w-5 h-5 text-white" />}
                    </div>
                    {index < selectedRoute.steps.length - 1 && (
                      <div className="w-1.5 flex-1 mt-2 rounded-full" style={{ backgroundColor: transitInfo?.bgHex || '#666', minHeight: 50 }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span 
                        className="px-2 py-1 rounded-lg text-sm font-bold"
                        style={{ backgroundColor: transitInfo?.bgHex || '#666', color: transitInfo?.textHex || '#fff' }}
                      >
                        {cleanLineName(step.lineName)}
                      </span>
                      {transitInfo?.label && (
                        <span className="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded">
                          {transitInfo.label}
                        </span>
                      )}
                    </div>
                    <p className="text-text-primary font-semibold">{step.headsign}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-live">{step.departureTime}</span>
                        <span className="text-text-muted">{step.departureStop}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-text-primary">{step.arrivalTime}</span>
                        <span className="text-text-muted">{step.arrivalStop}</span>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-2">{step.numStops} stops • {step.duration}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GO Button */}
        <div className="p-4 pb-24 bg-bg-primary border-t border-border-subtle">
          <button
            onClick={startTrip}
            className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-xl ${
              isUrgent ? 'bg-urgent' : 'bg-live'
            } text-white shadow-lg`}
          >
            <Navigation2 className="w-6 h-6" />
            <span>Start Navigation</span>
          </button>
          <p className="text-center text-text-muted text-sm mt-3">
            📍 GPS will auto-track your progress
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // MAIN SEARCH VIEW
  // ========================================
  return (
    <>
      <Header title="Trip Planner" showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Origin Input */}
        <div ref={originInputRef} className="relative">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-live/10 flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-live" />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={originInput}
                  onChange={(e) => { setOriginInput(e.target.value); setOriginPlace(null); }}
                  onFocus={() => { setOriginFocused(true); setDestFocused(false); }}
                  placeholder="From: Address, place, or station..."
                  className="w-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted text-lg"
                />
                {originPlace?.address && (
                  <p className="text-xs text-text-muted mt-1 truncate">
                    {originPlace.name === 'Current Location' && '📍 '}{originPlace.address}
                  </p>
                )}
              </div>
              {originInput && (
                <button onClick={() => { setOriginInput(''); setOriginPlace(null); }} className="p-2 hover:bg-bg-tertiary rounded-lg">
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              )}
            </div>
          </div>
          
          {originFocused && (
            <div 
              className="fixed left-4 right-4 max-w-lg mx-auto bg-bg-elevated border border-border rounded-xl shadow-card max-h-96 overflow-y-auto"
              style={{ top: originInputRef.current ? originInputRef.current.getBoundingClientRect().bottom + 8 : 'auto', zIndex: 9999 }}
            >
              <div className="p-2">
                <button
                  onMouseDown={(e) => { e.preventDefault(); useCurrentLocation(); }}
                  className="w-full text-left px-3 py-3 hover:bg-bg-highlight rounded-lg flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-septa-blue/10 flex items-center justify-center">
                    <Locate className="w-4 h-4 text-septa-blue" />
                  </div>
                  <span className="text-text-primary font-medium">Current Location</span>
                </button>

                {placesApiAvailable && originPlaces.length > 0 && (
                  <>
                    <p className="text-xs text-text-muted px-3 py-2 uppercase tracking-wider font-semibold mt-2">Places</p>
                    {originPlaces.map(place => (
                      <button
                        key={place.placeId}
                        onMouseDown={(e) => { e.preventDefault(); selectPlace(place, 'origin'); }}
                        className="w-full text-left px-3 py-3 hover:bg-bg-highlight rounded-lg flex items-center gap-3 transition-colors"
                      >
                        <Building2 className="w-5 h-5 text-text-muted flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-text-primary truncate">{place.mainText}</p>
                          <p className="text-xs text-text-muted truncate">{place.secondaryText}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                <p className="text-xs text-text-muted px-3 py-2 uppercase tracking-wider font-semibold mt-2">
                  {originInput ? 'Stations' : 'Popular Stations'}
                </p>
                {getMatchingStations(originInput).map(station => (
                  <button
                    key={station}
                    onMouseDown={(e) => { e.preventDefault(); selectStation(station, 'origin'); }}
                    className="w-full text-left px-3 py-3 hover:bg-bg-highlight rounded-lg flex items-center gap-3 transition-colors"
                  >
                    <Train className="w-5 h-5 text-mode-rail flex-shrink-0" />
                    <span className="text-text-primary">{station}</span>
                  </button>
                ))}

                {isSearchingOrigin && <p className="text-sm text-text-muted text-center py-3">Searching...</p>}
              </div>
            </div>
          )}
        </div>

        {/* Swap */}
        <div className="flex justify-center -my-1">
          <button onClick={handleSwap} className="p-3 bg-bg-secondary hover:bg-bg-tertiary rounded-full transition-colors">
            <ArrowUpDown className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Destination Input */}
        <div ref={destInputRef} className="relative">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-urgent/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-urgent" />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={destInput}
                  onChange={(e) => { setDestInput(e.target.value); setDestPlace(null); }}
                  onFocus={() => { setDestFocused(true); setOriginFocused(false); }}
                  placeholder="To: Address, place, or station..."
                  className="w-full bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted text-lg"
                />
                {destPlace && destPlace.address && (
                  <p className="text-xs text-text-muted mt-1 truncate">{destPlace.address}</p>
                )}
              </div>
              {destInput && (
                <button onClick={() => { setDestInput(''); setDestPlace(null); }} className="p-2 hover:bg-bg-tertiary rounded-lg">
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              )}
            </div>
          </div>

          {destFocused && (
            <div 
              className="fixed left-4 right-4 max-w-lg mx-auto bg-bg-elevated border border-border rounded-xl shadow-card max-h-96 overflow-y-auto"
              style={{ top: destInputRef.current ? destInputRef.current.getBoundingClientRect().bottom + 8 : 'auto', zIndex: 9999 }}
            >
              <div className="p-2">
                {placesApiAvailable && destPlaces.length > 0 && (
                  <>
                    <p className="text-xs text-text-muted px-3 py-2 uppercase tracking-wider font-semibold">Places</p>
                    {destPlaces.map(place => (
                      <button
                        key={place.placeId}
                        onMouseDown={(e) => { e.preventDefault(); selectPlace(place, 'destination'); }}
                        className="w-full text-left px-3 py-3 hover:bg-bg-highlight rounded-lg flex items-center gap-3 transition-colors"
                      >
                        <Building2 className="w-5 h-5 text-text-muted flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-text-primary truncate">{place.mainText}</p>
                          <p className="text-xs text-text-muted truncate">{place.secondaryText}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                <p className="text-xs text-text-muted px-3 py-2 uppercase tracking-wider font-semibold mt-2">
                  {destInput ? 'Stations' : 'Popular Stations'}
                </p>
                {getMatchingStations(destInput).map(station => (
                  <button
                    key={station}
                    onMouseDown={(e) => { e.preventDefault(); selectStation(station, 'destination'); }}
                    className="w-full text-left px-3 py-3 hover:bg-bg-highlight rounded-lg flex items-center gap-3 transition-colors"
                  >
                    <Train className="w-5 h-5 text-mode-rail flex-shrink-0" />
                    <span className="text-text-primary">{station}</span>
                  </button>
                ))}

                {isSearchingDest && <p className="text-sm text-text-muted text-center py-3">Searching...</p>}
              </div>
            </div>
          )}
        </div>

        {(originFocused || destFocused) && (
          <div className="fixed inset-0 z-[9998]" onClick={() => { setOriginFocused(false); setDestFocused(false); }} />
        )}

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="w-2/3 h-5 skeleton rounded" />
                    <div className="w-1/2 h-4 skeleton rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-6 text-center mt-6">
            <AlertCircle className="w-10 h-10 text-delayed mx-auto mb-3" />
            <p className="text-text-primary mb-1">{error}</p>
          </div>
        ) : routes.length > 0 ? (
          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Routes</h2>
              <span className="text-sm text-text-muted">{routes.length} options</span>
            </div>
            
            {routes.map((route, index) => {
              const minutesUntil = getMinutesUntil(route.departureTimestamp);
              const isUrgent = minutesUntil <= 5;
              const isSoon = minutesUntil <= 15;
              const transitSteps = route.steps.filter(s => s.mode === 'transit');

              return (
                <button
                  key={index}
                  onClick={() => setSelectedRoute(route)}
                  className="card p-4 w-full text-left hover:bg-bg-highlight transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-text-primary">{route.departureTime}</span>
                      <ArrowRight className="w-4 h-4 text-text-muted" />
                      <span className="font-mono text-text-primary">{route.arrivalTime}</span>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-2xl font-bold ${isUrgent ? 'text-urgent' : isSoon ? 'text-arriving' : 'text-live'}`}>
                        {minutesUntil <= 0 ? 'NOW' : minutesUntil}
                      </div>
                      {minutesUntil > 0 && <p className="text-xs text-text-muted">min</p>}
                    </div>
                  </div>

                  {/* Route visualization with mode labels */}
                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    {route.steps.map((step, stepIndex) => {
                      if (step.mode === 'walking' && step.durationValue && step.durationValue < 180) return null;
                      
                      if (step.mode === 'walking') {
                        return (
                          <div key={stepIndex} className="flex items-center gap-1">
                            <div className="px-2 py-1 rounded bg-bg-tertiary flex items-center gap-1">
                              <Footprints className="w-3 h-3 text-text-muted" />
                              <span className="text-xs text-text-muted">{step.duration}</span>
                            </div>
                            {stepIndex < route.steps.length - 1 && <div className="w-2 h-0.5 bg-border-subtle" />}
                          </div>
                        );
                      }

                      const info = getTransitInfo(step.type, step.lineName);
                      return (
                        <div key={stepIndex} className="flex items-center gap-1">
                          <div className="flex items-center gap-1">
                            <span 
                              className="px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
                              style={{ backgroundColor: info.bgHex, color: info.textHex }}
                            >
                              <info.icon className="w-3 h-3" />
                              {cleanLineName(step.lineName)}
                            </span>
                            {info.label && <span className="text-xs text-text-muted">{info.label}</span>}
                          </div>
                          {stepIndex < route.steps.length - 1 && <div className="w-2 h-0.5 bg-border-subtle" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {route.duration}
                      </span>
                      {transitSteps.length > 1 && (
                        <span>{transitSteps.length - 1} transfer{transitSteps.length > 2 ? 's' : ''}</span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-muted" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (!originPlace || !destPlace) ? (
          <div className="card p-8 text-center mt-6">
            <Navigation2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="font-semibold text-text-primary mb-2">Where do you want to go?</p>
            <p className="text-sm text-text-secondary">
              Search for any address, restaurant, or place
            </p>
          </div>
        ) : null}

        {!placesApiAvailable && (
          <div className="card p-4 bg-septa-gold/10 border-septa-gold/20 mt-4">
            <p className="text-sm text-text-primary font-medium">💡 Enable Full Features</p>
            <p className="text-xs text-text-muted mt-1">
              Add GOOGLE_PLACES_API_KEY to .env.local for address search and multimodal routing
            </p>
          </div>
        )}
      </div>
    </>
  );
}
