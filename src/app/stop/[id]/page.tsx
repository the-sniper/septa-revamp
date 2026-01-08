'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Heart,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Clock,
  Accessibility,
} from 'lucide-react';
import { Header } from '@/components/Navigation';
import { ArrivalList } from '@/components/ArrivalTime';
import { RouteChip } from '@/components/RouteCard';
import { AlertBanner } from '@/components/AlertCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, TrackingBadge } from '@/components/ui/Badge';
import { ArrivalSkeleton } from '@/components/ui/Skeleton';
import { NoArrivalsState, ErrorState } from '@/components/ui/EmptyState';
import { useFavorites, useRecents } from '@/lib/store';
import { useCopyToClipboard, useInterval, useOnlineStatus } from '@/lib/hooks';
import { getStopById, getRealTimeArrivals, getRouteAlerts, SEPTA_ROUTES } from '@/lib/septa-api';
import type { Stop, Arrival, Alert } from '@/lib/types';

export default function StopPage() {
  const params = useParams();
  const stopId = params.id as string;

  const [stop, setStop] = useState<Stop | null>(null);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const { isFavoriteStop, addFavoriteStop, removeFavoriteStop } = useFavorites();
  const { addRecentItem } = useRecents();
  const { copied, copy } = useCopyToClipboard();
  const isOnline = useOnlineStatus();

  const isFavorite = isFavoriteStop(stopId);

  // Fetch stop data
  useEffect(() => {
    const stopData = getStopById(stopId);
    if (stopData) {
      setStop(stopData);
      addRecentItem({
        type: 'stop',
        id: stopData.stopId,
        title: stopData.stopName,
        subtitle: `Stop #${stopData.stopId}`,
      });
    }
  }, [stopId, addRecentItem]);

  // Fetch arrivals
  const fetchArrivals = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await getRealTimeArrivals(stopId);

      if (response.error && !response.data) {
        setError(response.error);
      } else {
        setArrivals(response.data || []);
        setError(null);
        setIsStale(response.isStale);
        setLastUpdated(response.lastUpdated ? new Date(response.lastUpdated) : new Date());
      }
    } catch (err) {
      setError('Failed to fetch arrivals');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [stopId]);

  // Initial fetch
  useEffect(() => {
    fetchArrivals();
  }, [fetchArrivals]);

  // Auto-refresh every 30 seconds
  useInterval(() => {
    if (isOnline) {
      fetchArrivals(true);
    }
  }, 30000);

  // Fetch alerts for routes at this stop
  useEffect(() => {
    async function fetchAlerts() {
      if (!stop) return;
      const allAlerts: Alert[] = [];
      for (const routeId of stop.routes.slice(0, 5)) {
        const response = await getRouteAlerts(routeId);
        if (response.data) {
          allAlerts.push(...response.data);
        }
      }
      // Deduplicate
      const uniqueAlerts = allAlerts.filter(
        (alert, index, self) => self.findIndex((a) => a.alertId === alert.alertId) === index
      );
      setAlerts(uniqueAlerts);
    }
    fetchAlerts();
  }, [stop]);

  const handleFavorite = () => {
    if (!stop) return;
    if (isFavorite) {
      removeFavoriteStop(stopId);
    } else {
      addFavoriteStop({
        stopId: stop.stopId,
        stopName: stop.stopName,
        addedAt: new Date().toISOString(),
      });
    }
  };

  const handleCopy = () => {
    copy(stopId);
  };

  if (!stop) {
    return (
      <>
        <Header showBack title="Stop" />
        <div className="max-w-lg mx-auto px-4 py-8">
          <ErrorState
            title="Stop not found"
            description={`We couldn't find a stop with ID ${stopId}`}
          />
        </div>
      </>
    );
  }

  // Get route details for this stop
  const stopRoutes = stop.routes
    .map((routeId) => SEPTA_ROUTES.find((r) => r.routeId === routeId))
    .filter(Boolean);

  return (
    <>
      <Header showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stop Header */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{stop.stopName}</h1>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 font-mono text-sm bg-background-subtle px-2.5 py-1 rounded-lg hover:bg-border transition-colors"
                >
                  <span className="text-foreground-muted">Stop #</span>
                  <span className="font-semibold text-foreground">{stop.stopId}</span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-live-green" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-foreground-subtle" />
                  )}
                </button>
                {stop.wheelchairAccessible && (
                  <Badge variant="info">
                    <Accessibility className="w-3 h-3" />
                    Accessible
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <IconButton onClick={handleFavorite} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <Heart
                  className={`w-6 h-6 ${isFavorite ? 'fill-alert-red text-alert-red' : 'text-foreground-subtle'}`}
                />
              </IconButton>
            </div>
          </div>

          {/* Routes at this stop */}
          <div className="flex flex-wrap gap-2 mt-4">
            {stopRoutes.map((route) => (
              <RouteChip
                key={route!.routeId}
                routeId={route!.routeShortName}
                routeType={route!.routeType}
                size="md"
              />
            ))}
          </div>
        </div>

        {/* Alerts Banner */}
        {alerts.length > 0 && <AlertBanner alerts={alerts} />}

        {/* Real-time Arrivals */}
        <section>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-septa-gold" />
              <CardTitle>Arrivals</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-foreground-subtle">
                  {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
              <IconButton
                onClick={() => fetchArrivals(true)}
                disabled={isRefreshing}
                aria-label="Refresh arrivals"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </IconButton>
            </div>
          </CardHeader>

          {/* Data quality indicator */}
          {!isLoading && arrivals.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              {isStale && (
                <Badge variant="estimated">
                  <AlertTriangle className="w-3 h-3" />
                  Cached data
                </Badge>
              )}
              {!isOnline && (
                <Badge variant="no-data">Offline</Badge>
              )}
            </div>
          )}

          <Card variant="elevated" padding="none">
            {isLoading ? (
              <div>
                <ArrivalSkeleton />
                <ArrivalSkeleton />
                <ArrivalSkeleton />
              </div>
            ) : error && arrivals.length === 0 ? (
              <div className="p-4">
                <ErrorState
                  title="Couldn't load arrivals"
                  description={error}
                  onRetry={() => fetchArrivals()}
                  isOffline={!isOnline}
                />
              </div>
            ) : arrivals.length === 0 ? (
              <div className="p-4">
                <NoArrivalsState stopName={stop.stopName} />
              </div>
            ) : (
              <div className="p-4">
                <ArrivalList arrivals={arrivals} showRoute maxItems={10} />
              </div>
            )}
          </Card>

          {/* Tracking legend */}
          {arrivals.length > 0 && (
            <div className="mt-4 p-3 bg-background-subtle rounded-lg">
              <p className="text-xs font-medium text-foreground-muted mb-2">Understanding arrival times</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5">
                  <TrackingBadge status="live" />
                  <span className="text-xs text-foreground-subtle">GPS tracked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrackingBadge status="estimated" />
                  <span className="text-xs text-foreground-subtle">Based on schedule</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrackingBadge status="no_data" />
                  <span className="text-xs text-foreground-subtle">No current data</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Routes at this Stop */}
        <section>
          <CardHeader>
            <CardTitle>Routes at this stop</CardTitle>
          </CardHeader>
          <Card variant="outlined" padding="none">
            <div className="divide-y divide-border">
              {stopRoutes.map((route) => (
                <Link
                  key={route!.routeId}
                  href={`/route/${route!.routeId}`}
                  className="flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors"
                >
                  <div
                    className={`
                      w-12 h-10 rounded-lg flex items-center justify-center
                      font-mono font-bold text-white
                      ${route!.routeType === 'bus' ? 'bg-[#004F9F]' : ''}
                      ${route!.routeType === 'trolley' ? 'bg-[#00A550]' : ''}
                      ${route!.routeType === 'subway' ? 'bg-[#0066CC]' : ''}
                      ${route!.routeType === 'regional_rail' ? 'bg-[#91456C]' : ''}
                      ${route!.routeType === 'nhsl' ? 'bg-[#9B2D9B]' : ''}
                    `}
                  >
                    {route!.routeShortName}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{route!.routeLongName}</p>
                    <p className="text-sm text-foreground-muted">
                      {route!.directions.map((d) => d.destinationName).join(' ↔ ')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </section>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            leftIcon={<ExternalLink className="w-4 h-4" />}
            onClick={() => window.open(`https://www.google.com/maps?q=${stop.lat},${stop.lng}`, '_blank')}
          >
            Open in Maps
          </Button>
          <Button
            variant="ghost"
            leftIcon={<Copy className="w-4 h-4" />}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy Stop ID'}
          </Button>
        </div>
      </div>
    </>
  );
}

