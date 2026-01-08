'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  MapPin,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/Navigation';
import { StopCard } from '@/components/StopCard';
import { AlertBanner, AlertList } from '@/components/AlertCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, ModeBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/EmptyState';
import { useFavorites, useRecents } from '@/lib/store';
import { getRouteById, getRouteAlerts, SAMPLE_STOPS, getTransitView } from '@/lib/septa-api';
import type { Route, Alert, Stop } from '@/lib/types';

export default function RoutePage() {
  const params = useParams();
  const routeId = params.id as string;

  const [route, setRoute] = useState<Route | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<number>(0);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);

  const { isFavoriteRoute, addFavoriteRoute, removeFavoriteRoute } = useFavorites();
  const { addRecentItem } = useRecents();

  const isFavorite = route ? isFavoriteRoute(route.routeId) : false;

  // Fetch route data
  useEffect(() => {
    const routeData = getRouteById(routeId);
    if (routeData) {
      setRoute(routeData);
      addRecentItem({
        type: 'route',
        id: routeData.routeId,
        title: routeData.routeLongName,
        subtitle: routeData.routeShortName,
      });
    }
  }, [routeId, addRecentItem]);

  // Fetch alerts
  useEffect(() => {
    async function fetchAlerts() {
      setIsLoadingAlerts(true);
      const response = await getRouteAlerts(routeId);
      if (response.data) {
        setAlerts(response.data);
      }
      setIsLoadingAlerts(false);
    }
    fetchAlerts();
  }, [routeId]);

  // Fetch vehicle count
  useEffect(() => {
    async function fetchVehicles() {
      const response = await getTransitView(routeId);
      if (response.data && Array.isArray(response.data)) {
        const routeData = response.data.find((r: { route: string }) => r.route === routeId);
        if (routeData && Array.isArray(routeData.bus)) {
          setVehicleCount(routeData.bus.length);
        }
      }
    }
    fetchVehicles();
  }, [routeId]);

  const handleFavorite = () => {
    if (!route) return;
    if (isFavorite) {
      removeFavoriteRoute(routeId);
    } else {
      addFavoriteRoute({
        routeId: route.routeId,
        routeShortName: route.routeShortName,
        routeLongName: route.routeLongName,
        routeType: route.routeType,
        addedAt: new Date().toISOString(),
      });
    }
  };

  if (!route) {
    return (
      <>
        <Header showBack title="Route" />
        <div className="max-w-lg mx-auto px-4 py-8">
          <ErrorState
            title="Route not found"
            description={`We couldn't find route ${routeId}`}
          />
        </div>
      </>
    );
  }

  // Get stops for this route (mock data - would come from GTFS in production)
  const routeStops = SAMPLE_STOPS.filter((s) => s.routes.includes(route.routeId));

  const modeColors: Record<string, string> = {
    bus: 'bg-[#004F9F]',
    trolley: 'bg-[#00A550]',
    subway: 'bg-[#0066CC]',
    regional_rail: 'bg-[#91456C]',
    nhsl: 'bg-[#9B2D9B]',
  };

  return (
    <>
      <Header showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Route Header */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`
                  w-16 h-14 rounded-xl flex items-center justify-center
                  ${modeColors[route.routeType]} text-white font-mono font-bold text-2xl
                `}
              >
                {route.routeShortName}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{route.routeLongName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <ModeBadge mode={route.routeType} />
                  {vehicleCount !== null && (
                    <Badge variant="live" pulse>
                      {vehicleCount} active vehicle{vehicleCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <IconButton onClick={handleFavorite} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <Heart
                className={`w-6 h-6 ${isFavorite ? 'fill-alert-red text-alert-red' : 'text-foreground-subtle'}`}
              />
            </IconButton>
          </div>
        </div>

        {/* Alerts Banner */}
        {alerts.length > 0 && <AlertBanner alerts={alerts} />}

        {/* Direction Selector */}
        {route.directions.length > 1 && (
          <section>
            <CardHeader>
              <CardTitle>Direction</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-2">
              {route.directions.map((direction, index) => (
                <button
                  key={direction.directionId}
                  onClick={() => setSelectedDirection(index)}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all
                    ${selectedDirection === index
                      ? 'border-septa-gold bg-septa-gold/5'
                      : 'border-border bg-background-elevated hover:border-border-strong'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight
                      className={`w-4 h-4 ${
                        selectedDirection === index ? 'text-septa-gold' : 'text-foreground-subtle'
                      }`}
                    />
                    <span className="text-sm font-medium text-foreground-muted">
                      {direction.directionName}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">
                    To {direction.destinationName}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Single Direction Display */}
        {route.directions.length === 1 && (
          <Card variant="elevated">
            <div className="flex items-center gap-3">
              <ArrowRight className="w-5 h-5 text-septa-gold" />
              <div>
                <p className="text-sm text-foreground-muted">{route.directions[0].directionName}</p>
                <p className="font-semibold text-foreground">To {route.directions[0].destinationName}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Stops on this Route */}
        <section>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-septa-blue" />
              <CardTitle>Stops</CardTitle>
            </div>
            <span className="text-sm text-foreground-muted">
              {routeStops.length} stop{routeStops.length !== 1 ? 's' : ''}
            </span>
          </CardHeader>

          {routeStops.length > 0 ? (
            <Card variant="outlined" padding="none">
              <div className="divide-y divide-border">
                {routeStops.map((stop, index) => (
                  <Link
                    key={stop.stopId}
                    href={`/stop/${stop.stopId}`}
                    className="flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-septa-blue/10 flex items-center justify-center text-sm font-mono font-semibold text-septa-blue">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{stop.stopName}</p>
                      <p className="text-sm text-foreground-muted font-mono">#{stop.stopId}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-foreground-subtle" />
                  </Link>
                ))}
              </div>
            </Card>
          ) : (
            <Card variant="outlined" className="text-center py-8">
              <MapPin className="w-8 h-8 text-foreground-subtle mx-auto mb-2" />
              <p className="text-foreground-muted">Stop information not available</p>
            </Card>
          )}
        </section>

        {/* Service Alerts */}
        {alerts.length > 0 && (
          <section>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-estimated-amber" />
                <CardTitle>Service Alerts</CardTitle>
              </div>
            </CardHeader>
            <AlertList alerts={alerts} />
          </section>
        )}

        {/* Route Info */}
        <section>
          <CardHeader>
            <CardTitle>Route Information</CardTitle>
          </CardHeader>
          <Card variant="outlined">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Route Type</span>
                <ModeBadge mode={route.routeType} />
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Route Number</span>
                <span className="font-mono font-semibold">{route.routeShortName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Terminals</span>
                <span className="text-right text-sm">
                  {route.directions.map((d) => d.destinationName).join(' ↔ ')}
                </span>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}

