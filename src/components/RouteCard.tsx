'use client';

import Link from 'next/link';
import { Heart, ChevronRight, ArrowRight } from 'lucide-react';
import { Card } from './ui/Card';
import { IconButton } from './ui/Button';
import { ModeBadge } from './ui/Badge';
import { useFavorites } from '@/lib/store';
import type { Route, TransitMode } from '@/lib/types';

interface RouteCardProps {
  route: Route;
  showDirections?: boolean;
  compact?: boolean;
}

const modeIcons: Record<TransitMode, string> = {
  bus: '🚌',
  trolley: '🚋',
  subway: '🚇',
  regional_rail: '🚆',
  nhsl: '🚈',
};

const modeColors: Record<TransitMode, string> = {
  bus: 'bg-[#004F9F]',
  trolley: 'bg-[#00A550]',
  subway: 'bg-[#0066CC]',
  regional_rail: 'bg-[#91456C]',
  nhsl: 'bg-[#9B2D9B]',
};

export function RouteCard({ route, showDirections = true, compact = false }: RouteCardProps) {
  const { isFavoriteRoute, addFavoriteRoute, removeFavoriteRoute } = useFavorites();
  const isFavorite = isFavoriteRoute(route.routeId);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFavorite) {
      removeFavoriteRoute(route.routeId);
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

  if (compact) {
    return (
      <Link href={`/route/${route.routeId}`}>
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-background-subtle transition-colors group">
          <div className="flex items-center gap-3">
            <div
              className={`
                w-12 h-10 rounded-lg flex items-center justify-center
                ${modeColors[route.routeType]} text-white font-mono font-bold text-lg
              `}
            >
              {route.routeShortName}
            </div>
            <div>
              <p className="font-medium text-foreground group-hover:text-septa-blue transition-colors">
                {route.routeLongName}
              </p>
              <p className="text-sm text-foreground-muted">
                {route.directions[0]?.destinationName}
                {route.directions[1] && (
                  <>
                    {' '}↔ {route.directions[1].destinationName}
                  </>
                )}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-foreground-subtle" />
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/route/${route.routeId}`}>
      <Card interactive variant="elevated" className="group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`
                w-14 h-12 rounded-lg flex items-center justify-center
                ${modeColors[route.routeType]} text-white font-mono font-bold text-xl
              `}
            >
              {route.routeShortName}
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-septa-blue transition-colors">
                {route.routeLongName}
              </h3>
              <ModeBadge mode={route.routeType} />
            </div>
          </div>
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

        {showDirections && route.directions.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            {route.directions.map((direction) => (
              <div
                key={direction.directionId}
                className="flex items-center gap-2 text-sm text-foreground-muted"
              >
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-foreground">
                  {direction.directionName}
                </span>
                <span className="text-foreground-subtle">→</span>
                <span>{direction.destinationName}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}

interface RouteListProps {
  routes: Route[];
  showDirections?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}

export function RouteList({
  routes,
  showDirections = false,
  compact = false,
  emptyMessage,
}: RouteListProps) {
  if (routes.length === 0 && emptyMessage) {
    return (
      <p className="text-center text-foreground-muted py-8">{emptyMessage}</p>
    );
  }

  if (compact) {
    return (
      <div className="divide-y divide-border">
        {routes.map((route) => (
          <RouteCard key={route.routeId} route={route} compact showDirections={false} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {routes.map((route) => (
        <RouteCard key={route.routeId} route={route} showDirections={showDirections} />
      ))}
    </div>
  );
}

interface RouteChipProps {
  routeId: string;
  routeType?: TransitMode;
  size?: 'sm' | 'md';
}

export function RouteChip({ routeId, routeType = 'bus', size = 'sm' }: RouteChipProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <Link href={`/route/${routeId}`}>
      <span
        className={`
          inline-flex items-center font-mono font-bold rounded
          ${modeColors[routeType]} text-white
          ${sizeClasses[size]}
          hover:opacity-90 transition-opacity
        `}
      >
        {routeId}
      </span>
    </Link>
  );
}

