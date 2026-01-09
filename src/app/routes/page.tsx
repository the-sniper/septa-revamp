"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, Train, Bus, TramFront, ChevronRight } from "lucide-react";
import { Header } from "@/components/Navigation";
import { SEPTA_ROUTES } from "@/lib/septa-api";
import type { TransitMode } from "@/lib/types";

const MODE_FILTERS: {
  id: TransitMode | "all";
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "all", label: "All" },
  { id: "subway", label: "Subway", icon: Train },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "trolley", label: "Trolley", icon: TramFront },
  { id: "regional_rail", label: "Rail", icon: Train },
];

export default function RoutesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMode, setActiveMode] = useState<TransitMode | "all">("all");

  const filteredRoutes = useMemo(() => {
    let routes = [...SEPTA_ROUTES];

    // Filter by mode
    if (activeMode !== "all") {
      routes = routes.filter((r) => r.routeType === activeMode);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      routes = routes.filter(
        (r) =>
          r.routeId.toLowerCase().includes(query) ||
          r.routeShortName.toLowerCase().includes(query) ||
          r.routeLongName.toLowerCase().includes(query)
      );
    }

    return routes;
  }, [activeMode, searchQuery]);

  // Group routes by type
  const groupedRoutes = useMemo(() => {
    if (activeMode !== "all" || searchQuery) {
      return { filtered: filteredRoutes };
    }

    return {
      subway: filteredRoutes.filter((r) => r.routeType === "subway"),
      regional_rail: filteredRoutes.filter(
        (r) => r.routeType === "regional_rail"
      ),
      trolley: filteredRoutes.filter((r) => r.routeType === "trolley"),
      bus: filteredRoutes.filter((r) => r.routeType === "bus"),
      nhsl: filteredRoutes.filter((r) => r.routeType === "nhsl"),
    };
  }, [filteredRoutes, activeMode, searchQuery]);

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

  const getModeLabel = (type: TransitMode) => {
    switch (type) {
      case "subway":
        return "Subway Lines";
      case "regional_rail":
        return "Regional Rail";
      case "trolley":
        return "Trolley Lines";
      case "bus":
        return "Bus Routes";
      case "nhsl":
        return "High Speed Line";
      default:
        return type;
    }
  };

  return (
    <>
      <Header title="Routes" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search routes..."
            className="input w-full pl-12"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-highlight rounded"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
        </div>

        {/* Mode Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {MODE_FILTERS.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap
                font-medium text-sm transition-all
                ${
                  activeMode === mode.id
                    ? "bg-septa-blue text-white"
                    : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
                }
              `}
            >
              {mode.icon && <mode.icon className="w-4 h-4" />}
              {mode.label}
            </button>
          ))}
        </div>

        {/* Routes */}
        {searchQuery || activeMode !== "all" ? (
          // Flat list when searching or filtering
          <div className="space-y-2">
            {filteredRoutes.length === 0 ? (
              <div className="card p-8 text-center">
                <Search className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="font-medium text-text-primary">No routes found</p>
                <p className="text-sm text-text-secondary mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              filteredRoutes.map((route) => (
                <Link key={route.routeId} href={`/route/${route.routeId}`}>
                  <div className="card p-4 flex items-center gap-4 hover:bg-bg-highlight transition-colors">
                    <span
                      className={`${getRouteColor(
                        route.routeType as TransitMode,
                        route.routeId
                      )} route-badge text-white min-w-[52px] text-center`}
                    >
                      {route.routeShortName}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">
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
              ))
            )}
          </div>
        ) : (
          // Grouped list
          <div className="space-y-8">
            {Object.entries(groupedRoutes).map(([type, routes]) => {
              if (!routes || routes.length === 0) return null;
              return (
                <section key={type}>
                  <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
                    {getModeLabel(type as TransitMode)}
                  </h2>
                  <div className="space-y-2">
                    {routes.map((route: (typeof SEPTA_ROUTES)[number]) => (
                      <Link
                        key={route.routeId}
                        href={`/route/${route.routeId}`}
                      >
                        <div className="card p-4 flex items-center gap-4 hover:bg-bg-highlight transition-colors">
                          <span
                            className={`${getRouteColor(
                              route.routeType as TransitMode,
                              route.routeId
                            )} route-badge text-white min-w-[52px] text-center`}
                          >
                            {route.routeShortName}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary">
                              {route.routeLongName}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
