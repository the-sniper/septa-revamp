'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { Header } from '@/components/Navigation';
import { AlertList } from '@/components/AlertCard';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { AlertSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getAlerts } from '@/lib/septa-api';
import type { Alert } from '@/lib/types';

type AlertFilter = 'all' | 'severe' | 'warning' | 'info';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAlerts = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await getAlerts();
      if (response.data) {
        setAlerts(response.data);
        setError(null);
      } else if (response.error) {
        setError(response.error);
      }
      setLastUpdated(new Date());
    } catch {
      setError('Failed to fetch alerts');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter((a) => a.severity === filter);

  const severeCounts = {
    all: alerts.length,
    severe: alerts.filter((a) => a.severity === 'severe').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  };

  const filterOptions: { value: AlertFilter; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'bg-foreground-subtle' },
    { value: 'severe', label: 'Severe', color: 'bg-alert-red' },
    { value: 'warning', label: 'Warning', color: 'bg-estimated-amber' },
    { value: 'info', label: 'Info', color: 'bg-septa-blue' },
  ];

  return (
    <>
      <Header title="Service Alerts" />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <Card variant="elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center
                ${severeCounts.severe > 0 ? 'bg-alert-red/10' : 'bg-live-green/10'}
              `}>
                {severeCounts.severe > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-alert-red" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-live-green" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {severeCounts.severe > 0
                    ? `${severeCounts.severe} severe alert${severeCounts.severe !== 1 ? 's' : ''}`
                    : 'All systems operational'}
                </p>
                <p className="text-sm text-foreground-muted">
                  {alerts.length} total alert{alerts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              {lastUpdated && (
                <p className="text-xs text-foreground-subtle mb-1">
                  {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
              <IconButton
                onClick={() => fetchAlerts(true)}
                disabled={isRefreshing}
                aria-label="Refresh alerts"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </IconButton>
            </div>
          </div>
        </Card>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                text-sm font-medium transition-colors flex-shrink-0
                ${filter === option.value
                  ? 'bg-septa-blue text-white'
                  : 'bg-background-elevated text-foreground-muted hover:bg-background-subtle'
                }
              `}
            >
              <span className={`w-2 h-2 rounded-full ${option.color}`} />
              {option.label}
              <span className="text-xs opacity-70">({severeCounts[option.value]})</span>
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="space-y-3">
            <AlertSkeleton />
            <AlertSkeleton />
            <AlertSkeleton />
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8" />}
            title="Couldn't load alerts"
            description={error}
            action={{
              label: 'Try again',
              onClick: () => fetchAlerts(),
            }}
          />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={
              filter === 'all' ? (
                <CheckCircle className="w-8 h-8" />
              ) : (
                <Info className="w-8 h-8" />
              )
            }
            title={filter === 'all' ? 'No active alerts' : `No ${filter} alerts`}
            description={
              filter === 'all'
                ? 'All SEPTA services are running normally'
                : `There are no ${filter} level alerts at this time`
            }
            action={
              filter !== 'all'
                ? {
                    label: 'View all alerts',
                    onClick: () => setFilter('all'),
                  }
                : undefined
            }
          />
        ) : (
          <AlertList alerts={filteredAlerts} />
        )}

        {/* Alert Legend */}
        {!isLoading && alerts.length > 0 && (
          <Card variant="outlined" className="mt-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Alert Severity Levels</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-alert-red" />
                <span className="text-sm text-foreground">Severe</span>
                <span className="text-xs text-foreground-muted">- Major service disruption</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-estimated-amber" />
                <span className="text-sm text-foreground">Warning</span>
                <span className="text-xs text-foreground-muted">- Delays or minor disruption</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-septa-blue" />
                <span className="text-sm text-foreground">Info</span>
                <span className="text-xs text-foreground-muted">- General information</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

