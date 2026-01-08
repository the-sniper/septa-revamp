'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, MapPin, Route, Clock, X } from 'lucide-react';
import { SearchInput } from './ui/Input';
import { Card } from './ui/Card';
import { ModeBadge } from './ui/Badge';
import { SearchResultsSkeleton } from './ui/Skeleton';
import { useDebounce } from '@/lib/hooks';
import { useRecents } from '@/lib/store';
import { searchStopsAndRoutes, SEPTA_ROUTES } from '@/lib/septa-api';
import type { Stop, Route as RouteType, RecentItem } from '@/lib/types';

interface SearchProps {
  placeholder?: string;
  autoFocus?: boolean;
  onResultSelect?: () => void;
}

export function Search({
  placeholder = 'Search stops, routes, or enter Stop ID...',
  autoFocus = false,
  onResultSelect,
}: SearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<(Stop | RouteType)[]>([]);
  const { recentItems, addRecentItem } = useRecents();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);

  // Search effect
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchResults = searchStopsAndRoutes(debouncedQuery);
    setResults(searchResults);
    setIsSearching(false);
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

  const handleSelect = (item: Stop | RouteType) => {
    const isStop = 'stopId' in item;

    // Add to recents
    addRecentItem({
      type: isStop ? 'stop' : 'route',
      id: isStop ? item.stopId : item.routeId,
      title: isStop ? item.stopName : item.routeLongName,
      subtitle: isStop ? `Stop #${item.stopId}` : item.routeShortName,
    });

    // Navigate
    if (isStop) {
      router.push(`/stop/${item.stopId}`);
    } else {
      router.push(`/route/${item.routeId}`);
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

  const showResults = isOpen && (query.trim() || recentItems.length > 0);

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
          className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[60vh] overflow-y-auto animate-slide-up"
        >
          {query.trim() ? (
            // Search Results
            isSearching ? (
              <div className="p-4">
                <SearchResultsSkeleton />
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y divide-border">
                {results.map((item) => {
                  const isStop = 'stopId' in item;
                  return (
                    <button
                      key={isStop ? item.stopId : item.routeId}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors text-left"
                    >
                      <div
                        className={`
                          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                          ${isStop ? 'bg-septa-blue/10' : 'bg-septa-gold/10'}
                        `}
                      >
                        {isStop ? (
                          <MapPin className="w-5 h-5 text-septa-blue" />
                        ) : (
                          <Route className="w-5 h-5 text-septa-gold-dark" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {isStop ? item.stopName : item.routeLongName}
                        </p>
                        <div className="flex items-center gap-2">
                          {isStop ? (
                            <span className="text-sm text-foreground-muted font-mono">
                              #{item.stopId}
                            </span>
                          ) : (
                            <>
                              <span className="text-sm font-mono font-semibold text-foreground">
                                {item.routeShortName}
                              </span>
                              <ModeBadge mode={item.routeType} />
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center">
                <SearchIcon className="w-8 h-8 text-foreground-subtle mx-auto mb-2" />
                <p className="text-foreground-muted">No results for "{query}"</p>
                <p className="text-sm text-foreground-subtle mt-1">
                  Try a stop ID, route number, or location name
                </p>
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

