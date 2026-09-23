import * as React from 'react';
import { cn } from '@/lib/utils';
import { AtlasIcon } from './atlas-icon';
import { ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from './button';

export interface InsightPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  type?: 'health' | 'leak' | 'churn' | 'general';
  score?: string | number;
  scoreLabel?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export function InsightPanel({
  className,
  title,
  type = 'general',
  score,
  scoreLabel,
  actionLabel = 'Optimize with Miles',
  onActionClick,
  riskLevel = 'LOW',
  children,
  ...props
}: InsightPanelProps) {
  const getIcon = () => {
    switch (type) {
      case 'churn':
        return <AlertTriangle className="h-5 w-5 text-rose-400" />;
      case 'leak':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'health':
        return <ShieldCheck className="h-5 w-5 text-emerald-400" />;
      default:
        return <AtlasIcon className="h-5 w-5" />;
    }
  };

  const getBorderColor = () => {
    if (riskLevel === 'HIGH') return 'insight-panel-high border-l-rose-700 border-rose-950/40 bg-rose-950/5';
    if (riskLevel === 'MEDIUM') return 'insight-panel-medium border-l-amber-700 border-amber-950/40 bg-amber-950/5';
    return 'insight-panel-low border-l-zinc-500 border-zinc-800/80 bg-zinc-900/10';
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-l-4 p-5 text-zinc-300 shadow-md transition-all duration-200 glass-panel brushed-border',
        getBorderColor(),
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700/60 shadow-inner">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Miles AI Intelligence</span>
              {riskLevel !== 'LOW' && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-none font-medium border uppercase tracking-wider',
                  riskLevel === 'HIGH' ? 'insight-risk-high bg-rose-950/60 border-rose-800/40 text-rose-300' : 'insight-risk-medium bg-amber-950/60 border-amber-800/40 text-amber-300'
                )}>
                  {riskLevel} RISK
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold tracking-tight text-white mt-0.5">{title}</h4>
          </div>
        </div>

        {score !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold font-mono tracking-tight text-white">{score}</div>
            {scoreLabel && <div className="text-[10px] text-zinc-500 uppercase font-medium">{scoreLabel}</div>}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-zinc-400 leading-relaxed font-sans">
        {children}
      </div>

      {onActionClick && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onActionClick}
            className="h-8 text-[11px] font-semibold border-zinc-700/80 hover:bg-zinc-800 hover:text-white flex items-center gap-1.5"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default InsightPanel;
