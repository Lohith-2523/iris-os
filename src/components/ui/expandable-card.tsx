'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ExpandableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  disableExpand?: boolean;
}

export function ExpandableCard({ children, className, expandedContent, disableExpand = false, ...props }: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const cardRef = React.useRef<HTMLDivElement>(null);
  const placeholderRef = React.useRef<HTMLDivElement>(null);
  const animationTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const getExpandedCoords = React.useCallback(() => {
    const width = Math.min(window.innerWidth - 32, 760);
    const height = Math.min(window.innerHeight - 48, 540);

    return {
      top: Math.max(24, window.innerHeight / 2 - height / 2),
      left: Math.max(16, window.innerWidth / 2 - width / 2),
      width,
      height,
    };
  }, []);

  const finishAnimation = React.useCallback((callback?: () => void) => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }

    animationTimerRef.current = setTimeout(() => {
      setIsAnimating(false);
      callback?.();
    }, 420);
  }, []);

  const handleExpand = (e: React.MouseEvent) => {
    if (disableExpand || isExpanded || isAnimating) return;
    e.stopPropagation();

    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setIsAnimating(true);
      setIsClosing(false);
      setIsExpanded(true);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCoords(getExpandedCoords());
          finishAnimation();
        });
      });
    }
  };

  const handleCollapse = React.useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isExpanded || isAnimating) return;

    if (placeholderRef.current && cardRef.current) {
      const pRect = placeholderRef.current.getBoundingClientRect();
      setCoords({
        top: pRect.top,
        left: pRect.left,
        width: pRect.width,
        height: pRect.height,
      });
      setIsClosing(true);
      setIsAnimating(true);
      finishAnimation(() => {
        setIsExpanded(false);
        setIsClosing(false);
        setCoords(null);
      });
    }
  }, [finishAnimation, isAnimating, isExpanded]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCollapse();
      }
    };

    if (isExpanded) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCollapse, isExpanded]);

  React.useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  const isPoppedOut = isExpanded || isAnimating;
  const showExpandedContent = isExpanded && !isClosing;

  return (
    <>
      {isPoppedOut && (
        <div 
          ref={placeholderRef} 
          className={cn(
            "w-full h-full min-h-[120px] rounded-xl bg-zinc-900/40 border border-zinc-800/30", 
            className
          )} 
        />
      )}

      <div
        ref={cardRef}
        {...props}
        onClick={handleExpand}
        style={
          isPoppedOut && coords
            ? {
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                height: `${coords.height}px`,
                zIndex: 100,
                margin: 0,
              }
            : undefined
        }
        className={cn(
          "transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] bg-zinc-900/90 border border-zinc-800/80 rounded-xl text-card-foreground shadow-sm relative",
          !isPoppedOut ? "w-full h-full" : "bg-[#0d0e12] overflow-hidden p-6 md:p-8 shadow-[0_0_100px_rgba(0,0,0,0.85)]",
          !isPoppedOut && !disableExpand ? "hover:ring-2 hover:ring-zinc-800/80 cursor-pointer hover:bg-zinc-900/100" : "",
          !isPoppedOut && className
        )}
      >
        {showExpandedContent && !isAnimating && (
          <button
            className="absolute top-4 right-4 z-50 p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            onClick={handleCollapse}
          >
            <X className="h-5 w-5" />
          </button>
        )}
        
        <div className={cn("w-full h-full", showExpandedContent && "opacity-100 mt-2")}>
          {showExpandedContent && expandedContent ? expandedContent : children}
        </div>
      </div>

      {isPoppedOut && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 transition-all duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            isExpanded && !isClosing ? "opacity-100 backdrop-blur-sm" : "opacity-0 backdrop-blur-none"
          )}
          onClick={() => handleCollapse()}
        />
      )}
    </>
  );
}
