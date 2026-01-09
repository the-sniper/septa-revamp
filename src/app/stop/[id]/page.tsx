"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Heart,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Share2,
} from "lucide-react";
import { Header } from "@/components/Navigation";
import {
  DepartureRowCompact,
  DepartureRowSkeleton,
} from "@/components/DepartureRow";
import { useFavorites, useRecents } from "@/lib/store";
import { useCopyToClipboard, useInterval, useOnlineStatus } from "@/lib/hooks";
import {
  getStopById,
  getRealTimeArrivals,
  getRouteAlerts,
  SEPTA_ROUTES,
} from "@/lib/septa-api";
import type { Stop, Arrival, Alert, TransitMode } from "@/lib/types";

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

  const { isFavoriteStop, addFavoriteStop, removeFavoriteStop } =
    useFavorites();
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
        type: "stop",
        id: stopData.stopId,
        title: stopData.stopName,
        subtitle: `Stop #${stopData.stopId}`,
      });
    }
  }, [stopId, addRecentItem]);

  // Fetch arrivals
  const fetchArrivals = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const response = await getRealTimeArrivals(stopId);

        if (response.error && !response.data) {
          setError(response.error);
        } else {
          setArrivals(response.data || []);
          setError(null);
          setLastUpdated(new Date());
        }
      } catch {
        setError("Failed to fetch arrivals");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [stopId]
  );

  useEffect(() => {
    fetchArrivals();
  }, [fetchArrivals]);

  useInterval(() => {
    if (isOnline) {
      fetchArrivals(false);
    }
  }, 30000);

  // Fetch alerts
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
      const uniqueAlerts = allAlerts.filter(
        (alert, index, self) =>
          self.findIndex((a) => a.alertId === alert.alertId) === index
      );
      setAlerts(
        uniqueAlerts.filter(
          (a) => a.severity === "severe" || a.severity === "warning"
        )
      );
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

  const handleShare = async () => {
    if (navigator.share && stop) {
      await navigator.share({
        title: stop.stopName,
        text: `SEPTA Stop #${stop.stopId}`,
        url: window.location.href,
      });
    } else {
      copy(window.location.href);
    }
  };

  if (!stop) {
    return (
      <>
        <Header showBack title="Stop" />
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <MapPin className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Stop not found
            </h2>
            <p className="text-sm text-text-secondary">
              We couldn&apos;t find a stop with ID {stopId}
            </p>
          </div>
        </div>
      </>
    );
  }

  const stopRoutes = stop.routes
    .map((routeId) => SEPTA_ROUTES.find((r) => r.routeId === routeId))
    .filter(Boolean);

  const getRouteColor = (type: TransitMode) => {
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
      <Header showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stop Header */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-text-primary leading-tight">
                {stop.stopName}
              </h1>
              <button
                onClick={() => copy(stopId)}
                className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-bg-tertiary rounded-lg hover:bg-bg-highlight transition-colors"
              >
                <span className="text-sm text-text-muted">Stop</span>
                <span className="font-mono font-semibold text-text-primary">
                  #{stop.stopId}
                </span>
                {copied ? (
                  <Check className="w-4 h-4 text-live" />
                ) : (
                  <Copy className="w-4 h-4 text-text-muted" />
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="p-3 rounded-xl bg-bg-tertiary hover:bg-bg-highlight transition-colors"
                aria-label="Share stop"
              >
                <Share2 className="w-5 h-5 text-text-secondary" />
              </button>
              <button
                onClick={handleFavorite}
                className={`p-3 rounded-xl transition-colors ${
                  isFavorite
                    ? "bg-urgent/10 text-urgent"
                    : "bg-bg-tertiary hover:bg-bg-highlight text-text-secondary"
                }`}
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                <Heart
                  className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Route Badges */}
          <div className="flex flex-wrap gap-2">
            {stopRoutes.map((route) => (
              <Link key={route!.routeId} href={`/route/${route!.routeId}`}>
                <span
                  className={`${getRouteColor(
                    route!.routeType as TransitMode
                  )} route-badge text-white hover:scale-105 transition-transform inline-block`}
                >
                  {route!.routeShortName}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <Link href="/alerts">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-urgent/10 border border-urgent/20">
              <AlertTriangle className="w-5 h-5 text-urgent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-urgent">
                  {alerts.length} alert{alerts.length > 1 ? "s" : ""} affecting
                  this stop
                </p>
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {alerts[0]?.title}
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Arrivals */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">Arriving</h2>
              {lastUpdated && (
                <span className="text-xs text-text-muted">
                  {lastUpdated.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <button
              onClick={() => fetchArrivals(false)}
              className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 text-text-muted ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>

          <div className="card">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <DepartureRowSkeleton />
                <DepartureRowSkeleton />
                <DepartureRowSkeleton />
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-delayed mx-auto mb-3" />
                <p className="text-sm text-text-secondary">{error}</p>
                <button
                  onClick={() => fetchArrivals()}
                  className="btn btn-secondary mt-4"
                >
                  Try again
                </button>
              </div>
            ) : arrivals.length === 0 ? (
              <div className="p-8 text-center">
                <MapPin className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="font-medium text-text-primary">
                  No upcoming arrivals
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Check back later or view the schedule
                </p>
              </div>
            ) : (
              <div className="p-4">
                {arrivals.slice(0, 10).map((arrival, index) => {
                  const route = SEPTA_ROUTES.find(
                    (r) => r.routeId === arrival.routeId
                  );
                  return (
                    <DepartureRowCompact
                      key={`${arrival.tripId}-${index}`}
                      arrival={arrival}
                      stopName={stop.stopName}
                      routeType={route?.routeType as TransitMode}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Tracking Legend */}
          {arrivals.length > 0 && (
            <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <span className="live-dot w-[6px] h-[6px]" />
                <span>Live GPS</span>
              </div>
              <span>•</span>
              <span>Times may vary based on traffic</span>
            </div>
          )}
        </section>

        {/* Routes at Stop */}
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-4">
            Routes here
          </h2>
          <div className="space-y-2">
            {stopRoutes.map((route) => (
              <Link key={route!.routeId} href={`/route/${route!.routeId}`}>
                <div className="card p-4 flex items-center gap-4 hover:bg-bg-highlight transition-colors">
                  <span
                    className={`${getRouteColor(
                      route!.routeType as TransitMode
                    )} route-badge text-white min-w-[52px] text-center`}
                  >
                    {route!.routeShortName}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary">
                      {route!.routeLongName}
                    </p>
                    <p className="text-sm text-text-muted truncate">
                      {route!.directions
                        .map((d) => d.destinationName)
                        .join(" ↔ ")}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <button
            onClick={() =>
              window.open(
                `https://www.google.com/maps?q=${stop.lat},${stop.lng}`,
                "_blank"
              )
            }
            className="btn btn-secondary flex-1"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Maps
          </button>
          <button
            onClick={() => copy(stopId)}
            className="btn btn-secondary flex-1"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Copy ID"}
          </button>
        </div>
      </div>
    </>
  );
}
