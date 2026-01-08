'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Header } from '@/components/Navigation';
import { getAlerts, SEPTA_ROUTES } from '@/lib/septa-api';
import type { Alert } from '@/lib/types';

type Severity = 'all' | 'severe' | 'warning' | 'info';

const SEVERITY_CONFIG = {
  severe: {
    icon: AlertTriangle,
    bg: 'bg-urgent/10',
    border: 'border-urgent/20',
    text: 'text-urgent',
    label: 'Severe',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-delayed/10',
    border: 'border-delayed/20',
    text: 'text-delayed',
    label: 'Warning',
  },
  info: {
    icon: Info,
    bg: 'bg-septa-blue/10',
    border: 'border-septa-blue/20',
    text: 'text-septa-blue',
    label: 'Info',
  },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Severity>('all');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const fetchAlerts = async () => {
    setIsLoading(true);
      const response = await getAlerts();
      if (response.data) {
        setAlerts(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const toggleExpand = (alertId: string) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === filter);

  const counts = {
    all: alerts.length,
    severe: alerts.filter(a => a.severity === 'severe').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  };

  return (
    <>
      <Header title="Service Alerts" showBack />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Status Card */}
        <div className={`card p-4 ${counts.severe > 0 ? 'bg-urgent/5 border-urgent/20' : 'bg-live/5 border-live/20'} border`}>
            <div className="flex items-center gap-3">
            {counts.severe > 0 ? (
              <AlertTriangle className="w-6 h-6 text-urgent" />
            ) : (
              <Info className="w-6 h-6 text-live" />
            )}
              <div>
              <p className="font-semibold text-text-primary">
                {counts.severe > 0 
                  ? `${counts.severe} active alert${counts.severe > 1 ? 's' : ''}`
                  : 'System operating normally'
                }
              </p>
              <p className="text-sm text-text-muted">
                {counts.warning > 0 && `${counts.warning} warning${counts.warning > 1 ? 's' : ''}`}
                {counts.warning > 0 && counts.info > 0 && ', '}
                {counts.info > 0 && `${counts.info} info notice${counts.info > 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={fetchAlerts}
              className="ml-auto p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              disabled={isLoading}
            >
              <RefreshCw className={`w-5 h-5 text-text-muted ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {(['all', 'severe', 'warning', 'info'] as Severity[]).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap
                font-medium text-sm transition-all
                ${filter === sev
                  ? sev === 'all' 
                  ? 'bg-septa-blue text-white'
                    : `${SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG].bg} ${SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG].text}`
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
                }
              `}
            >
              {sev === 'all' ? 'All' : SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG].label}
              {counts[sev] > 0 && (
                <span className={`
                  px-1.5 py-0.5 rounded-full text-xs font-bold
                  ${filter === sev 
                    ? 'bg-white/20' 
                    : 'bg-bg-tertiary'
                  }
                `}>
                  {counts[sev]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-5 skeleton rounded" />
                    <div className="w-full h-4 skeleton rounded" />
                    <div className="w-1/2 h-4 skeleton rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="card p-8 text-center">
            <Info className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="font-semibold text-text-primary mb-2">No alerts</p>
            <p className="text-sm text-text-secondary">
              {filter === 'all' 
                ? 'All systems are running smoothly'
                : `No ${filter} alerts at this time`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity];
              const Icon = config.icon;
              const isExpanded = expandedAlerts.has(alert.alertId);

              return (
                <div 
                  key={alert.alertId} 
                  className={`card ${config.bg} border ${config.border} overflow-hidden`}
                >
                  <button
                    onClick={() => toggleExpand(alert.alertId)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon className={`w-5 h-5 ${config.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-text-primary line-clamp-2">
                            {alert.title}
                          </p>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-text-muted flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0" />
                          )}
                        </div>
                        
                        {/* Affected Routes */}
                        {alert.affectedRoutes && alert.affectedRoutes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {alert.affectedRoutes.slice(0, 5).map((routeId) => {
                              const route = SEPTA_ROUTES.find(r => r.routeId === routeId);
                              return (
                                <span 
                                  key={routeId}
                                  className="px-2 py-0.5 bg-bg-tertiary rounded text-xs font-mono font-bold text-text-secondary"
                                >
                                  {route?.routeShortName || routeId}
                                </span>
                              );
                            })}
                            {alert.affectedRoutes.length > 5 && (
                              <span className="text-xs text-text-muted self-center">
                                +{alert.affectedRoutes.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="ml-12">
                        {alert.description && (
                          <p className="text-sm text-text-secondary whitespace-pre-line">
                            {alert.description}
                          </p>
                        )}
                        {alert.startTime && (
                          <p className="text-xs text-text-muted mt-3">
                            Started: {new Date(alert.startTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="card p-4">
          <p className="text-sm font-medium text-text-muted mb-3">Alert severity levels</p>
            <div className="space-y-2">
            {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className={`p-1.5 rounded ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.text}`} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-text-primary">{config.label}</span>
                    <span className="text-sm text-text-muted ml-2">
                      {key === 'severe' && '— Major service disruptions'}
                      {key === 'warning' && '— Delays or minor issues'}
                      {key === 'info' && '— General information'}
                    </span>
              </div>
              </div>
              );
            })}
              </div>
            </div>
      </div>
    </>
  );
}
