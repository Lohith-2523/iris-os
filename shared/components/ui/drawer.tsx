import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './button';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DrawerProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Content panel */}
      <div
        className={cn(
          'relative z-50 flex h-full w-full max-w-lg flex-col border-l border-zinc-800 bg-[#0d0e12] p-6 shadow-2xl transition-transform duration-300 ease-in-out transform translate-x-0',
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            {title && <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>}
            {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-400 hover:text-white rounded-md">
            <X className="h-4.5 w-4.5" />
          </Button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-6 pr-2 -mr-2">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-zinc-800 pt-4 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Drawer;
