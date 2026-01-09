"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Locate,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Star,
  Clock,
  Loader2,
} from "lucide-react";
import { DepartureRow, DepartureRowSkeleton } from "@/components/DepartureRow";
import { useGeolocation, useInterval, useOnlineStatus } from "@/lib/hooks";
import { useFavorites } from "@/lib/store";
import {
  getNearbyStops,
  getRealTimeArrivals,
  getAlerts,
  SEPTA_ROUTES,
  SAMPLE_STOPS,
} from "@/lib/septa-api";
import type { NearbyStop, Arrival, Alert, TransitMode } from "@/lib/types";

interface NearbyDeparture {
  arrival: Arrival;
  stopId: string;
  stopName: string;
  distance: string;
  routeType: TransitMode;
}

export default function HomePage() {
  const {
    location,
    isLoading: isLoadingLocation,
    requestLocation,
    permission,
  } = useGeolocation();
  const { favoriteStops, favoriteRoutes } = useFavorites();
  const isOnline = useOnlineStatus();

  const [departures, setDepartures] = useState<NearbyDeparture[]>([]);
  const [isLoadingDepartures, setIsLoadingDepartures] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"nearby" | "favorites">("nearby");
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch nearby departures
  const fetchNearbyDepartures = useCallback(
    async (showLoading = true) => {
      if (!location) return;

      if (showLoading) setIsLoadingDepartures(true);
      else setIsRefreshing(true);

      try {
        // Get nearby stops
        const nearbyStops = getNearbyStops(location.lat, location.lng, 800);

        // Fetch arrivals for each stop (parallel)
        const allDepartures: NearbyDeparture[] = [];

        await Promise.all(
          nearbyStops.slice(0, 5).map(async (stop) => {
            const response = await getRealTimeArrivals(stop.stopId);
            if (response.data) {
              (response.data as Arrival[]).slice(0, 3).forEach((arrival) => {
                const route = SEPTA_ROUTES.find(
                  (r) => r.routeId === arrival.routeId
                );
                allDepartures.push({
                  arrival,
                  stopId: stop.stopId,
                  stopName: stop.stopName,
                  distance: stop.distanceText,
                  routeType: (route?.routeType as TransitMode) || "bus",
                });
              });
            }
          })
        );

        // Sort by arrival time
        allDepartures.sort(
          (a, b) =>
            a.arrival.minutesUntilArrival - b.arrival.minutesUntilArrival
        );

        setDepartures(allDepartures.slice(0, 10));
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to fetch departures:", error);
      } finally {
        setIsLoadingDepartures(false);
        setIsRefreshing(false);
        setHasInitialized(true);
      }
    },
    [location]
  );

  // Fetch departures when location changes
  useEffect(() => {
    if (location) {
      fetchNearbyDepartures();
    }
  }, [location, fetchNearbyDepartures]);

  // Auto-refresh every 30 seconds
  useInterval(() => {
    if (location && isOnline && !isLoadingDepartures) {
      fetchNearbyDepartures(false);
    }
  }, 30000);

  // Fetch alerts
  useEffect(() => {
    async function fetchAlerts() {
      const response = await getAlerts();
      if (response.data) {
        setAlerts(
          (response.data as Alert[])
            .filter((a) => a.severity === "severe")
            .slice(0, 2)
        );
      }
    }
    fetchAlerts();
  }, []);

  const hasFavorites = favoriteStops.length > 0;
  const severeAlerts = alerts.filter((a) => a.severity === "severe");

  // Show loading spinner while getting initial location
  const showLocationLoading =
    permission === "granted" && isLoadingLocation && !location;

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto">
          {/* Logo & Time */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-septa-blue flex items-center justify-center">
                <span className="text-septa-gold font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary">SEPTA</h1>
                <p className="text-xs text-text-muted">Philadelphia Transit</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-text-primary">
                {new Date().toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-text-muted">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <Link href="/routes">
            <div className="input flex items-center gap-3 cursor-pointer hover:border-septa-blue transition-colors">
              <Search className="w-5 h-5 text-text-muted" />
              <span className="text-text-muted">
                Search routes, stops, or places...
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* Alert Banner */}
      {severeAlerts.length > 0 && (
        <div className="px-4 pb-4">
          <div className="max-w-lg mx-auto">
            <Link href="/alerts">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-urgent/10 border border-urgent/20">
                <AlertTriangle className="w-5 h-5 text-urgent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-urgent">
                    {severeAlerts.length} service alert
                    {severeAlerts.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {severeAlerts[0]?.title}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-urgent" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 pb-24">
        <div className="max-w-lg mx-auto">
          {/* Tab Switcher */}
          {hasFavorites && (
            <div className="flex gap-2 mb-4 p-1 bg-bg-secondary rounded-xl">
              <button
                onClick={() => setActiveTab("nearby")}
                className={`flex-1 tab ${
                  activeTab === "nearby" ? "tab-active" : ""
                }`}
              >
                <Locate className="w-4 h-4 inline mr-2" />
                Nearby
              </button>
              <button
                onClick={() => setActiveTab("favorites")}
                className={`flex-1 tab ${
                  activeTab === "favorites" ? "tab-active" : ""
                }`}
              >
                <Star className="w-4 h-4 inline mr-2" />
                Favorites
              </button>
            </div>
          )}

          {/* Departures Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-primary">
                  {activeTab === "favorites" ? "Your Stops" : "Departing Soon"}
                </h2>
                {lastUpdated && activeTab === "nearby" && (
                  <span className="text-xs text-text-muted">
                    {lastUpdated.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {location && activeTab === "nearby" && (
                <button
                  onClick={() => fetchNearbyDepartures(false)}
                  className="btn-ghost p-2 rounded-lg"
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </button>
              )}
            </div>

            {/* Location Loading State */}
            {showLocationLoading && activeTab === "nearby" && (
              <div className="card p-8 text-center">
                <Loader2 className="w-10 h-10 text-septa-blue mx-auto mb-4 animate-spin" />
                <p className="text-text-secondary">Getting your location...</p>
              </div>
            )}

            {/* Location Not Enabled */}
            {!location &&
              permission !== "granted" &&
              permission !== "denied" &&
              !isLoadingLocation &&
              activeTab === "nearby" && (
                <div className="card p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-septa-blue/10 flex items-center justify-center mx-auto mb-4">
                    <Locate className="w-8 h-8 text-septa-blue" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Find departures near you
                  </h3>
                  <p className="text-sm text-text-secondary mb-6">
                    Enable location to see real-time departures from nearby
                    stops
                  </p>
                  <button
                    onClick={requestLocation}
                    disabled={isLoadingLocation}
                    className="btn btn-primary w-full"
                  >
                    {isLoadingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Getting location...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        Enable Location
                      </>
                    )}
                  </button>
                </div>
              )}

            {/* Location Denied */}
            {permission === "denied" && activeTab === "nearby" && (
              <div className="card p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-urgent/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-urgent" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Location access denied
                </h3>
                <p className="text-sm text-text-secondary">
                  Enable location in your browser settings to see nearby
                  departures
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoadingDepartures &&
              !showLocationLoading &&
              activeTab === "nearby" && (
                <div className="space-y-3">
                  <DepartureRowSkeleton />
                  <DepartureRowSkeleton />
                  <DepartureRowSkeleton />
                  <DepartureRowSkeleton />
                </div>
              )}

            {/* Departures List */}
            {!isLoadingDepartures &&
              location &&
              activeTab === "nearby" &&
              hasInitialized && (
                <div className="space-y-3">
                  {departures.length > 0 ? (
                    departures.map((dep, index) => (
                      <Link
                        key={`${dep.stopId}-${dep.arrival.tripId}-${index}`}
                        href={`/stop/${dep.stopId}`}
                      >
                        <DepartureRow
                          arrival={dep.arrival}
                          stopName={dep.stopName}
                          stopId={dep.stopId}
                          distance={dep.distance}
                          routeType={dep.routeType}
                        />
                      </Link>
                    ))
                  ) : (
                    <div className="card p-8 text-center">
                      <Clock className="w-12 h-12 text-text-muted mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        No upcoming departures
                      </h3>
                      <p className="text-sm text-text-secondary">
                        No buses or trains departing from nearby stops right now
                      </p>
                    </div>
                  )}
                </div>
              )}

            {/* Favorites Tab */}
            {activeTab === "favorites" && (
              <div className="space-y-3">
                {favoriteStops.length > 0 ? (
                  favoriteStops.map((fav) => {
                    const stop = SAMPLE_STOPS.find(
                      (s) => s.stopId === fav.stopId
                    );
                    if (!stop) return null;
                    return (
                      <Link key={fav.stopId} href={`/stop/${fav.stopId}`}>
                        <div className="card p-4 flex items-center gap-4 hover:bg-bg-highlight transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-septa-gold/10 flex items-center justify-center">
                            <Star className="w-5 h-5 text-septa-gold" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text-primary truncate">
                              {fav.stopName}
                            </p>
                            <p className="text-sm text-text-muted">
                              Stop #{fav.stopId}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-text-muted" />
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="card p-8 text-center">
                    <Star className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      No favorite stops yet
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Tap the heart icon on any stop to add it here
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Quick Routes */}
          {activeTab === "nearby" && (
            <section className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-primary">
                  Quick Routes
                </h2>
                <Link
                  href="/routes"
                  className="text-sm text-septa-blue font-medium"
                >
                  View all
                </Link>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {["MFL", "BSL", "17", "23", "42", "AIR"].map((routeId) => {
                  const route = SEPTA_ROUTES.find((r) => r.routeId === routeId);
                  if (!route) return null;

                  const getColor = () => {
                    switch (route.routeType) {
                      case "subway":
                        return routeId === "BSL"
                          ? "bg-mode-subway-bsl"
                          : "bg-mode-subway-mfl";
                      case "regional_rail":
                        return "bg-mode-rail";
                      case "bus":
                        return "bg-mode-bus";
                      default:
                        return "bg-mode-bus";
                    }
                  };

                  return (
                    <Link key={routeId} href={`/route/${routeId}`}>
                      <div
                        className={`${getColor()} px-4 py-3 rounded-xl min-w-[80px] text-center transition-transform hover:scale-105`}
                      >
                        <span className="font-mono font-bold text-white text-lg">
                          {route.routeShortName}
                        </span>
                        <p className="text-xs text-white/70 mt-1 truncate max-w-[80px]">
                          {route.routeType === "subway"
                            ? route.routeLongName.split(" ")[0]
                            : route.routeLongName.split("-")[0]}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
