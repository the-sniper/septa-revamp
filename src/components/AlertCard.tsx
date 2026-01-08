'use client';

import { AlertTriangle, Info, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { RouteChip } from './RouteCard';
import type { Alert } from '@/lib/types';

interface AlertCardProps {
  alert: Alert;
  compact?: boolean;
}

export function AlertCard({ alert, compact = false }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const severityConfig = {
    info: {
      icon: Info,
      bgColor: 'bg-septa-blue/5',
      borderColor: 'border-septa-blue/20',
      iconColor: 'text-septa-blue',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-estimated-amber/5',
      borderColor: 'border-estimated-amber/20',
      iconColor: 'text-estimated-amber',
    },
    severe: {
      icon: AlertCircle,
      bgColor: 'bg-alert-red/5',
      borderColor: 'border-alert-red/20',
      iconColor: 'text-alert-red',
    },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`
          flex items-start gap-3 p-3 rounded-lg border
          ${config.bgColor} ${config.borderColor}
        `}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">{alert.title}</p>
          {alert.affectedRoutes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {alert.affectedRoutes.slice(0, 3).map((routeId) => (
                <RouteChip key={routeId} routeId={routeId} size="sm" />
              ))}
              {alert.affectedRoutes.length > 3 && (
                <span className="text-xs text-foreground-muted">
                  +{alert.affectedRoutes.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card
      variant="outlined"
      padding="none"
      className={`overflow-hidden ${config.bgColor} ${config.borderColor}`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground">{alert.title}</h3>
              <Badge variant={alert.severity === 'severe' ? 'alert' : alert.severity === 'warning' ? 'estimated' : 'info'}>
                {alert.severity}
              </Badge>
            </div>
            {!isExpanded && alert.description && (
              <p className="text-sm text-foreground-muted mt-1 line-clamp-2">
                {alert.description}
              </p>
            )}
            {alert.affectedRoutes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {alert.affectedRoutes.slice(0, isExpanded ? undefined : 5).map((routeId) => (
                  <RouteChip key={routeId} routeId={routeId} size="sm" />
                ))}
                {!isExpanded && alert.affectedRoutes.length > 5 && (
                  <span className="text-xs text-foreground-muted self-center">
                    +{alert.affectedRoutes.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
          {alert.description && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-foreground-subtle" />
              ) : (
                <ChevronDown className="w-5 h-5 text-foreground-subtle" />
              )}
            </div>
          )}
        </div>
      </button>

      {isExpanded && alert.description && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-9 pt-3 border-t border-border">
            <p className="text-sm text-foreground-muted whitespace-pre-wrap">
              {alert.description}
            </p>
            {alert.startTime && (
              <p className="text-xs text-foreground-subtle mt-3">
                Started: {new Date(alert.startTime).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

interface AlertListProps {
  alerts: Alert[];
  compact?: boolean;
  maxItems?: number;
}

export function AlertList({ alerts, compact = false, maxItems }: AlertListProps) {
  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;

  if (displayAlerts.length === 0) {
    return (
      <div className="text-center py-8">
        <Info className="w-8 h-8 text-foreground-subtle mx-auto mb-2" />
        <p className="text-foreground-muted">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayAlerts.map((alert) => (
        <AlertCard key={alert.alertId} alert={alert} compact={compact} />
      ))}
    </div>
  );
}

// Inline alert banner for route/stop pages
export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  const severeAlerts = alerts.filter((a) => a.severity === 'severe');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');
  const displayAlert = severeAlerts[0] || warningAlerts[0] || alerts[0];

  const config = {
    severe: 'bg-alert-red/10 border-alert-red/30 text-alert-red',
    warning: 'bg-estimated-amber/10 border-estimated-amber/30 text-estimated-amber',
    info: 'bg-septa-blue/10 border-septa-blue/30 text-septa-blue',
  };

  return (
    <div className={`p-3 rounded-lg border ${config[displayAlert.severity]}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm font-medium flex-1">{displayAlert.title}</p>
        {alerts.length > 1 && (
          <span className="text-xs opacity-75">+{alerts.length - 1} more</span>
        )}
      </div>
    </div>
  );
}

