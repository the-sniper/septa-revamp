"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MapPin,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
  Train,
  Bus,
  TramFront,
} from "lucide-react";
import { Header } from "@/components/Navigation";
import { useFavorites, useRecents } from "@/lib/store";
import {
  getRouteById,
  getRouteAlerts,
  SAMPLE_STOPS,
  getTransitView,
} from "@/lib/septa-api";
import type { Route, Alert, TransitMode } from "@/lib/types";

export default function RoutePage() {
  const params = useParams();
  const routeId = params.id as string;

  const [route, setRoute] = useState<Route | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<number>(0);
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);

  const { isFavoriteRoute, addFavoriteRoute, removeFavoriteRoute } =
    useFavorites();
  const { addRecentItem } = useRecents();

  const isFavorite = route ? isFavoriteRoute(route.routeId) : false;

  // Fetch route data
  useEffect(() => {
    const routeData = getRouteById(routeId);
    if (routeData) {
      setRoute(routeData as Route);
      addRecentItem({
        type: "route",
        id: routeData.routeId,
        title: routeData.routeLongName,
        subtitle: routeData.routeShortName,
      });
    }
  }, [routeId, addRecentItem]);

  // Fetch alerts
  useEffect(() => {
    async function fetchAlerts() {
      const response = await getRouteAlerts(routeId);
      if (response.data) {
        setAlerts(response.data);
      }
    }
    fetchAlerts();
  }, [routeId]);

  // Fetch vehicle count
  useEffect(() => {
    async function fetchVehicles() {
      const response = await getTransitView(routeId);
      if (response.data && Array.isArray(response.data)) {
        const routeData = (response.data as any[])?.find(
          (r: any) => r.route === routeId
        );
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

  const getRouteColor = (type: TransitMode, id?: string) => {
    switch (type) {
      case "bus":
        return "bg-mode-bus";
      case "trolley":
        return "bg-mode-trolley";
      case "subway":
        return id === "BSL" ? "bg-mode-subway-bsl" : "bg-mode-subway-mfl";
      case "regional_rail":
        return "bg-mode-rail";
      case "nhsl":
        return "bg-mode-nhsl";
      default:
        return "bg-mode-bus";
    }
  };

  const getModeIcon = (type: TransitMode) => {
    switch (type) {
      case "bus":
        return Bus;
      case "trolley":
        return TramFront;
      case "subway":
        return Train;
      case "regional_rail":
        return Train;
      case "nhsl":
        return Train;
      default:
        return Bus;
    }
  };

  const getModeLabel = (type: TransitMode) => {
    switch (type) {
      case "bus":
        return "Bus";
      case "trolley":
        return "Trolley";
      case "subway":
        return "Subway";
      case "regional_rail":
        return "Regional Rail";
      case "nhsl":
        return "High Speed Line";
      default:
        return type;
    }
  };

  if (!route) {
    return (
      <>
        <Header showBack title="Route" />
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="card p-8 text-center">
            <Bus className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Route not found
            </h2>
            <p className="text-sm text-text-secondary">
              We couldn&apos;t find route {routeId}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Get stops for this route
  const routeStops = SAMPLE_STOPS.filter((s) =>
    s.routes.includes(route.routeId)
  );
  const ModeIcon = getModeIcon(route.routeType);

  return (
    <>
      <Header showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Route Header */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div
                className={`${getRouteColor(
                  route.routeType,
                  route.routeId
                )} w-16 h-14 rounded-xl flex items-center justify-center`}
              >
                <span className="text-white font-mono font-bold text-2xl">
                  {route.routeShortName}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary">
                  {route.routeLongName}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <ModeIcon className="w-4 h-4" />
                    <span>{getModeLabel(route.routeType)}</span>
                  </div>
                  {vehicleCount !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="live-dot" />
                      <span className="text-sm text-live font-medium">
                        {vehicleCount} active
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
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

          {/* Terminals */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-text-secondary">
              {route.directions[0]?.destinationName}
            </span>
            <ArrowRight className="w-4 h-4 text-text-muted" />
            <span className="text-text-secondary">
              {route.directions[1]?.destinationName ||
                route.directions[0]?.destinationName}
            </span>
          </div>
        </div>

        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <Link href="/alerts">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-urgent/10 border border-urgent/20">
              <AlertTriangle className="w-5 h-5 text-urgent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-urgent">
                  {alerts.length} alert{alerts.length > 1 ? "s" : ""} on this
                  route
                </p>
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {alerts[0]?.title}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-urgent flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* Direction Selector */}
        {route.directions.length > 1 && (
          <section>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
              Direction
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {route.directions.map((direction, index) => (
                <button
                  key={direction.directionId}
                  onClick={() => setSelectedDirection(index)}
                  className={`
                    p-4 rounded-xl text-left transition-all
                    ${
                      selectedDirection === index
                        ? "bg-septa-gold/10 border-2 border-septa-gold"
                        : "bg-bg-secondary border-2 border-transparent hover:bg-bg-tertiary"
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight
                      className={`w-4 h-4 ${
                        selectedDirection === index
                          ? "text-septa-gold"
                          : "text-text-muted"
                      }`}
                    />
                    <span className="text-sm text-text-muted">
                      {direction.directionName}
                    </span>
                  </div>
                  <p className="font-semibold text-text-primary">
                    To {direction.destinationName}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Stops on this Route */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
              Stops
            </h2>
            <span className="text-sm text-text-muted">
              {routeStops.length} stop{routeStops.length !== 1 ? "s" : ""}
            </span>
          </div>

          {routeStops.length > 0 ? (
            <div className="card overflow-hidden">
              {routeStops.map((stop, index) => (
                <Link key={stop.stopId} href={`/stop/${stop.stopId}`}>
                  <div
                    className={`
                    flex items-center gap-3 p-4 hover:bg-bg-highlight transition-colors
                    ${index > 0 ? "border-t border-border-subtle" : ""}
                  `}
                  >
                    <div className="w-8 h-8 rounded-full bg-septa-blue/10 flex items-center justify-center text-sm font-mono font-semibold text-septa-blue">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {stop.stopName}
                      </p>
                      <p className="text-sm text-text-muted font-mono">
                        #{stop.stopId}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <MapPin className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">
                Stop information not available
              </p>
            </div>
          )}
        </section>

        {/* Route Info */}
        <section>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Route Info
          </h2>
          <div className="card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Type</span>
              <div className="flex items-center gap-2">
                <ModeIcon className="w-4 h-4 text-text-secondary" />
                <span className="text-text-primary font-medium">
                  {getModeLabel(route.routeType)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Route</span>
              <span className="font-mono font-bold text-text-primary">
                {route.routeShortName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Terminals</span>
              <span className="text-sm text-text-primary text-right max-w-[200px] truncate">
                {route.directions.map((d) => d.destinationName).join(" ↔ ")}
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
