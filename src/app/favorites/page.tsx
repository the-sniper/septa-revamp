"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MapPin,
  Route,
  Clock,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/Navigation";
import { useFavorites, useRecents } from "@/lib/store";
import { SEPTA_ROUTES, SAMPLE_STOPS } from "@/lib/septa-api";
import type { TransitMode } from "@/lib/types";

type Tab = "stops" | "routes" | "recent";

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("stops");
  const {
    favoriteStops,
    favoriteRoutes,
    removeFavoriteStop,
    removeFavoriteRoute,
  } = useFavorites();
  const { recentItems, clearRecents } = useRecents();

  const getRouteColor = (type: TransitMode, routeId?: string) => {
    switch (type) {
      case "bus":
        return "bg-mode-bus";
      case "trolley":
        return "bg-mode-trolley";
      case "subway":
        return routeId === "BSL" ? "bg-mode-subway-bsl" : "bg-mode-subway-mfl";
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
      <Header title="Saved" showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-bg-secondary rounded-xl">
          {(
            [
              { id: "stops", label: "Stops", count: favoriteStops.length },
              { id: "routes", label: "Routes", count: favoriteRoutes.length },
              { id: "recent", label: "Recent", count: recentItems.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all
                ${
                  activeTab === tab.id
                    ? "bg-bg-elevated text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary"
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`ml-1.5 text-xs ${
                    activeTab === tab.id ? "text-septa-blue" : ""
                  }`}
                >
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stops Tab */}
        {activeTab === "stops" && (
          <div className="space-y-3">
            {favoriteStops.length === 0 ? (
              <div className="card p-8 text-center">
                <Heart className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="font-semibold text-text-primary mb-2">
                  No favorite stops
                </p>
                <p className="text-sm text-text-secondary">
                  Tap the heart icon on any stop to save it here
                </p>
              </div>
            ) : (
              favoriteStops.map((fav) => {
                const stop = SAMPLE_STOPS.find((s) => s.stopId === fav.stopId);
                const routes =
                  stop?.routes
                    .map((id) => SEPTA_ROUTES.find((r) => r.routeId === id))
                    .filter(Boolean)
                    .slice(0, 4) || [];

                return (
                  <div key={fav.stopId} className="card overflow-hidden">
                    <Link href={`/stop/${fav.stopId}`}>
                      <div className="p-4 flex items-center gap-4 hover:bg-bg-highlight transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-septa-gold/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-6 h-6 text-septa-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary truncate">
                            {fav.stopName}
                          </p>
                          <p className="text-sm text-text-muted">
                            Stop #{fav.stopId}
                          </p>
                          {routes.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {routes.map((route) => (
                                <span
                                  key={route!.routeId}
                                  className={`${getRouteColor(
                                    route!.routeType as TransitMode,
                                    route!.routeId
                                  )} px-1.5 py-0.5 rounded text-xs font-mono font-bold text-white`}
                                >
                                  {route!.routeShortName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
                      </div>
                    </Link>
                    <button
                      onClick={() => removeFavoriteStop(fav.stopId)}
                      className="w-full py-2 border-t border-border-subtle text-sm text-urgent hover:bg-urgent/5 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Routes Tab */}
        {activeTab === "routes" && (
          <div className="space-y-3">
            {favoriteRoutes.length === 0 ? (
              <div className="card p-8 text-center">
                <Route className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="font-semibold text-text-primary mb-2">
                  No favorite routes
                </p>
                <p className="text-sm text-text-secondary">
                  Save routes you use often for quick access
                </p>
              </div>
            ) : (
              favoriteRoutes.map((fav) => {
                const route = SEPTA_ROUTES.find(
                  (r) => r.routeId === fav.routeId
                );
                if (!route) return null;

                return (
                  <div key={fav.routeId} className="card overflow-hidden">
                    <Link href={`/route/${fav.routeId}`}>
                      <div className="p-4 flex items-center gap-4 hover:bg-bg-highlight transition-colors">
                        <span
                          className={`${getRouteColor(
                            route.routeType as TransitMode,
                            route.routeId
                          )} route-badge text-white min-w-[52px] text-center`}
                        >
                          {route.routeShortName}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary">
                            {route.routeLongName}
                          </p>
                          <p className="text-sm text-text-muted truncate">
                            {route.directions
                              .map((d) => d.destinationName)
                              .join(" ↔ ")}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
                      </div>
                    </Link>
                    <button
                      onClick={() => removeFavoriteRoute(fav.routeId)}
                      className="w-full py-2 border-t border-border-subtle text-sm text-urgent hover:bg-urgent/5 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Recent Tab */}
        {activeTab === "recent" && (
          <div className="space-y-3">
            {recentItems.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={clearRecents}
                  className="text-sm text-text-muted hover:text-urgent transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {recentItems.length === 0 ? (
              <div className="card p-8 text-center">
                <Clock className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="font-semibold text-text-primary mb-2">
                  No recent items
                </p>
                <p className="text-sm text-text-secondary">
                  Stops and routes you view will appear here
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                {recentItems.map((item, index) => (
                  <Link
                    key={`${item.type}-${item.id}-${index}`}
                    href={
                      item.type === "stop"
                        ? `/stop/${item.id}`
                        : `/route/${item.id}`
                    }
                  >
                    <div
                      className={`
                      p-4 flex items-center gap-4 hover:bg-bg-highlight transition-colors
                      ${index > 0 ? "border-t border-border-subtle" : ""}
                    `}
                    >
                      <div
                        className={`
                        w-10 h-10 rounded-lg flex items-center justify-center
                        ${
                          item.type === "stop"
                            ? "bg-septa-blue/10"
                            : "bg-septa-gold/10"
                        }
                      `}
                      >
                        {item.type === "stop" ? (
                          <MapPin className="w-5 h-5 text-septa-blue" />
                        ) : (
                          <Route className="w-5 h-5 text-septa-gold" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-sm text-text-muted">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-text-muted">
                          {item.timestamp &&
                            formatTimeAgo(new Date(item.timestamp))}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
