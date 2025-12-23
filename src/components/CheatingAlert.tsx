import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  UserX,
  Shield,
  ShieldAlert,
  ShieldX,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CheatingMetrics, CheatingEvent } from '@/hooks/useCheatingDetection';
import { formatDistanceToNow } from 'date-fns';

interface CheatingAlertProps {
  metrics: CheatingMetrics;
  onDismissAlert?: () => void;
  showDetails?: boolean;
}

const AlertBanner: React.FC<{
  type: CheatingEvent['type'];
  message: string;
  onDismiss?: () => void;
}> = ({ type, message, onDismiss }) => {
  const icons = {
    tab_switch: Monitor,
    looking_away: EyeOff,
    phone_detected: Smartphone,
    person_missing: UserX,
  };

  const Icon = icons[type];

  return (
    <div className="animate-fade-in glass border border-warning/50 bg-warning/10 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-warning" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-warning">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-warning/70 hover:text-warning transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const CheatingAlert: React.FC<CheatingAlertProps> = ({
  metrics,
  onDismissAlert,
  showDetails = true,
}) => {
  const [expandedEvents, setExpandedEvents] = useState(false);
  const [activeAlert, setActiveAlert] = useState<CheatingEvent | null>(null);

  // Show latest alert
  useEffect(() => {
    if (metrics.events.length > 0) {
      const latestEvent = metrics.events[0];
      // Only show if it's recent (within last 5 seconds)
      const isRecent = Date.now() - latestEvent.timestamp.getTime() < 5000;
      if (isRecent && latestEvent !== activeAlert) {
        setActiveAlert(latestEvent);
        // Auto-dismiss after 4 seconds
        const timer = setTimeout(() => {
          setActiveAlert(null);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [metrics.events, activeAlert]);

  const getSuspicionIcon = () => {
    switch (metrics.suspicionLevel) {
      case 'high':
        return ShieldX;
      case 'medium':
        return ShieldAlert;
      default:
        return Shield;
    }
  };

  const getSuspicionColor = () => {
    switch (metrics.suspicionLevel) {
      case 'high':
        return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'medium':
        return 'text-warning bg-warning/10 border-warning/30';
      default:
        return 'text-neon-green bg-neon-green/10 border-neon-green/30';
    }
  };

  const SuspicionIcon = getSuspicionIcon();

  // Real-time status indicators
  const activeIssues = [
    { active: !metrics.isTabVisible, icon: Monitor, label: 'Tab Hidden', color: 'text-warning' },
    { active: metrics.isCurrentlyLookingAway, icon: EyeOff, label: 'Looking Away', color: 'text-warning' },
    { active: metrics.isPhoneDetected, icon: Smartphone, label: 'Phone Detected', color: 'text-destructive' },
    { active: metrics.isPersonMissing, icon: UserX, label: 'Not Visible', color: 'text-destructive' },
  ].filter(issue => issue.active);

  return (
    <div className="space-y-3">
      {/* Active Alert Banner */}
      {activeAlert && (
        <AlertBanner
          type={activeAlert.type}
          message={activeAlert.message}
          onDismiss={() => {
            setActiveAlert(null);
            onDismissAlert?.();
          }}
        />
      )}

      {/* Status Panel */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border",
              getSuspicionColor()
            )}>
              <SuspicionIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Integrity Monitor</h3>
              <p className="text-xs text-muted-foreground capitalize">
                {metrics.suspicionLevel} suspicion
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-mono text-foreground">
              {metrics.totalViolations}
            </p>
            <p className="text-xs text-muted-foreground">violations</p>
          </div>
        </div>

        {/* Real-time Issues */}
        {activeIssues.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activeIssues.map((issue, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/50 border border-border animate-pulse",
                  issue.color
                )}
              >
                <issue.icon className="w-3 h-3" />
                <span className="text-xs font-medium">{issue.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="glass rounded-lg p-2">
            <Monitor className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-mono font-bold text-foreground">{metrics.tabSwitchCount}</p>
            <p className="text-xs text-muted-foreground">Tab Switches</p>
          </div>
          <div className="glass rounded-lg p-2">
            <EyeOff className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-mono font-bold text-foreground">{metrics.lookAwayCount}</p>
            <p className="text-xs text-muted-foreground">Look Away</p>
          </div>
          <div className="glass rounded-lg p-2">
            <Smartphone className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-mono font-bold text-foreground">{metrics.phoneDetectedCount}</p>
            <p className="text-xs text-muted-foreground">Phone</p>
          </div>
          <div className="glass rounded-lg p-2">
            <UserX className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm font-mono font-bold text-foreground">{metrics.personMissingCount}</p>
            <p className="text-xs text-muted-foreground">Missing</p>
          </div>
        </div>

        {/* Event History */}
        {showDetails && metrics.events.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <button
              onClick={() => setExpandedEvents(!expandedEvents)}
              className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Recent Events ({metrics.events.length})</span>
              {expandedEvents ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedEvents && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {metrics.events.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="text-muted-foreground truncate flex-1">
                      {event.message}
                    </span>
                    <span className="text-muted-foreground/70 ml-2 flex-shrink-0">
                      {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Compact version for overlay
export const CheatingAlertCompact: React.FC<{ metrics: CheatingMetrics }> = ({ metrics }) => {
  const hasActiveIssues = !metrics.isTabVisible || 
    metrics.isCurrentlyLookingAway || 
    metrics.isPhoneDetected || 
    metrics.isPersonMissing;

  if (!hasActiveIssues && metrics.totalViolations === 0) {
    return null;
  }

  return (
    <div className={cn(
      "glass rounded-xl px-3 py-2 flex items-center gap-2",
      metrics.suspicionLevel === 'high' && 'border-destructive/50 bg-destructive/10',
      metrics.suspicionLevel === 'medium' && 'border-warning/50 bg-warning/10'
    )}>
      <AlertTriangle className={cn(
        "w-4 h-4",
        metrics.suspicionLevel === 'high' ? 'text-destructive' : 
        metrics.suspicionLevel === 'medium' ? 'text-warning' : 'text-muted-foreground'
      )} />
      <span className="text-sm font-medium text-foreground">
        {metrics.totalViolations} {metrics.totalViolations === 1 ? 'issue' : 'issues'}
      </span>
      {hasActiveIssues && (
        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
      )}
    </div>
  );
};

export default CheatingAlert;
