'use client';

import { type ReactNode } from 'react';

type BadgeVariant = 'default' | 'live' | 'estimated' | 'scheduled' | 'no-data' | 'alert' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-background-subtle text-foreground-muted border-border',
  live: 'bg-live-green-bg text-live-green border-live-green/30',
  estimated: 'bg-estimated-amber-bg text-estimated-amber border-estimated-amber/30',
  scheduled: 'bg-background-subtle text-foreground-muted border-border',
  'no-data': 'bg-no-data-gray-bg text-no-data-gray border-no-data-gray/30',
  alert: 'bg-alert-red-bg text-alert-red border-alert-red/30',
  info: 'bg-septa-blue/10 text-septa-blue-light border-septa-blue/30',
};

export function Badge({ variant = 'default', children, className = '', pulse = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium
        rounded-full border
        ${variantStyles[variant]}
        ${pulse ? 'animate-pulse-live' : ''}
        ${className}
      `}
    >
      {(variant === 'live' || pulse) && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}

export function TrackingBadge({ status }: { status: 'live' | 'estimated' | 'scheduled' | 'no_data' }) {
  const config = {
    live: { variant: 'live' as const, label: 'Live GPS', pulse: true },
    estimated: { variant: 'estimated' as const, label: 'Estimated', pulse: false },
    scheduled: { variant: 'scheduled' as const, label: 'Scheduled', pulse: false },
    no_data: { variant: 'no-data' as const, label: 'No tracking', pulse: false },
  };

  const { variant, label, pulse } = config[status];

  return (
    <Badge variant={variant} pulse={pulse}>
      {label}
    </Badge>
  );
}

export function ModeBadge({ mode }: { mode: string }) {
  const modeConfig: Record<string, { color: string; label: string }> = {
    bus: { color: 'bg-[#004F9F]', label: 'Bus' },
    trolley: { color: 'bg-[#00A550]', label: 'Trolley' },
    subway: { color: 'bg-[#0066CC]', label: 'Subway' },
    regional_rail: { color: 'bg-[#91456C]', label: 'Regional Rail' },
    nhsl: { color: 'bg-[#9B2D9B]', label: 'NHSL' },
  };

  const config = modeConfig[mode] || { color: 'bg-foreground-subtle', label: mode };

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 text-xs font-medium
        rounded text-white ${config.color}
      `}
    >
      {config.label}
    </span>
  );
}

