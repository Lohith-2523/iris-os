import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  valueClassName?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  className,
  valueClassName,
  ...props
}: MetricCardProps) {
  return (
    <Card className={cn('workspace-metric-card bg-card/70 shadow-none', className)} {...props}>
      <CardContent className="workspace-metric-card-content p-4">
        <p className="workspace-metric-label min-w-0 text-sm text-muted-foreground">{label}</p>
        <span className="workspace-metric-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <p className={cn('workspace-metric-value min-w-0 truncate', valueClassName)}>{value}</p>
      </CardContent>
    </Card>
  );
}
