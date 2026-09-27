import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'risk-low' | 'risk-medium' | 'risk-high';
}

function readableBadgeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(readableBadgeText).join(' ');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return readableBadgeText(node.props.children);
  return '';
}

export function isSuccessStatusLabel(node: React.ReactNode) {
  return /\b(?:approved|completed)\b/i.test(readableBadgeText(node));
}

function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const isSuccessStatus = isSuccessStatusLabel(children);

  return (
    <div
      className={cn(
        'workspace-badge inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-[0.01em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variant === 'default' && 'badge-default border-zinc-700 bg-zinc-800 text-zinc-100',
        variant === 'secondary' && 'badge-secondary border-zinc-800 bg-zinc-900 text-zinc-300',
        variant === 'outline' && 'badge-outline border-zinc-700 text-zinc-300 bg-transparent',
        variant === 'risk-low' && 'badge-risk-low border-zinc-800 bg-zinc-900/60 text-zinc-400',
        variant === 'risk-medium' && 'badge-risk-medium border-amber-900/40 bg-amber-950/20 text-amber-200',
        variant === 'risk-high' && 'badge-risk-high border-rose-900/40 bg-rose-950/20 text-rose-200',
        className,
        isSuccessStatus && 'badge-success border-emerald-400/60 bg-emerald-950/80 text-emerald-200'
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Badge };
export default Badge;
