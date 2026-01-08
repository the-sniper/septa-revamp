'use client';

import { TrackingBadge } from './ui/Badge';
import type { Arrival, TrackingStatus } from '@/lib/types';

interface ArrivalTimeProps {
  arrival: Arrival;
  showRoute?: boolean;
  compact?: boolean;
}

export function ArrivalTime({ arrival, showRoute = true, compact = false }: ArrivalTimeProps) {
  const formatMinutes = (minutes: number): string => {
    if (minutes <= 0) return 'Now';
    if (minutes === 1) return '1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTimeColor = (minutes: number, status: TrackingStatus): string => {
    if (status === 'no_data') return 'text-foreground-subtle';
    if (minutes <= 2) return 'text-alert-red';
    if (minutes <= 5) return 'text-estimated-amber';
    return 'text-foreground';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {showRoute && (
          <span className="font-mono text-sm font-semibold bg-septa-blue text-white px-2 py-0.5 rounded">
            {arrival.routeShortName}
          </span>
        )}
        <span className={`font-mono text-lg font-bold ${getTimeColor(arrival.minutesUntilArrival, arrival.trackingStatus)}`}>
          {formatMinutes(arrival.minutesUntilArrival)}
        </span>
        {arrival.trackingStatus === 'live' && (
          <span className="w-2 h-2 rounded-full bg-live-green animate-pulse-live" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        {showRoute && (
          <div className="flex-shrink-0">
            <span className="font-mono text-base font-bold bg-septa-blue text-white px-3 py-1.5 rounded-lg">
              {arrival.routeShortName}
            </span>
          </div>
        )}
        <div>
          <p className="font-medium text-foreground">
            {arrival.destinationName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <TrackingBadge status={arrival.trackingStatus} />
            {arrival.isDelayed && arrival.delayMinutes && arrival.delayMinutes > 0 && (
              <span className="text-xs text-alert-red">
                +{arrival.delayMinutes} min late
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-mono text-2xl font-bold ${getTimeColor(arrival.minutesUntilArrival, arrival.trackingStatus)}`}>
          {formatMinutes(arrival.minutesUntilArrival)}
        </p>
        {arrival.lastUpdated && arrival.trackingStatus === 'live' && (
          <p className="text-xs text-foreground-subtle mt-0.5">
            Updated {formatLastUpdated(arrival.lastUpdated)}
          </p>
        )}
      </div>
    </div>
  );
}

function formatLastUpdated(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 10) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface ArrivalListProps {
  arrivals: Arrival[];
  showRoute?: boolean;
  maxItems?: number;
}

export function ArrivalList({ arrivals, showRoute = true, maxItems = 5 }: ArrivalListProps) {
  const displayArrivals = arrivals.slice(0, maxItems);

  if (displayArrivals.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-border">
      {displayArrivals.map((arrival, index) => (
        <ArrivalTime
          key={`${arrival.tripId}-${index}`}
          arrival={arrival}
          showRoute={showRoute}
        />
      ))}
    </div>
  );
}

interface NextArrivalBadgeProps {
  arrival: Arrival | null;
  isLoading?: boolean;
}

export function NextArrivalBadge({ arrival, isLoading }: NextArrivalBadgeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-6 bg-background-subtle rounded animate-pulse" />
      </div>
    );
  }

  if (!arrival) {
    return (
      <span className="text-sm text-foreground-subtle">No arrivals</span>
    );
  }

  const minutes = arrival.minutesUntilArrival;
  const formatMinutes = (m: number): string => {
    if (m <= 0) return 'Now';
    if (m === 1) return '1 min';
    return `${m} min`;
  };

  return (
    <div className="flex items-center gap-2">
      {arrival.trackingStatus === 'live' && (
        <span className="w-2 h-2 rounded-full bg-live-green animate-pulse-live" />
      )}
      <span
        className={`
          font-mono font-bold
          ${minutes <= 2 ? 'text-alert-red' : minutes <= 5 ? 'text-estimated-amber' : 'text-live-green'}
        `}
      >
        {formatMinutes(minutes)}
      </span>
    </div>
  );
}

