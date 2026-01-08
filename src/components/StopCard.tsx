'use client';

import Link from 'next/link';
import { Heart, Copy, MapPin, Check, ChevronRight } from 'lucide-react';
import { Card } from './ui/Card';
import { IconButton } from './ui/Button';
import { ModeBadge } from './ui/Badge';
import { NextArrivalBadge } from './ArrivalTime';
import { useFavorites } from '@/lib/store';
import { useCopyToClipboard } from '@/lib/hooks';
import type { Stop, NearbyStop, Arrival } from '@/lib/types';
import { SEPTA_ROUTES } from '@/lib/septa-api';

interface StopCardProps {
  stop: Stop | NearbyStop;
  nextArrival?: Arrival | null;
  isLoadingArrival?: boolean;
  showDistance?: boolean;
  compact?: boolean;
}

export function StopCard({
  stop,
  nextArrival,
  isLoadingArrival,
  showDistance = false,
  compact = false,
}: StopCardProps) {
  const { isFavoriteStop, addFavoriteStop, removeFavoriteStop } = useFavorites();
  const { copied, copy } = useCopyToClipboard();
  const isFavorite = isFavoriteStop(stop.stopId);
  const distance = 'distanceText' in stop ? stop.distanceText : null;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFavorite) {
      removeFavoriteStop(stop.stopId);
    } else {
      addFavoriteStop({
        stopId: stop.stopId,
        stopName: stop.stopName,
        addedAt: new Date().toISOString(),
      });
    }
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copy(stop.stopId);
  };

  // Get unique route types for this stop
  const routeTypes = [...new Set(
    stop.routes
      .map((routeId) => SEPTA_ROUTES.find((r) => r.routeId === routeId)?.routeType)
      .filter(Boolean)
  )];

  if (compact) {
    return (
      <Link href={`/stop/${stop.stopId}`}>
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-background-subtle transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-septa-blue/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-septa-blue" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{stop.stopName}</p>
              <div className="flex items-center gap-2 text-sm text-foreground-muted">
                <span className="font-mono text-xs bg-background-subtle px-1.5 py-0.5 rounded">
                  #{stop.stopId}
                </span>
                {showDistance && distance && (
                  <span>{distance}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NextArrivalBadge arrival={nextArrival ?? null} isLoading={isLoadingArrival} />
            <ChevronRight className="w-5 h-5 text-foreground-subtle" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/stop/${stop.stopId}`}>
      <Card interactive variant="elevated" className="group">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate group-hover:text-septa-blue transition-colors">
              {stop.stopName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm text-foreground-muted bg-background-subtle px-2 py-0.5 rounded">
                Stop #{stop.stopId}
              </span>
              {showDistance && distance && (
                <span className="text-sm text-foreground-muted flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {distance}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <IconButton
              onClick={handleCopyClick}
              aria-label={copied ? 'Copied!' : 'Copy stop ID'}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? (
                <Check className="w-4 h-4 text-live-green" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </IconButton>
            <IconButton
              onClick={handleFavoriteClick}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isFavorite ? 'fill-alert-red text-alert-red' : 'text-foreground-subtle'
                }`}
              />
            </IconButton>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {routeTypes.slice(0, 3).map((type) => (
              <ModeBadge key={type} mode={type!} />
            ))}
            {stop.routes.length > 0 && (
              <span className="text-xs text-foreground-muted self-center ml-1">
                {stop.routes.length} route{stop.routes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <NextArrivalBadge arrival={nextArrival ?? null} isLoading={isLoadingArrival} />
        </div>
      </Card>
    </Link>
  );
}

interface StopListProps {
  stops: (Stop | NearbyStop)[];
  showDistance?: boolean;
  emptyMessage?: string;
}

export function StopList({ stops, showDistance = false, emptyMessage }: StopListProps) {
  if (stops.length === 0 && emptyMessage) {
    return (
      <p className="text-center text-foreground-muted py-8">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3">
      {stops.map((stop) => (
        <StopCard key={stop.stopId} stop={stop} showDistance={showDistance} />
      ))}
    </div>
  );
}

