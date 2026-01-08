'use client';

import Link from 'next/link';
import { MapPin, Navigation2 } from 'lucide-react';
import type { Arrival, TransitMode } from '@/lib/types';

interface DepartureRowProps {
  arrival: Arrival;
  stopName: string;
  stopId: string;
  distance?: string;
  routeType?: TransitMode;
  onGo?: () => void;
  showStop?: boolean;
}

export function DepartureRow({
  arrival,
  stopName,
  stopId,
  distance,
  routeType = 'bus',
  onGo,
  showStop = true,
}: DepartureRowProps) {
  const minutes = arrival.minutesUntilArrival;
  const isLive = arrival.trackingStatus === 'live';
  
  // Determine urgency level
  const isNow = minutes <= 1;
  const isSoon = minutes <= 5;
  const isUrgent = minutes <= 2;

  const getCountdownClass = () => {
    if (isNow) return 'countdown-now animate-pulse-urgent';
    if (isSoon) return 'countdown-soon';
    return 'countdown-normal';
  };

  const getRouteColor = () => {
    switch (routeType) {
      case 'bus': return 'bg-mode-bus';
      case 'trolley': return 'bg-mode-trolley';
      case 'subway': 
        return arrival.routeId === 'BSL' ? 'bg-mode-subway-bsl' : 'bg-mode-subway-mfl';
      case 'regional_rail': return 'bg-mode-rail';
      case 'nhsl': return 'bg-mode-nhsl';
      default: return 'bg-mode-bus';
    }
  };

  const formatTime = (mins: number): string => {
    if (mins <= 0) return 'NOW';
    if (mins === 1) return '1';
    return String(mins);
  };

  const getTimeUnit = (mins: number): string => {
    if (mins <= 0) return '';
    return 'min';
  };

  return (
    <div className="departure-row flex items-center gap-4 p-4 rounded-2xl border border-border-subtle hover:border-border">
      {/* Route Badge */}
      <div className={`${getRouteColor()} route-badge min-w-[52px] text-center text-white`}>
        {arrival.routeShortName}
      </div>

      {/* Destination & Stop Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-primary truncate">
          {arrival.destinationName}
        </p>
        {showStop && (
          <div className="flex items-center gap-2 mt-0.5">
            <MapPin className="w-3 h-3 text-text-muted flex-shrink-0" />
            <span className="text-sm text-text-secondary truncate">{stopName}</span>
            {distance && (
              <span className="text-sm text-text-muted">· {distance}</span>
            )}
          </div>
        )}
        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="live-dot" />
            <span className="text-xs text-live font-medium">Live</span>
          </div>
        )}
      </div>

      {/* Countdown Timer */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className={`font-mono ${isNow ? 'text-countdown-md' : 'text-countdown-lg'} ${getCountdownClass()}`}>
            {formatTime(minutes)}
          </div>
          {!isNow && (
            <span className="text-sm text-text-muted">{getTimeUnit(minutes)}</span>
          )}
        </div>

        {/* GO Button */}
        {onGo && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onGo();
            }}
            className="go-button text-sm px-4 py-2"
          >
            GO
          </button>
        )}
      </div>
    </div>
  );
}

// Compact version for lists
export function DepartureRowCompact({
  arrival,
  stopName,
  routeType = 'bus',
}: {
  arrival: Arrival;
  stopName: string;
  routeType?: TransitMode;
}) {
  const minutes = arrival.minutesUntilArrival;
  const isLive = arrival.trackingStatus === 'live';
  const isNow = minutes <= 1;
  const isSoon = minutes <= 5;

  const getRouteColor = () => {
    switch (routeType) {
      case 'bus': return 'bg-mode-bus';
      case 'trolley': return 'bg-mode-trolley';
      case 'subway': 
        return arrival.routeId === 'BSL' ? 'bg-mode-subway-bsl' : 'bg-mode-subway-mfl';
      case 'regional_rail': return 'bg-mode-rail';
      case 'nhsl': return 'bg-mode-nhsl';
      default: return 'bg-mode-bus';
    }
  };

  const getTimeColor = () => {
    if (isNow) return 'text-urgent';
    if (isSoon) return 'text-arriving';
    return 'text-text-primary';
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border-subtle last:border-0">
      <div className={`${getRouteColor()} route-badge text-xs text-white min-w-[40px] text-center`}>
        {arrival.routeShortName}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{arrival.destinationName}</p>
      </div>
      <div className="flex items-center gap-2">
        {isLive && <span className="live-dot w-[6px] h-[6px]" />}
        <span className={`font-mono font-bold ${getTimeColor()}`}>
          {minutes <= 0 ? 'NOW' : `${minutes}m`}
        </span>
      </div>
    </div>
  );
}

// Loading skeleton
export function DepartureRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-border-subtle">
      <div className="w-[52px] h-[32px] rounded-md skeleton" />
      <div className="flex-1 space-y-2">
        <div className="w-3/4 h-5 rounded skeleton" />
        <div className="w-1/2 h-4 rounded skeleton" />
      </div>
      <div className="w-16 h-12 rounded skeleton" />
    </div>
  );
}

// Group departures by stop
interface DepartureGroup {
  stopId: string;
  stopName: string;
  distance?: string;
  arrivals: (Arrival & { routeType?: TransitMode })[];
}

export function DepartureGroupCard({ group }: { group: DepartureGroup }) {
  const topArrivals = group.arrivals.slice(0, 3);

  return (
    <Link href={`/stop/${group.stopId}`}>
      <div className="card p-4 hover:bg-bg-highlight transition-colors">
        {/* Stop Header */}
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-septa-blue" />
          <span className="font-semibold text-text-primary truncate">{group.stopName}</span>
          {group.distance && (
            <span className="text-sm text-text-muted ml-auto">{group.distance}</span>
          )}
        </div>

        {/* Arrivals */}
        <div className="space-y-0">
          {topArrivals.map((arrival, i) => (
            <DepartureRowCompact
              key={`${arrival.tripId}-${i}`}
              arrival={arrival}
              stopName={group.stopName}
              routeType={arrival.routeType}
            />
          ))}
        </div>

        {group.arrivals.length > 3 && (
          <p className="text-xs text-text-muted mt-2 text-center">
            +{group.arrivals.length - 3} more arrivals
          </p>
        )}
      </div>
    </Link>
  );
}

