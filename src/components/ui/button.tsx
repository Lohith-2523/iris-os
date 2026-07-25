import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'workspace-button inline-flex touch-manipulation items-center justify-center gap-2 rounded-md text-sm font-medium transition-[transform,box-shadow,background-color,border-color,color,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          // Variants
          variant === 'default' && 'bg-white text-zinc-950 hover:bg-zinc-200 shadow-sm',
          variant === 'secondary' && 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700',
          variant === 'outline' && 'border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white',
          variant === 'ghost' && 'text-zinc-400 hover:bg-zinc-900 hover:text-white',
          variant === 'link' && 'text-zinc-400 underline-offset-4 hover:underline',
          // Sizes
          size === 'default' && 'h-9 px-4 py-2',
          size === 'sm' && 'h-8 rounded-md px-3 text-xs',
          size === 'lg' && 'h-10 rounded-md px-8',
          size === 'icon' && 'h-9 w-9',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
