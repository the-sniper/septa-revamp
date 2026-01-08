'use client';

import { useState } from 'react';
import { Heart, MapPin, Route, Trash2 } from 'lucide-react';
import { Header } from '@/components/Navigation';
import { StopCard } from '@/components/StopCard';
import { RouteCard } from '@/components/RouteCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFavorites, useRecents } from '@/lib/store';
import { SAMPLE_STOPS, SEPTA_ROUTES } from '@/lib/septa-api';

type TabType = 'stops' | 'routes' | 'recents';

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('stops');
  const {
    favoriteStops,
    favoriteRoutes,
    removeFavoriteStop,
    removeFavoriteRoute,
  } = useFavorites();
  const { recentItems, clearRecents } = useRecents();

  const tabs: { value: TabType; label: string; count: number }[] = [
    { value: 'stops', label: 'Stops', count: favoriteStops.length },
    { value: 'routes', label: 'Routes', count: favoriteRoutes.length },
    { value: 'recents', label: 'Recent', count: recentItems.length },
  ];

  // Get full stop/route data
  const favoriteStopData = favoriteStops
    .map((fav) => SAMPLE_STOPS.find((s) => s.stopId === fav.stopId))
    .filter(Boolean);

  const favoriteRouteData = favoriteRoutes
    .map((fav) => SEPTA_ROUTES.find((r) => r.routeId === fav.routeId))
    .filter(Boolean);

  return (
    <>
      <Header title="Saved" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex bg-background-elevated rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.value
                  ? 'bg-septa-blue text-white'
                  : 'text-foreground-muted hover:text-foreground'
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`
                  ml-1.5 px-1.5 py-0.5 rounded-full text-xs
                  ${activeTab === tab.value
                    ? 'bg-white/20'
                    : 'bg-background-subtle'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'stops' && (
          <div>
            {favoriteStopData.length === 0 ? (
              <EmptyState
                icon={<Heart className="w-8 h-8" />}
                title="No favorite stops"
                description="Tap the heart icon on any stop to save it here for quick access"
              />
            ) : (
              <div className="space-y-3">
                {favoriteStopData.map((stop) => (
                  <div key={stop!.stopId} className="relative group">
                    <StopCard stop={stop!} />
                    <button
                      onClick={() => removeFavoriteStop(stop!.stopId)}
                      className="absolute top-3 right-12 p-2 rounded-lg bg-background-elevated opacity-0 group-hover:opacity-100 transition-opacity hover:bg-alert-red/10"
                      aria-label="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4 text-alert-red" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'routes' && (
          <div>
            {favoriteRouteData.length === 0 ? (
              <EmptyState
                icon={<Heart className="w-8 h-8" />}
                title="No favorite routes"
                description="Tap the heart icon on any route to save it here for quick access"
              />
            ) : (
              <div className="space-y-3">
                {favoriteRouteData.map((route) => (
                  <div key={route!.routeId} className="relative group">
                    <RouteCard route={route!} showDirections />
                    <button
                      onClick={() => removeFavoriteRoute(route!.routeId)}
                      className="absolute top-3 right-12 p-2 rounded-lg bg-background-elevated opacity-0 group-hover:opacity-100 transition-opacity hover:bg-alert-red/10"
                      aria-label="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4 text-alert-red" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recents' && (
          <div>
            {recentItems.length === 0 ? (
              <EmptyState
                icon={<Route className="w-8 h-8" />}
                title="No recent activity"
                description="Your recently viewed stops and routes will appear here"
              />
            ) : (
              <>
                <div className="flex justify-end mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecents}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Clear all
                  </Button>
                </div>
                <Card variant="outlined" padding="none">
                  <div className="divide-y divide-border">
                    {recentItems.map((item) => {
                      const isStop = item.type === 'stop';
                      const href = isStop ? `/stop/${item.id}` : `/route/${item.id}`;

                      return (
                        <a
                          key={`${item.type}-${item.id}`}
                          href={href}
                          className="flex items-center gap-3 p-3 hover:bg-background-subtle transition-colors"
                        >
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center
                            ${isStop ? 'bg-septa-blue/10' : 'bg-septa-gold/10'}
                          `}>
                            {isStop ? (
                              <MapPin className="w-5 h-5 text-septa-blue" />
                            ) : (
                              <Route className="w-5 h-5 text-septa-gold-dark" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-sm text-foreground-muted">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-foreground-subtle">
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Tips */}
        {(activeTab === 'stops' && favoriteStops.length === 0) ||
        (activeTab === 'routes' && favoriteRoutes.length === 0) ? (
          <Card variant="outlined" className="mt-6">
            <h3 className="text-sm font-medium text-foreground mb-2">💡 Quick tip</h3>
            <p className="text-sm text-foreground-muted">
              {activeTab === 'stops'
                ? 'Save your home and work stops to quickly check arrivals during your commute.'
                : 'Save your regular routes to monitor service alerts and find stops faster.'}
            </p>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

