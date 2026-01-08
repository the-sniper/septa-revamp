'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getTransitTypeColors, SEPTA_MODE_COLORS } from '@/lib/septa-colors';

interface StepLocation {
  lat: number;
  lng: number;
}

interface TransitStep {
  mode: 'transit' | 'walking';
  type?: string;
  lineName?: string;
  lineColor?: string;
  departureStop?: string;
  arrivalStop?: string;
  departureLocation?: StepLocation;
  arrivalLocation?: StepLocation;
  startLocation?: StepLocation;
  endLocation?: StepLocation;
  polyline?: [number, number][];
}

interface Route {
  overviewPolyline?: [number, number][];
  steps: TransitStep[];
  startLocation?: StepLocation;
  endLocation?: StepLocation;
}

export type ArrivalState = 'traveling' | 'approaching' | 'arrived' | 'completed';

interface TripMapProps {
  route: Route;
  userLocation: { lat: number; lng: number } | null;
  userHeading?: number | null; // Compass heading in degrees (0-360)
  currentStepIndex: number;
  originName?: string;
  destinationName?: string;
  arrivalState?: ArrivalState;
  isNavigating?: boolean; // True when actively following the route
  onRecenter?: () => void;
}

// Google Maps styles for dark mode - optimized for navigation
const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e87' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3C7680' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#023e58' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'transit', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{ color: '#283d6a' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#3a4762' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

function getStepColor(step: TransitStep): string {
  if (step.mode === 'walking') {
    return SEPTA_MODE_COLORS.walking.bg;
  }
  const colors = getTransitTypeColors(step.type, step.lineName);
  return colors.bg;
}

// Create SVG path for direction arrow (Google Maps style - compact with rounded feel)
function createArrowPath(): string {
  // Compact, rounded arrow like Google Maps
  return 'M 0,-6 L 5,5 Q 0,2 -5,5 Z';
}

export default function TripMap({ 
  route, 
  userLocation, 
  userHeading,
  currentStepIndex,
  originName,
  destinationName,
  arrivalState = 'traveling',
  isNavigating = false,
  onRecenter
}: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const userCircleRef = useRef<google.maps.Circle | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const arrivalMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const lastUserLocation = useRef<{ lat: number; lng: number } | null>(null);
  const lastHeading = useRef<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const mapMovedByUser = useRef(false);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    
    if (!apiKey) {
      setMapError('Google Maps API key not configured');
      return;
    }

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setMapError('Failed to load Google Maps');
    document.head.appendChild(script);

    return () => {
      // Don't remove script - it's shared
    };
  }, []);

  // Initialize map with rotation support
  useEffect(() => {
    if (!isLoaded || !mapRef.current || googleMapRef.current) return;

    const center = userLocation 
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : route.startLocation 
        ? { lat: route.startLocation.lat, lng: route.startLocation.lng }
        : { lat: 39.9526, lng: -75.1652 };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: isNavigating ? 17 : 15,
      tilt: isNavigating ? 45 : 0, // Tilted view for navigation mode
      heading: userHeading || 0,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy', // Allow all gestures including rotation
      rotateControl: true,
      keyboardShortcuts: true,
    });

    googleMapRef.current = map;

    // Track when user manually moves the map
    map.addListener('dragstart', () => {
      mapMovedByUser.current = true;
      setIsFollowing(false);
    });

    // Fit bounds to route if not navigating
    if (!isNavigating && route.overviewPolyline && route.overviewPolyline.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      route.overviewPolyline.forEach(([lat, lng]) => {
        bounds.extend({ lat, lng });
      });
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [isLoaded, route.overviewPolyline, route.startLocation, userLocation, isNavigating, userHeading]);

  // Draw route polylines
  useEffect(() => {
    if (!googleMapRef.current || !isLoaded) return;

    // Clear existing polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    // Draw each step's polyline
    route.steps.forEach((step, idx) => {
      if (!step.polyline || step.polyline.length === 0) return;

      const color = getStepColor(step);
      const isCurrentStep = idx === currentStepIndex;
      const isCompleted = idx < currentStepIndex;

      const polyline = new google.maps.Polyline({
        path: step.polyline.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: color,
        strokeOpacity: isCompleted ? 0.4 : isCurrentStep ? 1 : 0.7,
        strokeWeight: isCurrentStep ? 7 : 4,
        zIndex: isCurrentStep ? 10 : 1,
      });

      // Add dashed effect for walking
      if (step.mode === 'walking') {
        polyline.setOptions({
          strokeOpacity: 0,
          icons: [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: isCompleted ? 0.4 : 0.8,
              strokeColor: color,
              strokeWeight: isCurrentStep ? 5 : 3,
              scale: 3,
            },
            offset: '0',
            repeat: '15px',
          }],
        });
      }

      polyline.setMap(googleMapRef.current);
      polylinesRef.current.push(polyline);
    });
  }, [route.steps, currentStepIndex, isLoaded]);

  // Draw markers for stops
  useEffect(() => {
    if (!googleMapRef.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Origin marker (green)
    if (route.startLocation) {
      const originMarker = new google.maps.Marker({
        position: { lat: route.startLocation.lat, lng: route.startLocation.lng },
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: originName || 'Start',
        zIndex: 100,
      });
      markersRef.current.push(originMarker);
    }

    // Destination marker (red dot)
    if (route.endLocation) {
      const destMarker = new google.maps.Marker({
        position: { lat: route.endLocation.lat, lng: route.endLocation.lng },
        map: googleMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: destinationName || 'Destination',
        zIndex: 100,
      });
      markersRef.current.push(destMarker);
    }

    // Transit stop markers
    route.steps.forEach((step, idx) => {
      if (step.mode !== 'transit') return;
      
      const color = getStepColor(step);
      const isCurrentStep = idx === currentStepIndex;
      const isCompleted = idx < currentStepIndex;

      // Departure stop
      if (step.departureLocation) {
        const marker = new google.maps.Marker({
          position: { lat: step.departureLocation.lat, lng: step.departureLocation.lng },
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isCurrentStep ? 10 : 7,
            fillColor: isCompleted ? '#6b7280' : color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: step.departureStop || 'Board here',
          zIndex: isCurrentStep ? 50 : 10,
          cursor: 'pointer',
        });
        
        // Click to center on this stop
        const stopName = step.departureStop || 'Board here';
        const lineName = step.lineName || 'Transit';
        marker.addListener('click', () => {
          if (googleMapRef.current && step.departureLocation) {
            googleMapRef.current.panTo({ lat: step.departureLocation.lat, lng: step.departureLocation.lng });
            // Show info window
            const infoWindow = new google.maps.InfoWindow({
              content: `<div style="color:#000;padding:4px;font-size:13px;"><strong>${stopName}</strong><br/><span style="color:#666;">Board ${lineName}</span></div>`,
            });
            infoWindow.open(googleMapRef.current, marker);
          }
        });
        
        markersRef.current.push(marker);
      }

      // Arrival stop
      if (step.arrivalLocation) {
        const marker = new google.maps.Marker({
          position: { lat: step.arrivalLocation.lat, lng: step.arrivalLocation.lng },
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isCurrentStep ? 10 : 7,
            fillColor: isCompleted ? '#6b7280' : color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          title: step.arrivalStop || 'Exit here',
          zIndex: isCurrentStep ? 50 : 10,
          cursor: 'pointer',
        });
        
        // Click to center on this stop
        const stopName = step.arrivalStop || 'Exit here';
        const lineName = step.lineName || 'Transit';
        marker.addListener('click', () => {
          if (googleMapRef.current && step.arrivalLocation) {
            googleMapRef.current.panTo({ lat: step.arrivalLocation.lat, lng: step.arrivalLocation.lng });
            // Show info window
            const infoWindow = new google.maps.InfoWindow({
              content: `<div style="color:#000;padding:4px;font-size:13px;"><strong>${stopName}</strong><br/><span style="color:#666;">Exit ${lineName}</span></div>`,
            });
            infoWindow.open(googleMapRef.current, marker);
          }
        });
        
        markersRef.current.push(marker);
      }
    });
  }, [route, currentStepIndex, isLoaded, originName, destinationName]);

  // Update user location marker with directional arrow
  useEffect(() => {
    if (!googleMapRef.current || !isLoaded || !userLocation) return;

    const hasHeading = userHeading !== null && userHeading !== undefined && !isNaN(userHeading);
    const rotation = hasHeading ? userHeading : 0;

    // Create or update user marker
    if (!userMarkerRef.current) {
      // Create directional arrow marker (Google Maps navigation style)
      userMarkerRef.current = new google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map: googleMapRef.current,
        icon: hasHeading ? {
          path: createArrowPath(),
          scale: 2,
          fillColor: '#4285F4', // Google blue
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: rotation,
          anchor: new google.maps.Point(0, 0),
        } : {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'You are here',
        zIndex: 1000,
        cursor: 'pointer',
        optimized: false, // Better click handling
      });

      // Click on user marker to recenter and follow
      userMarkerRef.current.addListener('click', () => {
        if (googleMapRef.current && userMarkerRef.current) {
          const pos = userMarkerRef.current.getPosition();
          if (pos) {
            mapMovedByUser.current = false;
            setIsFollowing(true);
            googleMapRef.current.panTo(pos);
            googleMapRef.current.setZoom(17);
            console.log('User marker clicked - recentering');
          }
        }
      });

      // Add pulsing accuracy circle (not clickable so marker receives clicks)
      userCircleRef.current = new google.maps.Circle({
        map: googleMapRef.current,
        center: { lat: userLocation.lat, lng: userLocation.lng },
        radius: 15,
        fillColor: '#4285F4',
        fillOpacity: 0.2,
        strokeColor: '#4285F4',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        zIndex: 999,
        clickable: false,
      });
    } else {
      // Update position
      userMarkerRef.current.setPosition({ lat: userLocation.lat, lng: userLocation.lng });
      
      // Update icon with new rotation if heading changed
      if (hasHeading && (lastHeading.current !== userHeading)) {
        userMarkerRef.current.setIcon({
          path: createArrowPath(),
          scale: 2,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: rotation,
          anchor: new google.maps.Point(0, 0),
        });
      } else if (!hasHeading && lastHeading.current !== null) {
        // Switch back to circle if heading lost
        userMarkerRef.current.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 4,
        });
      }

      // Update accuracy circle
      if (userCircleRef.current) {
        userCircleRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      }
    }

    lastHeading.current = hasHeading ? userHeading : null;

    // Auto-follow user if in following mode
    if (isFollowing && isNavigating && !mapMovedByUser.current) {
      const map = googleMapRef.current;
      
      // Smoothly pan to user
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      
      // Rotate map to face direction of travel if we have heading
      if (hasHeading) {
        // Use moveCamera for smooth rotation
        const currentTilt = map.getTilt() || 0;
        map.moveCamera({
          heading: userHeading,
          tilt: Math.min(currentTilt, 45),
        });
      }
    }

    // Track significant movement
    if (lastUserLocation.current && !isFollowing) {
      const dlat = Math.abs(userLocation.lat - lastUserLocation.current.lat);
      const dlng = Math.abs(userLocation.lng - lastUserLocation.current.lng);
      if (dlat > 0.001 || dlng > 0.001) {
        // User has moved significantly, but they panned away - don't auto-follow
      }
    }
    
    lastUserLocation.current = userLocation;
  }, [userLocation, userHeading, isLoaded, isFollowing, isNavigating]);

  // Show arrival indicator when approaching/arrived
  useEffect(() => {
    if (!googleMapRef.current || !isLoaded) return;

    // Clear previous arrival marker
    if (arrivalMarkerRef.current) {
      arrivalMarkerRef.current.setMap(null);
      arrivalMarkerRef.current = null;
    }

    // Show arrival pulse at current target location
    if ((arrivalState === 'approaching' || arrivalState === 'arrived') && route.steps[currentStepIndex]) {
      const currentStep = route.steps[currentStepIndex];
      let targetLocation: StepLocation | undefined;

      if (currentStep.mode === 'walking') {
        targetLocation = currentStep.endLocation;
      } else if (currentStep.mode === 'transit') {
        targetLocation = currentStep.arrivalLocation || currentStep.endLocation;
      }

      if (targetLocation) {
        const isArrived = arrivalState === 'arrived';
        
        // Create pulsing circle for arrival
        arrivalMarkerRef.current = new google.maps.Marker({
          position: { lat: targetLocation.lat, lng: targetLocation.lng },
          map: googleMapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isArrived ? 25 : 20,
            fillColor: isArrived ? '#22c55e' : '#f59e0b',
            fillOpacity: 0.3,
            strokeColor: isArrived ? '#22c55e' : '#f59e0b',
            strokeOpacity: 0.8,
            strokeWeight: 3,
          },
          zIndex: 200,
        });

        // Animate pulse effect
        let scale = isArrived ? 25 : 20;
        let growing = true;
        const pulseInterval = setInterval(() => {
          if (!arrivalMarkerRef.current) {
            clearInterval(pulseInterval);
            return;
          }
          
          if (growing) {
            scale += 0.5;
            if (scale >= (isArrived ? 35 : 30)) growing = false;
          } else {
            scale -= 0.5;
            if (scale <= (isArrived ? 25 : 20)) growing = true;
          }

          arrivalMarkerRef.current.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            scale: scale,
            fillColor: isArrived ? '#22c55e' : '#f59e0b',
            fillOpacity: 0.3,
            strokeColor: isArrived ? '#22c55e' : '#f59e0b',
            strokeOpacity: 0.8,
            strokeWeight: 3,
          });
        }, 50);

        return () => clearInterval(pulseInterval);
      }
    }
  }, [arrivalState, currentStepIndex, route.steps, isLoaded]);

  // Recenter and resume following
  const handleRecenter = useCallback(() => {
    if (!googleMapRef.current) return;
    
    mapMovedByUser.current = false;
    setIsFollowing(true);
    
    if (userLocation) {
      googleMapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      if (isNavigating) {
        googleMapRef.current.setZoom(17);
        googleMapRef.current.setTilt(45);
        if (userHeading !== null && userHeading !== undefined) {
          googleMapRef.current.moveCamera({ heading: userHeading });
        }
      } else {
        googleMapRef.current.setZoom(16);
      }
    } else if (route.startLocation) {
      googleMapRef.current.panTo({ lat: route.startLocation.lat, lng: route.startLocation.lng });
    }

    onRecenter?.();
  }, [userLocation, userHeading, route.startLocation, isNavigating, onRecenter]);

  // Reset to north-up view
  const handleResetNorth = useCallback(() => {
    if (!googleMapRef.current) return;
    googleMapRef.current.moveCamera({ heading: 0, tilt: 0 });
  }, []);

  if (mapError) {
    return (
      <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-text-muted mb-2">Map unavailable</p>
          <p className="text-xs text-text-muted">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: '250px' }}>
      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0" />
      
      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary">
          <div className="flex items-center gap-2 text-text-muted">
            <div className="w-5 h-5 border-2 border-septa-blue border-t-transparent rounded-full animate-spin" />
            <span>Loading map...</span>
          </div>
        </div>
      )}
      
      {/* Arrival banner */}
      {arrivalState === 'arrived' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-live text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 font-semibold animate-bounce">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            You have arrived!
          </div>
        </div>
      )}

      {/* Approaching banner */}
      {arrivalState === 'approaching' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-amber-500 text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 font-medium">
            <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Get ready - approaching stop
          </div>
        </div>
      )}
      
      {/* Map controls */}
      {isLoaded && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          {/* Compass/North button - shows current heading */}
          {isNavigating && (
            <button
              onClick={handleResetNorth}
              className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
              title="Reset to north"
            >
              <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </button>
          )}
          
          {/* Recenter button */}
          <button
            onClick={handleRecenter}
            className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
              isFollowing 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-white hover:bg-gray-50 active:bg-gray-100'
            }`}
            title={isFollowing ? 'Following location' : 'Center on location'}
          >
            <svg className={`w-5 h-5 ${isFollowing ? 'text-white' : 'text-gray-700'}`} viewBox="0 0 24 24" fill="currentColor">
              {isFollowing ? (
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
              ) : (
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
              )}
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
