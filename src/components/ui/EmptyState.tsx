'use client';

import { type ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  suggestions?: string[];
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  suggestions,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 mb-4 rounded-full bg-background-subtle flex items-center justify-center text-foreground-subtle">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-foreground-muted max-w-sm mb-6">{description}</p>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-foreground-subtle mb-2">Try:</p>
          <ul className="text-sm text-foreground-muted space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index}>• {suggestion}</li>
            ))}
          </ul>
        </div>
      )}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  isOffline = false,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isOffline?: boolean;
}) {
  return (
    <EmptyState
      icon={
        isOffline ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-7.072m0 0L9.879 9.879M3 3l18 18"
            />
          </svg>
        ) : (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      }
      title={isOffline ? "You're offline" : title}
      description={
        isOffline
          ? "Check your internet connection. We'll show cached data when available."
          : description || 'We had trouble loading this content. Please try again.'
      }
      action={
        onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
            }
          : undefined
      }
    />
  );
}

export function NoResultsState({
  query,
  onClear,
}: {
  query: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title={`No results for "${query}"`}
      description="We couldn't find any stops or routes matching your search."
      suggestions={[
        'Check the spelling',
        'Try a stop ID (e.g., 1234)',
        'Search by route number (e.g., 42)',
        'Use a landmark name',
      ]}
      action={
        onClear
          ? {
              label: 'Clear search',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

export function NoArrivalsState({
  stopName,
  onChangeDirection,
  onChangeTime,
}: {
  stopName?: string;
  onChangeDirection?: () => void;
  onChangeTime?: () => void;
}) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      }
      title="No upcoming arrivals"
      description={
        stopName
          ? `No vehicles are currently scheduled to arrive at ${stopName}.`
          : 'No vehicles are currently scheduled to arrive at this stop.'
      }
      suggestions={[
        'Service may have ended for the day',
        'Try checking a different direction',
        'Check service alerts for disruptions',
      ]}
      action={
        onChangeDirection
          ? {
              label: 'Change direction',
              onClick: onChangeDirection,
            }
          : undefined
      }
      secondaryAction={
        onChangeTime
          ? {
              label: 'View schedule',
              onClick: onChangeTime,
            }
          : undefined
      }
    />
  );
}

