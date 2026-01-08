'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, MapPin, Route, Clock, X, Navigation, Bus, Train } from 'lucide-react';
import { SearchInput } from './ui/Input';
import { Card } from './ui/Card';
import { ModeBadge } from './ui/Badge';
import { SearchResultsSkeleton } from './ui/Skeleton';
import { useDebounce } from '@/lib/hooks';
import { useRecents } from '@/lib/store';
import { searchStopsAndRoutes } from '@/lib/septa-api';
import type { Stop, Route as RouteType, RecentItem } from '@/lib/types';

interface SearchResult {
  type: 'stop' | 'place' | 'landmark' | 'route';
  id: string;
  name: string;
  fullName?: string;
  lat?: number;
  lon?: number;
  routeType?: string;
  routeShortName?: string;
}

interface SearchProps {
  placeholder?: string;
  autoFocus?: boolean;
  onResultSelect?: () => void;
}

export function Search({
  placeholder = 'Where do you want to go?',
  autoFocus = false,
  onResultSelect,
}: SearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const { recentItems, addRecentItem } = useRecents();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Search effect - uses both local data and API
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // First, search local routes and stops
    const localResults = searchStopsAndRoutes(debouncedQuery);
    const formattedLocal: SearchResult[] = localResults.map(item => {
      if ('stopId' in item) {
        return {
          type: 'stop' as const,
          id: item.stopId,
          name: item.stopName,
          lat: item.lat,
          lon: item.lng,
        };
      } else {
        return {
          type: 'route' as const,
          id: item.routeId,
          name: item.routeLongName,
          routeType: item.routeType,
          routeShortName: item.routeShortName,
        };
      }
    });

    // Then, search the API for locations
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(data => {
        const apiResults: SearchResult[] = (data.results || []).map((r: SearchResult) => ({
          type: r.type,
          id: r.id,
          name: r.name,
          fullName: r.fullName,
          lat: r.lat,
          lon: r.lon,
        }));

        // Combine and deduplicate
        const combined = [...formattedLocal];
        for (const apiResult of apiResults) {
          const isDuplicate = combined.some(
            r => r.name.toLowerCase() === apiResult.name.toLowerCase()
          );
          if (!isDuplicate) {
            combined.push(apiResult);
          }
        }

        setResults(combined.slice(0, 12));
      })
      .catch(() => {
        // If API fails, just use local results
        setResults(formattedLocal);
      })
      .finally(() => setIsSearching(false));
  }, [debouncedQuery]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      if (e.key === 'Enter' && results.length > 0) {
        const firstResult = results[0];
        handleSelect(firstResult);
      }
    },
    [results]
  );

  const handleSelect = (item: SearchResult) => {
    // Add to recents
    addRecentItem({
      type: item.type === 'route' ? 'route' : 'stop',
      id: item.id,
      title: item.name,
      subtitle: item.type === 'route' ? item.routeShortName : `${item.type}`,
    });

    // Navigate based on type
    if (item.type === 'route') {
      router.push(`/route/${item.id}`);
    } else if (item.type === 'stop') {
      router.push(`/stop/${item.id}`);
    } else {
      // For places and landmarks, go to trip planner with destination pre-filled
      router.push(`/trip?dest=${encodeURIComponent(item.name)}`);
    }

    setQuery('');
    setIsOpen(false);
    onResultSelect?.();
  };

  const handleRecentSelect = (recent: RecentItem) => {
    if (recent.type === 'stop') {
      router.push(`/stop/${recent.id}`);
    } else if (recent.type === 'route') {
      router.push(`/route/${recent.id}`);
    }
    setIsOpen(false);
    onResultSelect?.();
  };

  const handleTripPlannerClick = () => {
    router.push('/trip');
    setIsOpen(false);
    onResultSelect?.();
  };

  const showResults = isOpen && (query.trim() || recentItems.length > 0);

  const getResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'stop':
        return <Bus className="w-5 h-5 text-septa-blue" />;
      case 'route':
        return <Route className="w-5 h-5 text-septa-gold-dark" />;
      case 'landmark':
        return <MapPin className="w-5 h-5 text-alert-red" />;
      case 'place':
        return <MapPin className="w-5 h-5 text-septa-gold-dark" />;
      default:
        return <MapPin className="w-5 h-5 text-foreground-subtle" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <SearchInput
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        onClear={() => setQuery('')}
        isSearching={isSearching}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
      />

      {showResults && (
        <Card
          variant="elevated"
          padding="none"
          className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[70vh] overflow-y-auto animate-slide-up"
        >
          {/* Trip Planner Quick Link */}
          {!query.trim() && (
            <button
              onClick={handleTripPlannerClick}
              className="w-full flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors text-left border-b border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-live-green/10 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5 text-live-green" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Plan a Trip</p>
                <p className="text-sm text-foreground-muted">Get directions between locations</p>
              </div>
            </button>
          )}

          {query.trim() ? (
            // Search Results
            isSearching ? (
              <div className="p-4">
                <SearchResultsSkeleton />
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-border">
                {results.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors text-left"
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${item.type === 'stop' ? 'bg-septa-blue/10' : ''}
                      ${item.type === 'route' ? 'bg-septa-gold/10' : ''}
                      ${item.type === 'landmark' ? 'bg-alert-red/10' : ''}
                      ${item.type === 'place' ? 'bg-septa-gold/10' : ''}
                    `}>
                      {getResultIcon(item)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {item.type === 'route' && item.routeShortName ? (
                          <>
                            <span className="text-sm font-mono font-semibold text-foreground">
                              {item.routeShortName}
                            </span>
                            {item.routeType && <ModeBadge mode={item.routeType as any} />}
                          </>
                        ) : (
                          <span className="text-sm text-foreground-muted capitalize">
                            {item.type === 'stop' ? `Stop #${item.id}` : item.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Trip planner suggestion at bottom of results */}
                <button
                  onClick={() => {
                    router.push(`/trip?dest=${encodeURIComponent(query)}`);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors text-left bg-background-subtle/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-live-green/10 flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-5 h-5 text-live-green" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">Get directions to "{query}"</p>
                    <p className="text-sm text-foreground-muted">Open trip planner</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center">
                <SearchIcon className="w-8 h-8 text-foreground-subtle mx-auto mb-2" />
                <p className="text-foreground-muted">No results for "{query}"</p>
                <p className="text-sm text-foreground-subtle mt-1">
                  Try a stop ID, route number, or location name
                </p>
                <button
                  onClick={() => {
                    router.push(`/trip?dest=${encodeURIComponent(query)}`);
                    setIsOpen(false);
                  }}
                  className="mt-4 text-sm text-septa-blue hover:underline"
                >
                  Search in Trip Planner →
                </button>
              </div>
            )
          ) : (
            // Recent Items
            recentItems.length > 0 && (
              <div>
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wider">
                    Recent
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {recentItems.slice(0, 5).map((recent) => (
                    <button
                      key={`${recent.type}-${recent.id}`}
                      onClick={() => handleRecentSelect(recent)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-background-subtle flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-foreground-subtle" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{recent.title}</p>
                        {recent.subtitle && (
                          <p className="text-sm text-foreground-muted">{recent.subtitle}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </Card>
      )}
    </div>
  );
}

// Quick search for specific use cases
export function QuickSearch({ type }: { type: 'stop' | 'route' }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (type === 'stop') {
      // Check if it's a numeric stop ID
      if (/^\d+$/.test(query.trim())) {
        router.push(`/stop/${query.trim()}`);
      } else {
        router.push(`/search?q=${encodeURIComponent(query)}&type=stop`);
      }
    } else {
      router.push(`/route/${query.trim().toUpperCase()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')}
        placeholder={type === 'stop' ? 'Enter Stop ID...' : 'Enter route number...'}
      />
    </form>
  );
}
