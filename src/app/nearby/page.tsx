"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Locate,
  RefreshCw,
  ChevronRight,
  Navigation2,
} from "lucide-react";
import { Header } from "@/components/Navigation";
import {
  DepartureRowCompact,
  DepartureRowSkeleton,
} from "@/components/DepartureRow";
import { useGeolocation, useInterval, useOnlineStatus } from "@/lib/hooks";
import {
  getNearbyStops,
  getRealTimeArrivals,
  SEPTA_ROUTES,
} from "@/lib/septa-api";
import type { NearbyStop, Arrival, TransitMode } from "@/lib/types";

const RADIUS_OPTIONS = [
  { value: 250, label: "250m" },
  { value: 500, label: "500m" },
  { value: 800, label: "800m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
];

interface StopWithArrivals extends NearbyStop {
  arrivals: (Arrival & { routeType?: TransitMode })[];
  isLoadingArrivals: boolean;
}

export default function NearbyPage() {
  const {
    location,
    isLoading: isLoadingLocation,
    requestLocation,
    permission,
  } = useGeolocation();
  const isOnline = useOnlineStatus();

  const [radius, setRadius] = useState(800);
  const [stopsWithArrivals, setStopsWithArrivals] = useState<
    StopWithArrivals[]
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch stops and their arrivals
  const fetchStopsAndArrivals = useCallback(
    async (showRefresh = false) => {
      if (!location) return;

      if (showRefresh) setIsRefreshing(true);

      const nearbyStops = getNearbyStops(location.lat, location.lng, radius);

      // Initialize with loading state
      setStopsWithArrivals(
        nearbyStops.map((stop) => ({
          ...stop,
          arrivals: [],
          isLoadingArrivals: true,
        }))
      );

      // Fetch arrivals for each stop
      const updatedStops = await Promise.all(
        nearbyStops.map(async (stop) => {
          try {
            const response = await getRealTimeArrivals(stop.stopId);
            const arrivals = ((response.data || []) as Arrival[])
              .slice(0, 3)
              .map((arrival) => {
                const route = SEPTA_ROUTES.find(
                  (r) => r.routeId === arrival.routeId
                );
                return {
                  ...arrival,
                  routeType: route?.routeType as TransitMode,
                };
              });
            return { ...stop, arrivals, isLoadingArrivals: false };
          } catch {
            return { ...stop, arrivals: [], isLoadingArrivals: false };
          }
        })
      );

      setStopsWithArrivals(updatedStops);
      setLastUpdated(new Date());
      setIsRefreshing(false);
    },
    [location, radius]
  );

  // Initial fetch
  useEffect(() => {
    if (location) {
      fetchStopsAndArrivals();
    }
  }, [location, radius, fetchStopsAndArrivals]);

  // Auto-refresh
  useInterval(() => {
    if (location && isOnline) {
      fetchStopsAndArrivals(true);
    }
  }, 30000);

  const getRouteColor = (type?: TransitMode) => {
    switch (type) {
      case "bus":
        return "bg-mode-bus";
      case "trolley":
        return "bg-mode-trolley";
      case "subway":
        return "bg-mode-subway-mfl";
      case "regional_rail":
        return "bg-mode-rail";
      case "nhsl":
        return "bg-mode-nhsl";
      default:
        return "bg-mode-bus";
    }
  };

  return (
    <>
      <Header title="Nearby Stops" showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Location Status */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div
              className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${location ? "bg-live/10" : "bg-bg-tertiary"}
            `}
            >
              {location ? (
                <Navigation2 className="w-6 h-6 text-live" />
              ) : (
                <Locate className="w-6 h-6 text-text-muted" />
              )}
            </div>
            <div className="flex-1">
              {location ? (
                <>
                  <p className="font-semibold text-text-primary">
                    Location enabled
                  </p>
                  <p className="text-sm text-text-muted">
                    Showing stops within{" "}
                    {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}
                  </p>
                </>
              ) : permission === "denied" ? (
                <>
                  <p className="font-semibold text-text-primary">
                    Location denied
                  </p>
                  <p className="text-sm text-text-muted">
                    Enable in browser settings
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-text-primary">
                    Location disabled
                  </p>
                  <p className="text-sm text-text-muted">
                    Enable to find nearby stops
                  </p>
                </>
              )}
            </div>
            {!location && permission !== "denied" && (
              <button
                onClick={requestLocation}
                disabled={isLoadingLocation}
                className="btn btn-primary"
              >
                {isLoadingLocation ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Locate className="w-4 h-4" />
                )}
                Enable
              </button>
            )}
            {location && (
              <button
                onClick={() => fetchStopsAndArrivals(true)}
                disabled={isRefreshing}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                <RefreshCw
                  className={`w-5 h-5 text-text-muted ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Radius Selector */}
        {location && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {RADIUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setRadius(option.value)}
                className={`
                  px-4 py-2 rounded-xl whitespace-nowrap font-medium text-sm transition-all
                  ${
                    radius === option.value
                      ? "bg-septa-blue text-white"
                      : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Stops List */}
        {location && (
          <>
            {lastUpdated && (
              <p className="text-xs text-text-muted">
                Updated{" "}
                {lastUpdated.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}

            {stopsWithArrivals.length === 0 ? (
              <div className="card p-8 text-center">
                <MapPin className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="font-semibold text-text-primary mb-2">
                  No stops nearby
                </p>
                <p className="text-sm text-text-secondary">
                  Try increasing the search radius
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stopsWithArrivals.map((stop) => (
                  <div key={stop.stopId} className="card overflow-hidden">
                    <Link href={`/stop/${stop.stopId}`}>
                      <div className="p-4 hover:bg-bg-highlight transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-septa-blue" />
                            <div>
                              <p className="font-semibold text-text-primary">
                                {stop.stopName}
                              </p>
                              <p className="text-sm text-text-muted">
                                {stop.distanceText} away
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-text-muted" />
                        </div>

                        {/* Arrivals */}
                        {stop.isLoadingArrivals ? (
                          <div className="mt-3 pt-3 border-t border-border-subtle">
                            <div className="h-10 skeleton rounded" />
                          </div>
                        ) : stop.arrivals.length > 0 ? (
                          <div className="mt-3 pt-3 border-t border-border-subtle">
                            {stop.arrivals.map((arrival, i) => (
                              <DepartureRowCompact
                                key={`${arrival.tripId}-${i}`}
                                arrival={arrival}
                                stopName={stop.stopName}
                                routeType={arrival.routeType}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 pt-3 border-t border-border-subtle">
                            <p className="text-sm text-text-muted text-center py-2">
                              No upcoming arrivals
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* No Location State */}
        {!location && permission !== "denied" && (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-septa-blue/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-septa-blue" />
            </div>
            <p className="font-semibold text-text-primary mb-2">
              Find stops near you
            </p>
            <p className="text-sm text-text-secondary mb-6">
              Enable location access to discover nearby SEPTA stops and see
              real-time arrivals
            </p>
            <button
              onClick={requestLocation}
              disabled={isLoadingLocation}
              className="btn btn-primary"
            >
              {isLoadingLocation ? "Getting location..." : "Enable Location"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
