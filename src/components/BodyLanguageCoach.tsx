import React from 'react';
import { cn } from '@/lib/utils';
import { 
  User, 
  Hand, 
  Eye, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import type { BodyLanguageMetrics } from '@/hooks/useBodyLanguageAnalysis';

interface BodyLanguageCoachProps {
  metrics: BodyLanguageMetrics;
  isAnalyzing: boolean;
  compact?: boolean;
}

const MetricBar = ({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
}) => {
  const getBarColor = (val: number) => {
    if (val >= 80) return 'bg-neon-green';
    if (val >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("w-3 h-3", color)} />
          <span className="text-muted-foreground">{label}</span>
        </div>
        <span className="font-mono text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", getBarColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

const StatusIndicator = ({ 
  status, 
  label 
}: { 
  status: 'good' | 'warning' | 'bad'; 
  label: string;
}) => {
  const colors = {
    good: 'text-neon-green bg-neon-green/10 border-neon-green/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    bad: 'text-destructive bg-destructive/10 border-destructive/20',
  };

  const icons = {
    good: CheckCircle2,
    warning: AlertCircle,
    bad: AlertCircle,
  };

  const Icon = icons[status];

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs",
      colors[status]
    )}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
};

export const BodyLanguageCoach: React.FC<BodyLanguageCoachProps> = ({ 
  metrics, 
  isAnalyzing,
  compact = false 
}) => {
  const getHandStatus = (): 'good' | 'warning' | 'bad' => {
    if (metrics.handMovementLevel === 'calm') return 'good';
    if (metrics.handMovementLevel === 'moderate') return 'warning';
    return 'bad';
  };

  const getPostureStatus = (): 'good' | 'warning' | 'bad' => {
    if (metrics.isSlouchingNow) return 'bad';
    if (metrics.postureScore >= 80) return 'good';
    if (metrics.postureScore >= 60) return 'warning';
    return 'bad';
  };

  const getOverallColor = () => {
    if (metrics.overallScore >= 80) return 'text-neon-green';
    if (metrics.overallScore >= 60) return 'text-warning';
    return 'text-destructive';
  };

  if (!isAnalyzing) {
    return (
      <div className="glass rounded-xl p-4 text-center">
        <Activity className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Body language analysis will start with the interview</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="glass rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Body Language</span>
          <span className={cn("font-mono text-lg font-bold", getOverallColor())}>
            {metrics.overallScore}%
          </span>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          <StatusIndicator 
            status={getPostureStatus()} 
            label={metrics.isSlouchingNow ? 'Slouching' : 'Posture'}
          />
          <StatusIndicator 
            status={getHandStatus()} 
            label={metrics.handMovementLevel === 'calm' ? 'Calm' : 
                   metrics.handMovementLevel === 'moderate' ? 'Fidgeting' : 'Nervous'}
          />
        </div>

        {metrics.feedback[0] && metrics.feedback[0] !== 'Great body language! Keep it up' && (
          <p className="text-xs text-warning">{metrics.feedback[0]}</p>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Body Language Coach</h3>
            <p className="text-xs text-muted-foreground">Real-time analysis</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("text-2xl font-bold font-mono", getOverallColor())}>
            {metrics.overallScore}%
          </p>
          <p className="text-xs text-muted-foreground">Overall</p>
        </div>
      </div>

      <div className="space-y-3">
        <MetricBar 
          label="Posture" 
          value={metrics.postureScore} 
          icon={User}
          color="text-neon-cyan"
        />
        <MetricBar 
          label="Eye Contact" 
          value={metrics.eyeContactScore} 
          icon={Eye}
          color="text-neon-purple"
        />
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Hand className="w-3 h-3 text-neon-magenta" />
              <span className="text-muted-foreground">Hand Movement</span>
            </div>
            <StatusIndicator status={getHandStatus()} label={
              metrics.handMovementLevel === 'calm' ? 'Calm' : 
              metrics.handMovementLevel === 'moderate' ? 'Moderate' : 'Nervous'
            } />
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        {metrics.isSlouchingNow && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive animate-pulse">
            <AlertCircle className="w-3 h-3" />
            <span>Slouching detected</span>
          </div>
        )}
        {metrics.handMovementCount > 10 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
            <TrendingUp className="w-3 h-3" />
            <span>{metrics.handMovementCount} nervous movements</span>
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="space-y-1">
        {metrics.feedback.map((fb, i) => (
          <div 
            key={i}
            className={cn(
              "text-xs px-3 py-2 rounded-lg",
              fb.includes('Great') 
                ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' 
                : 'bg-muted text-muted-foreground'
            )}
          >
            {fb}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BodyLanguageCoach;
