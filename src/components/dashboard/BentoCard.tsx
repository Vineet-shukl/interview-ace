import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface BentoCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: 'cyan' | 'magenta' | 'green' | 'purple' | 'orange' | 'blue';
  size?: 'default' | 'large' | 'tall' | 'wide';
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const iconColorMap = {
  cyan: 'text-neon-cyan',
  magenta: 'text-neon-magenta',
  green: 'text-neon-green',
  purple: 'text-neon-purple',
  orange: 'text-accent',
  blue: 'text-neon-blue',
};

const glowColorMap = {
  cyan: 'shadow-glow-cyan',
  magenta: 'shadow-glow-magenta',
  green: 'shadow-[0_0_30px_hsl(120_100%_50%/0.3)]',
  purple: 'shadow-[0_0_30px_hsl(270_100%_65%/0.3)]',
  orange: 'shadow-[0_0_30px_hsl(32_100%_62%/0.3)]',
  blue: 'shadow-[0_0_30px_hsl(220_100%_60%/0.3)]',
};

const sizeClassMap = {
  default: '',
  large: 'md:col-span-2 md:row-span-2',
  tall: 'md:row-span-2',
  wide: 'md:col-span-2',
};

const BentoCard: React.FC<BentoCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'cyan',
  size = 'default',
  children,
  className,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-hover rounded-2xl p-6 relative overflow-hidden group',
        sizeClassMap[size],
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Glow effect on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
          glowColorMap[iconColor]
        )}
        style={{ filter: 'blur(40px)' }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            {value !== undefined && (
              <p className="text-3xl font-bold text-foreground">{value}</p>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          
          {Icon && (
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                'bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm',
                'border border-border/50'
              )}
            >
              <Icon className={cn('w-6 h-6', iconColorMap[iconColor])} />
            </div>
          )}
        </div>

        {/* Content */}
        {children && <div className="mt-4">{children}</div>}
      </div>

      {/* Decorative corner gradient */}
      <div
        className={cn(
          'absolute -bottom-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl',
          `bg-${iconColor === 'orange' ? 'accent' : `neon-${iconColor}`}`
        )}
      />
    </div>
  );
};

export default BentoCard;
