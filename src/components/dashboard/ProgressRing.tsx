import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: 'cyan' | 'magenta' | 'green' | 'purple' | 'orange' | 'primary';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const colorMap = {
  cyan: 'stroke-neon-cyan',
  magenta: 'stroke-neon-magenta',
  green: 'stroke-neon-green',
  purple: 'stroke-neon-purple',
  orange: 'stroke-accent',
  primary: 'stroke-primary',
};

const glowMap = {
  cyan: 'drop-shadow-[0_0_8px_hsl(180_100%_50%/0.6)]',
  magenta: 'drop-shadow-[0_0_8px_hsl(300_100%_60%/0.6)]',
  green: 'drop-shadow-[0_0_8px_hsl(120_100%_50%/0.6)]',
  purple: 'drop-shadow-[0_0_8px_hsl(270_100%_65%/0.6)]',
  orange: 'drop-shadow-[0_0_8px_hsl(32_100%_62%/0.6)]',
  primary: 'drop-shadow-[0_0_8px_hsl(231_48%_48%/0.6)]',
};

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = 'cyan',
  showLabel = true,
  label,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(colorMap[color], glowMap[color], 'transition-all duration-1000 ease-out')}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{Math.round(progress)}%</span>
          {label && <span className="text-xs text-muted-foreground mt-1">{label}</span>}
        </div>
      )}
    </div>
  );
};

export default ProgressRing;
