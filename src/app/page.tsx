'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Route, AlertTriangle, ChevronRight, Locate, Clock, Star } from 'lucide-react';
import { Search } from '@/components/Search';
import { StopCard } from '@/components/StopCard';
import { RouteCard } from '@/components/RouteCard';
import { AlertCard } from '@/components/AlertCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StopCardSkeleton, AlertSkeleton } from '@/components/ui/Skeleton';
import { useGeolocation } from '@/lib/hooks';
import { useFavorites, useRecents } from '@/lib/store';
import { getNearbyStops, SEPTA_ROUTES, getAlerts, SAMPLE_STOPS } from '@/lib/septa-api';
import type { NearbyStop, Alert, Route as RouteType } from '@/lib/types';

export default function HomePage() {
  const { location, isLoading: isLoadingLocation, requestLocation, permission } = useGeolocation();
  const { favoriteStops, favoriteRoutes } = useFavorites();
  const { recentItems } = useRecents();
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch nearby stops when location changes
  useEffect(() => {
    if (location) {
      const stops = getNearbyStops(location.lat, location.lng, 800);
      setNearbyStops(stops);
    }
  }, [location]);

  // Fetch alerts on mount
  useEffect(() => {
    async function fetchAlerts() {
      setIsLoadingAlerts(true);
      const response = await getAlerts();
      if (response.data) {
        setAlerts(response.data.slice(0, 3));
      }
      setIsLoadingAlerts(false);
    }
    fetchAlerts();
  }, []);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get popular routes for quick access
  const popularRoutes = SEPTA_ROUTES.filter((r) =>
    ['MFL', 'BSL', '17', '23', '42', 'AIR'].includes(r.routeId)
  );

  const hasFavorites = favoriteStops.length > 0 || favoriteRoutes.length > 0;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-septa-blue via-septa-blue-dark to-septa-blue-dark px-4 pt-8 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-septa-gold/80 text-sm font-medium">{getGreeting()}</p>
              <h1 className="text-2xl font-bold text-white mt-1">Where to?</h1>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-white font-mono text-lg">
                {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <Search placeholder="Search stops, routes, or Stop ID..." />

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 bg-white/10 text-white hover:bg-white/20"
              onClick={requestLocation}
              isLoading={isLoadingLocation}
              leftIcon={<Locate className="w-4 h-4" />}
            >
              {permission === 'granted' ? 'Update location' : 'Find nearby'}
            </Button>
            <Link href="/alerts" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full bg-white/10 text-white hover:bg-white/20"
                leftIcon={<AlertTriangle className="w-4 h-4" />}
              >
                Service alerts
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 -mt-6 space-y-6 pb-8">
        {/* Active Alerts Banner */}
        {alerts.length > 0 && alerts.some((a) => a.severity === 'severe') && (
          <Link href="/alerts">
            <Card variant="outlined" className="bg-alert-red/5 border-alert-red/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-alert-red flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-alert-red text-sm">
                    {alerts.filter((a) => a.severity === 'severe').length} active service alert
                    {alerts.filter((a) => a.severity === 'severe').length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-alert-red" />
              </div>
            </Card>
          </Link>
        )}

        {/* Favorites Section */}
        {hasFavorites && (
          <section>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-septa-gold" />
                <CardTitle>Your Favorites</CardTitle>
              </div>
              <Link href="/favorites" className="text-sm text-septa-blue hover:underline">
                View all
              </Link>
            </CardHeader>
            <div className="space-y-3">
              {favoriteStops.slice(0, 2).map((fav) => {
                const stop = SAMPLE_STOPS.find((s) => s.stopId === fav.stopId);
                if (!stop) return null;
                return <StopCard key={fav.stopId} stop={stop} />;
              })}
              {favoriteRoutes.slice(0, 2).map((fav) => {
                const route = SEPTA_ROUTES.find((r) => r.routeId === fav.routeId);
                if (!route) return null;
                return <RouteCard key={fav.routeId} route={route} compact />;
              })}
            </div>
          </section>
        )}

        {/* Nearby Stops Section */}
        <section>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-septa-blue" />
              <CardTitle>Nearby Stops</CardTitle>
            </div>
            {location && (
              <Link href="/nearby" className="text-sm text-septa-blue hover:underline">
                View all
              </Link>
            )}
          </CardHeader>

          {!location && permission !== 'denied' ? (
            <Card variant="outlined" className="text-center py-8">
              <MapPin className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
              <p className="text-foreground-muted mb-4">
                Enable location to see stops near you
              </p>
              <Button onClick={requestLocation} isLoading={isLoadingLocation}>
                Enable Location
              </Button>
            </Card>
          ) : permission === 'denied' ? (
            <Card variant="outlined" className="text-center py-8">
              <MapPin className="w-10 h-10 text-foreground-subtle mx-auto mb-3" />
              <p className="text-foreground-muted mb-2">
                Location access was denied
              </p>
              <p className="text-sm text-foreground-subtle">
                Enable location in your browser settings to see nearby stops
              </p>
            </Card>
          ) : nearbyStops.length > 0 ? (
            <div className="space-y-3">
              {nearbyStops.slice(0, 3).map((stop) => (
                <StopCard key={stop.stopId} stop={stop} showDistance />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <StopCardSkeleton />
              <StopCardSkeleton />
            </div>
          )}
        </section>

        {/* Popular Routes Section */}
        <section>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Route className="w-5 h-5 text-septa-gold-dark" />
              <CardTitle>Popular Routes</CardTitle>
            </div>
            <Link href="/routes" className="text-sm text-septa-blue hover:underline">
              All routes
            </Link>
          </CardHeader>
          <div className="grid grid-cols-3 gap-2">
            {popularRoutes.map((route) => (
              <Link key={route.routeId} href={`/route/${route.routeId}`}>
                <Card
                  interactive
                  variant="elevated"
                  padding="sm"
                  className="text-center"
                >
                  <div
                    className={`
                      w-full py-2 rounded-lg mb-2 font-mono font-bold text-white text-lg
                      ${route.routeType === 'subway' ? 'bg-[#0066CC]' : ''}
                      ${route.routeType === 'bus' ? 'bg-[#004F9F]' : ''}
                      ${route.routeType === 'regional_rail' ? 'bg-[#91456C]' : ''}
                    `}
                  >
                    {route.routeShortName}
                  </div>
                  <p className="text-xs text-foreground-muted truncate">
                    {route.routeType === 'subway' ? route.routeLongName : route.routeLongName.split('-')[0]}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Service Alerts Section */}
        <section>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-estimated-amber" />
              <CardTitle>Service Alerts</CardTitle>
            </div>
            <Link href="/alerts" className="text-sm text-septa-blue hover:underline">
              View all
            </Link>
          </CardHeader>
          {isLoadingAlerts ? (
            <div className="space-y-3">
              <AlertSkeleton />
              <AlertSkeleton />
            </div>
          ) : alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertCard key={alert.alertId} alert={alert} compact />
              ))}
            </div>
          ) : (
            <Card variant="outlined" className="text-center py-6">
              <p className="text-foreground-muted">No active alerts</p>
            </Card>
          )}
        </section>

        {/* Recent Searches */}
        {recentItems.length > 0 && (
          <section>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-foreground-subtle" />
                <CardTitle>Recent</CardTitle>
              </div>
            </CardHeader>
            <Card variant="outlined" padding="none">
              <div className="divide-y divide-border">
                {recentItems.slice(0, 4).map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.type === 'stop' ? `/stop/${item.id}` : `/route/${item.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-background-subtle flex items-center justify-center">
                      {item.type === 'stop' ? (
                        <MapPin className="w-4 h-4 text-foreground-subtle" />
                      ) : (
                        <Route className="w-4 h-4 text-foreground-subtle" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-foreground-muted">{item.subtitle}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-subtle" />
                  </Link>
                ))}
              </div>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
