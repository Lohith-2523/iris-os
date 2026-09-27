"use client";

/* The split face needs a native image so its intrinsic ratio survives the mobile rotation. */
/* eslint-disable @next/next/no-img-element */

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef, useState, type CSSProperties } from "react";
import styles from "./scroll-split-card.module.css";

interface ScrollSplitCardItem {
  title: string;
  description: string;
  mobileDescription?: string;
  bgColor: string;
  textColor: string;
  icon?: React.ReactNode;
}

interface ScrollSplitCardProps {
  className?: string;
  imageSrc: string;
  cards: ScrollSplitCardItem[];
  containerRef?: React.RefObject<HTMLElement | null>;
  startLabel?: string;
  endLabel?: string;
  /** Total sticky-story height in viewport-height units. */
  scrollLengthVh?: number;
}

export function ScrollSplitCard({
  className,
  imageSrc,
  cards,
  containerRef: externalContainerRef,
  startLabel = "Scroll down",
  endLabel = "Built to move work forward.",
  scrollLengthVh = 300,
}: ScrollSplitCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const phoneViewport = useMediaQuery("(max-width: 47.99rem)");

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: externalContainerRef,
    offset: ["start start", "end end"],
  });
  const [startLabelDismissed, setStartLabelDismissed] = useState(false);
  const startLabelDismissedRef = useRef(false);
  const previousScrollProgress = useRef(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const delta = latest - previousScrollProgress.current;
    previousScrollProgress.current = latest;

    if (delta > 0.002 && !startLabelDismissedRef.current) {
      startLabelDismissedRef.current = true;
      setStartLabelDismissed(true);
    } else if (delta < -0.002 && startLabelDismissedRef.current) {
      startLabelDismissedRef.current = false;
      setStartLabelDismissed(false);
    }
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: phoneViewport ? 150 : 180,
    damping: phoneViewport ? 32 : 30,
    mass: 0.45,
    restDelta: 0.001,
  });
  const progress = reduceMotion ? scrollYProgress : smoothProgress;

  // Stage 1 to 2: Separation (0 to 0.4), then Stage 2 to 3: Overlap closer (0.4 to 0.8)
  const firstOffset = useTransform(progress, [0, 0.4, 0.8], reduceMotion ? [0, 0, 0] : [0, -48, -24]);
  const lastOffset = useTransform(progress, [0, 0.4, 0.8], reduceMotion ? [0, 0, 0] : [0, 48, 24]);
  const scale = useTransform(progress, [0, 0.4], reduceMotion ? [1, 1] : [1, phoneViewport ? 0.96 : 0.9]);

  // Stage 2 to 3: Flip (0.4 to 0.8)
  const flipRotation = useTransform(progress, [0.4, 0.8], reduceMotion ? [180, 180] : [0, 180]);
  // Due to 180deg Y flip, positive Z becomes visual counter-clockwise, negative Z becomes visual clockwise
  const rotateZLeft = useTransform(progress, [0.4, 0.8], reduceMotion || phoneViewport ? [0, 0] : [0, 6]);
  const rotateZRight = useTransform(progress, [0.4, 0.8], reduceMotion || phoneViewport ? [0, 0] : [0, -6]);

  // Dynamic borders/radii so it looks like ONE flat image initially
  const borderRadiusFirst = useTransform(progress, [0, 0.2], [phoneViewport ? "16px 16px 0px 0px" : "16px 0px 0px 16px", "16px"]);
  const borderRadiusMiddle = useTransform(progress, [0, 0.2], ["0px", "16px"]);
  const borderRadiusLast = useTransform(progress, [0, 0.2], [phoneViewport ? "0px 0px 16px 16px" : "0px 16px 16px 0px", "16px"]);

  // Cards move up in the last viewport
  const cardsY = useTransform(progress, [0.8, 1], reduceMotion ? [0, 0] : [0, phoneViewport ? -120 : -240]);

  // Text appearance at the end in the sticky viewport
  const textOpacity = useTransform(progress, [0.8, 1], reduceMotion ? [1, 1] : [0, 1]);
  const textY = useTransform(progress, [0.8, 1], reduceMotion ? [0, 0] : [40, 0]);

  return (
    <div
      ref={containerRef}
      data-split-card-root
      className={cn("relative w-full", className)}
      style={{ height: reduceMotion ? "100svh" : `calc(${scrollLengthVh} * 1svh)` }}
    >
      <div className={cn("sticky top-[6.5rem] flex w-full items-center justify-center overflow-hidden [perspective:1200px]", styles.stage)}>
        {/* Starting Text indicator */}
        <motion.div
          className={cn("absolute left-0 right-0 text-center", styles.startLabel)}
          initial={false}
          animate={{ opacity: reduceMotion || startLabelDismissed ? 0 : 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.4, ease: "easeOut" }}
        >
          <p className="text-sm font-medium tracking-widest text-foreground/50 uppercase">
            {startLabel}
          </p>
        </motion.div>

        <motion.div
          data-split-card-group
          style={{ scale, y: cardsY, transformStyle: "preserve-3d" }}
          className={cn("relative", styles.cardGroup)}
        >
          {cards.slice(0, 3).map((card, i) => (
            <motion.div
              key={i}
              data-split-card-panel
              className={styles.panel}
              style={{
                x: phoneViewport ? 0 : i === 0 ? firstOffset : i === 2 ? lastOffset : 0,
                y: phoneViewport ? (i === 0 ? firstOffset : i === 2 ? lastOffset : 0) : 0,
                rotateX: phoneViewport ? flipRotation : 0,
                rotateY: phoneViewport ? 0 : flipRotation,
                rotateZ: i === 0 ? rotateZLeft : i === 2 ? rotateZRight : 0,
                zIndex: i, // Ensures Left is under Middle, and Right is above Middle
                transformStyle: "preserve-3d",
              }}
            >
              {/* Front Side: Original Image Split */}
              <motion.div
                className="absolute inset-0 overflow-hidden [backface-visibility:hidden]"
                style={{
                  zIndex: 2, // Ensure front stays above initially
                  borderRadius: i === 0 ? borderRadiusFirst : i === 2 ? borderRadiusLast : borderRadiusMiddle,
                }}
              >
                <div
                  className={styles.imageSlice}
                  style={{
                    "--split-index": i,
                    backgroundImage: `url(${imageSrc})`,
                  } as CSSProperties}
                >
                  <img
                    aria-hidden="true"
                    alt=""
                    className={styles.rotatedImage}
                    draggable={false}
                    src={imageSrc}
                  />
                </div>
              </motion.div>

              {/* Back Side: New Content Card */}
              <motion.div
                className={cn(
                  "absolute inset-0 flex flex-col justify-end overflow-hidden p-4 [backface-visibility:hidden] will-change-transform sm:p-8 lg:p-10",
                  "border border-white/5 bg-gradient-to-br from-white/10 to-transparent",
                  "shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-24px_48px_rgba(0,0,0,0.2)]",
                  styles.cardBack,
                )}
                style={{
                  backgroundColor: card.bgColor,
                  color: card.textColor,
                  transform: phoneViewport ? "rotateX(180deg)" : "rotateY(180deg)",
                  zIndex: 1, // Ensure back is behind before flip
                  borderRadius: i === 0 ? borderRadiusFirst : i === 2 ? borderRadiusLast : borderRadiusMiddle,
                }}
              >
                {/* Grainy Noise Overlay */}
                <div
                  className={cn("pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay", styles.noise)}
                  style={{
                    backgroundImage: `url("https://framerusercontent.com/images/6mcf62RlDfRfU61Yg5vb2pefpi4.png?width=256&height=256")`,
                    backgroundRepeat: "repeat",
                  }}
                />

                <div data-split-card-icon className="relative z-10 mb-auto">{card.icon}</div>
                <h3 data-split-card-title className="relative z-10 mb-4 text-[clamp(1.15rem,2vw,2rem)] font-medium leading-tight">
                  {card.title}
                </h3>
                <p data-split-card-description className="relative z-10 text-[clamp(0.7rem,1vw,0.95rem)] leading-relaxed opacity-80">
                  <span className={styles.desktopDescription}>{card.description}</span>
                  <span className={styles.mobileDescription}>{card.mobileDescription ?? card.description}</span>
                </p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Ending Text fixed in the sticky viewport */}
        <motion.div
          className={cn("absolute left-0 right-0 text-center", styles.endLabel)}
          style={{
            opacity: textOpacity,
            y: textY,
          }}
        >
          <p data-split-card-end-label className="text-[clamp(2rem,4vw,4.5rem)] font-medium tracking-[-0.045em] text-foreground/80">
            {endLabel}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
