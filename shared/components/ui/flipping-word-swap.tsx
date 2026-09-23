"use client";

import { cn } from "@/lib/utils";
import gsap from "gsap";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const graphemeSegmenter =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function segmentCharacters(text: string) {
  if (!graphemeSegmenter) return Array.from(text);
  return Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment);
}

export interface FlippingWordSwapProps {
  /** The word or short phrase shown at rest. */
  word1: string;
  /** The word or short phrase revealed on interaction. */
  word2: string;
  /** Optional third phrase used by autoplay sequences. */
  word3?: string;
  /** Duration of each character flip in milliseconds. */
  duration?: number;
  /** Delay between neighboring character flips in milliseconds. */
  stagger?: number;
  /** Additional classes applied to the interactive container. */
  className?: string;
  /** Additional classes applied to every animated phrase layer. */
  wordClassName?: string;
  /** Additional classes applied only to the revealed word. */
  toClassName?: string;
  /** Inline styles applied to the interactive container. */
  style?: CSSProperties;
  /** Inline styles applied only to the revealed word. */
  toStyle?: CSSProperties;
  /** Automatically alternates the two phrases. */
  autoPlay?: boolean;
  /** Time each phrase remains visible when autoplay is enabled. */
  interval?: number;
}

export function FlippingWordSwap({
  word1,
  word2,
  word3,
  duration = 400,
  stagger = 44,
  className,
  wordClassName,
  toClassName,
  style,
  toStyle,
  autoPlay = false,
  interval = 2600,
}: FlippingWordSwapProps) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const activeIndexRef = useRef(0);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const phrases = useMemo(
    () => [word1, word2, word3].filter((phrase): phrase is string => Boolean(phrase)),
    [word1, word2, word3],
  );

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      if (!entry.isIntersecting) timelineRef.current?.pause();
      else timelineRef.current?.resume();
    }, { rootMargin: "120px 0px" });

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const context = gsap.context(() => {
      phrases.forEach((_, index) => {
        gsap.set(`[data-flip-index="${index}"]`, {
          rotationX: index === 0 ? 0 : -82,
          opacity: index === 0 ? 1 : 0,
          transformOrigin: index === 0 ? "center top" : "center bottom",
        });
      });
    }, containerRef);

    activeIndexRef.current = 0;
    setActiveIndex(0);

    return () => {
      timelineRef.current?.kill();
      timelineRef.current = null;
      context.revert();
    };
  }, [phrases]);

  const showPhrase = useCallback((nextIndex: number) => {
    const root = containerRef.current;
    if (!root || nextIndex === activeIndexRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resolvedDuration = prefersReducedMotion ? 0.12 : Math.max(180, duration) / 1000;
    const resolvedStagger = prefersReducedMotion ? 0 : Math.max(0, stagger) / 1000;
    const currentCharacters = root.querySelectorAll(`[data-flip-index="${activeIndexRef.current}"]`);
    const nextCharacters = root.querySelectorAll(`[data-flip-index="${nextIndex}"]`);

    timelineRef.current?.kill();
    gsap.set([currentCharacters, nextCharacters], { willChange: "transform,opacity" });
    gsap.set(nextCharacters, { rotationX: -82, opacity: 0, transformOrigin: "center bottom" });
    timelineRef.current = gsap.timeline({
      onComplete: () => {
        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
        gsap.set([currentCharacters, nextCharacters], { clearProps: "willChange" });
      },
    })
      .to(currentCharacters, {
        rotationX: 82,
        opacity: 0,
        duration: resolvedDuration,
        stagger: resolvedStagger,
        ease: "power2.in",
      })
      .to(nextCharacters, {
        rotationX: 0,
        opacity: 1,
        duration: resolvedDuration,
        stagger: resolvedStagger,
        ease: "power2.out",
      }, `<${resolvedDuration * 0.62}`);
  }, [duration, stagger]);

  useEffect(() => {
    if (!autoPlay || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!pausedRef.current && visibleRef.current) showPhrase((activeIndexRef.current + 1) % phrases.length);
    }, Math.max(1400, interval));
    return () => window.clearInterval(timer);
  }, [autoPlay, interval, phrases.length, showPhrase]);

  const longestWordLength = Math.max(...phrases.map((phrase) => segmentCharacters(phrase).length));
  const renderCharacters = (text: string, layer: number) => {
    const characters = segmentCharacters(text);
    return [...characters, ...Array.from({ length: longestWordLength - characters.length }, () => " ")].map((character, index) => (
      <span
        key={`${layer}-${index}-${character}`}
        data-flip-index={layer}
        className="inline-block whitespace-pre [backface-visibility:hidden]"
      >
        {character === " " ? "\u00a0" : character}
      </span>
    ));
  };

  return (
    <button
      ref={containerRef}
      type="button"
      className={cn(
        "relative inline-grid cursor-pointer select-none border-0 bg-transparent p-0 align-baseline font-[inherit] leading-[inherit] tracking-[inherit] text-[inherit]",
        "rounded-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30 focus-visible:ring-offset-2",
        className,
      )}
      aria-label={phrases[activeIndex]}
      style={style}
      onMouseEnter={() => { pausedRef.current = true; if (!autoPlay) showPhrase(1); }}
      onMouseLeave={() => { pausedRef.current = false; if (!autoPlay) showPhrase(0); }}
      onPointerUp={(event) => {
        if (event.pointerType !== "mouse") showPhrase((activeIndexRef.current + 1) % phrases.length);
      }}
      onFocus={(event) => {
        pausedRef.current = true;
        if (!autoPlay && event.currentTarget.matches(":focus-visible")) showPhrase(1);
      }}
      onBlur={() => { pausedRef.current = false; if (!autoPlay) showPhrase(0); }}
    >
      <span className="col-start-1 row-start-1 inline-grid overflow-hidden [perspective:800px]">
        {phrases.map((phrase, index) => (
          <span
            key={phrase}
            className={cn(
              "col-start-1 row-start-1 inline-flex items-baseline justify-center gap-[0.012em] whitespace-pre",
              wordClassName,
              index > 0 && toClassName,
            )}
            aria-hidden="true"
            style={index > 0 ? toStyle : undefined}
          >
            {renderCharacters(phrase, index)}
          </span>
        ))}
      </span>
    </button>
  );
}
