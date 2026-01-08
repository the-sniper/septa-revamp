'use client';

import { useState, useEffect } from 'react';
import { MapPin, Locate, RefreshCw } from 'lucide-react';
import { Header } from '@/components/Navigation';
import { StopCard } from '@/components/StopCard';
import { Card } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { StopCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useGeolocation } from '@/lib/hooks';
import { getNearbyStops } from '@/lib/septa-api';
import type { NearbyStop } from '@/lib/types';

export default function NearbyPage() {
  const { location, isLoading, error, permission, requestLocation } = useGeolocation();
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [radius, setRadius] = useState(500);

  useEffect(() => {
    if (location) {
      const stops = getNearbyStops(location.lat, location.lng, radius);
      setNearbyStops(stops);
    }
  }, [location, radius]);

  const radiusOptions = [
    { value: 250, label: '250m' },
    { value: 500, label: '500m' },
    { value: 1000, label: '1km' },
    { value: 2000, label: '2km' },
  ];

  return (
    <>
      <Header title="Nearby Stops" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Location Status */}
        <Card variant="elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${location ? 'bg-live-green/10' : 'bg-background-subtle'}
              `}>
                <MapPin className={`w-5 h-5 ${location ? 'text-live-green' : 'text-foreground-subtle'}`} />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {location ? 'Location enabled' : 'Location disabled'}
                </p>
                <p className="text-sm text-foreground-muted">
                  {location
                    ? `${nearbyStops.length} stops within ${radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}`
                    : permission === 'denied'
                    ? 'Enable in browser settings'
                    : 'Tap to enable'}
                </p>
              </div>
            </div>
            <Button
              variant={location ? 'ghost' : 'primary'}
              size="sm"
              onClick={requestLocation}
              isLoading={isLoading}
              leftIcon={location ? <RefreshCw className="w-4 h-4" /> : <Locate className="w-4 h-4" />}
            >
              {location ? 'Update' : 'Enable'}
            </Button>
          </div>
        </Card>

        {/* Radius Selector */}
        {location && (
          <div className="flex gap-2">
            {radiusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setRadius(option.value)}
                className={`
                  flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                  ${radius === option.value
                    ? 'bg-septa-blue text-white'
                    : 'bg-background-elevated text-foreground-muted hover:bg-background-subtle'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Stops List */}
        {!location && permission !== 'denied' ? (
          <EmptyState
            icon={<MapPin className="w-8 h-8" />}
            title="Enable location"
            description="We need your location to show nearby stops"
            action={{
              label: 'Enable Location',
              onClick: requestLocation,
            }}
          />
        ) : permission === 'denied' ? (
          <EmptyState
            icon={<MapPin className="w-8 h-8" />}
            title="Location access denied"
            description="Please enable location access in your browser settings to see nearby stops"
          />
        ) : nearbyStops.length === 0 && location ? (
          <EmptyState
            icon={<MapPin className="w-8 h-8" />}
            title="No stops nearby"
            description={`We couldn't find any stops within ${radius >= 1000 ? `${radius / 1000}km` : `${radius}m`} of your location`}
            action={{
              label: 'Expand search',
              onClick: () => setRadius(Math.min(radius * 2, 2000)),
            }}
          />
        ) : !location ? (
          <div className="space-y-3">
            <StopCardSkeleton />
            <StopCardSkeleton />
            <StopCardSkeleton />
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyStops.map((stop, index) => (
              <div
                key={stop.stopId}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <StopCard stop={stop} showDistance />
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <Card variant="outlined" className="bg-alert-red/5 border-alert-red/20">
            <p className="text-sm text-alert-red">{error}</p>
          </Card>
        )}
      </div>
    </>
  );
}

