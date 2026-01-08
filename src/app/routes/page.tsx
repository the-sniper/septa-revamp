'use client';

import { useState, useMemo } from 'react';
import { Route, Train, Tram, Bus } from 'lucide-react';
import { Header } from '@/components/Navigation';
import { RouteList } from '@/components/RouteCard';
import { SearchInput } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useDebounce } from '@/lib/hooks';
import { SEPTA_ROUTES, getRoutesByType } from '@/lib/septa-api';
import type { TransitMode, Route as RouteType } from '@/lib/types';

type FilterMode = 'all' | TransitMode;

const modeFilters: { value: FilterMode; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Route className="w-4 h-4" /> },
  { value: 'bus', label: 'Bus', icon: <Bus className="w-4 h-4" /> },
  { value: 'trolley', label: 'Trolley', icon: <Tram className="w-4 h-4" /> },
  { value: 'subway', label: 'Subway', icon: <Train className="w-4 h-4" /> },
  { value: 'regional_rail', label: 'Rail', icon: <Train className="w-4 h-4" /> },
];

export default function RoutesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<FilterMode>('all');
  const debouncedQuery = useDebounce(searchQuery, 200);

  const filteredRoutes = useMemo(() => {
    let routes: RouteType[] = selectedMode === 'all' 
      ? SEPTA_ROUTES 
      : getRoutesByType(selectedMode);

    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      routes = routes.filter(
        (route) =>
          route.routeId.toLowerCase().includes(query) ||
          route.routeShortName.toLowerCase().includes(query) ||
          route.routeLongName.toLowerCase().includes(query)
      );
    }

    return routes;
  }, [selectedMode, debouncedQuery]);

  // Group routes by type for "All" view
  const groupedRoutes = useMemo(() => {
    if (selectedMode !== 'all' || debouncedQuery) {
      return null;
    }

    return {
      subway: getRoutesByType('subway'),
      regional_rail: getRoutesByType('regional_rail'),
      trolley: getRoutesByType('trolley'),
      bus: getRoutesByType('bus').slice(0, 10), // Show first 10 bus routes
      nhsl: getRoutesByType('nhsl'),
    };
  }, [selectedMode, debouncedQuery]);

  return (
    <>
      <Header title="Routes" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          placeholder="Search routes..."
        />

        {/* Mode Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {modeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedMode(filter.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                text-sm font-medium transition-colors flex-shrink-0
                ${selectedMode === filter.value
                  ? 'bg-septa-blue text-white'
                  : 'bg-background-elevated text-foreground-muted hover:bg-background-subtle'
                }
              `}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {groupedRoutes && !debouncedQuery ? (
          // Grouped view
          <div className="space-y-8">
            {/* Subway */}
            {groupedRoutes.subway.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Train className="w-5 h-5 text-[#0066CC]" />
                  Subway
                </h2>
                <RouteList routes={groupedRoutes.subway} showDirections />
              </section>
            )}

            {/* Regional Rail */}
            {groupedRoutes.regional_rail.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Train className="w-5 h-5 text-[#91456C]" />
                  Regional Rail
                </h2>
                <RouteList routes={groupedRoutes.regional_rail} compact />
              </section>
            )}

            {/* NHSL */}
            {groupedRoutes.nhsl.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Train className="w-5 h-5 text-[#9B2D9B]" />
                  Norristown High Speed Line
                </h2>
                <RouteList routes={groupedRoutes.nhsl} showDirections />
              </section>
            )}

            {/* Trolley */}
            {groupedRoutes.trolley.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Tram className="w-5 h-5 text-[#00A550]" />
                  Trolley
                </h2>
                <RouteList routes={groupedRoutes.trolley} compact />
              </section>
            )}

            {/* Bus */}
            {groupedRoutes.bus.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Bus className="w-5 h-5 text-[#004F9F]" />
                  Bus Routes
                </h2>
                <RouteList routes={groupedRoutes.bus} compact />
                <button
                  onClick={() => setSelectedMode('bus')}
                  className="w-full mt-3 py-2 text-sm text-septa-blue hover:underline"
                >
                  View all {getRoutesByType('bus').length} bus routes →
                </button>
              </section>
            )}
          </div>
        ) : (
          // Filtered/Search view
          <div>
            <p className="text-sm text-foreground-muted mb-4">
              {filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''} found
            </p>
            {filteredRoutes.length > 0 ? (
              <RouteList routes={filteredRoutes} compact />
            ) : (
              <Card variant="outlined" className="text-center py-8">
                <Route className="w-8 h-8 text-foreground-subtle mx-auto mb-2" />
                <p className="text-foreground-muted">No routes found</p>
                <p className="text-sm text-foreground-subtle mt-1">
                  Try a different search term
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}

