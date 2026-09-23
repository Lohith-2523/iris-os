"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";

interface ScrollSplitCardItem {
  title: string;
  description: string;
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

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: externalContainerRef,
    offset: ["start start", "end end"],
  });
  const [startLabelDismissed, setStartLabelDismissed] = useState(false);
  const previousScrollProgress = useRef(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const delta = latest - previousScrollProgress.current;
    previousScrollProgress.current = latest;

    if (delta > 0.002) {
      setStartLabelDismissed(true);
    } else if (delta < -0.002) {
      setStartLabelDismissed(false);
    }
  });

  // Stage 1 to 2: Separation (0 to 0.4), then Stage 2 to 3: Overlap closer (0.4 to 0.8)
  const leftX = useTransform(scrollYProgress, [0, 0.4, 0.8], reduceMotion ? [0, 0, 0] : [0, -48, -24]);
  const rightX = useTransform(scrollYProgress, [0, 0.4, 0.8], reduceMotion ? [0, 0, 0] : [0, 48, 24]);
  const scale = useTransform(scrollYProgress, [0, 0.4], reduceMotion ? [1, 1] : [1, 0.9]);

  // Stage 2 to 3: Flip (0.4 to 0.8)
  const rotateY = useTransform(scrollYProgress, [0.4, 0.8], reduceMotion ? [180, 180] : [0, 180]);
  // Due to 180deg Y flip, positive Z becomes visual counter-clockwise, negative Z becomes visual clockwise
  const rotateZLeft = useTransform(scrollYProgress, [0.4, 0.8], reduceMotion ? [0, 0] : [0, 6]);
  const rotateZRight = useTransform(scrollYProgress, [0.4, 0.8], reduceMotion ? [0, 0] : [0, -6]);

  // Dynamic borders/radii so it looks like ONE flat image initially
  const borderRadiusLeft = useTransform(scrollYProgress, [0, 0.2], ["16px 0px 0px 16px", "16px 16px 16px 16px"]);
  const borderRadiusMiddle = useTransform(scrollYProgress, [0, 0.2], ["0px 0px 0px 0px", "16px 16px 16px 16px"]);
  const borderRadiusRight = useTransform(scrollYProgress, [0, 0.2], ["0px 16px 16px 0px", "16px 16px 16px 16px"]);
  const borderOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 0.2]);
  const shadowOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 0.4]);
  const boxShadow = useMotionTemplate`inset 0 1px 1px rgba(255, 255, 255, ${borderOpacity}), inset 0 -24px 48px rgba(0, 0, 0, ${shadowOpacity}), 0 25px 50px -12px rgba(0, 0, 0, ${shadowOpacity})`;

  // Cards move up in the last viewport
  const cardsY = useTransform(scrollYProgress, [0.8, 1], reduceMotion ? [0, 0] : [0, -240]);

  // Text appearance at the end in the sticky viewport
  const textOpacity = useTransform(scrollYProgress, [0.8, 1], reduceMotion ? [1, 1] : [0, 1]);
  const textY = useTransform(scrollYProgress, [0.8, 1], reduceMotion ? [0, 0] : [40, 0]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      style={{ height: reduceMotion ? "100vh" : `${scrollLengthVh}vh` }}
    >
      <div className="sticky top-[6.5rem] flex h-[calc(100vh-6.5rem)] w-full items-center justify-center overflow-hidden [perspective:1200px]">
        {/* Starting Text indicator */}
        <motion.div
          className="absolute top-[20%] left-0 right-0 text-center"
          initial={false}
          animate={{ opacity: reduceMotion || startLabelDismissed ? 0 : 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 1.4, ease: "easeOut" }}
        >
          <p className="text-sm font-medium tracking-widest text-foreground/50 uppercase">
            {startLabel}
          </p>
        </motion.div>

        <motion.div
          style={{ scale, y: cardsY, transformStyle: "preserve-3d" }}
          className="relative flex h-[420px] w-full max-w-7xl px-4 sm:h-[min(560px,68vh)]"
        >
          {cards.slice(0, 3).map((card, i) => (
            <motion.div
              key={i}
              className="relative h-full flex-1"
              style={{
                x: i === 0 ? leftX : i === 2 ? rightX : 0,
                rotateY,
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
                  borderRadius: i === 0 ? borderRadiusLeft : i === 2 ? borderRadiusRight : borderRadiusMiddle,
                  boxShadow,
                }}
              >
                <div
                  className="absolute inset-0 h-full w-[300%]"
                  style={{
                    left: `${-100 * i}%`,
                    backgroundImage: `url(${imageSrc})`,
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                  }}
                />
              </motion.div>

              {/* Back Side: New Content Card */}
              <motion.div
                className={cn(
                  "absolute inset-0 flex flex-col justify-end overflow-hidden p-4 [backface-visibility:hidden] will-change-transform sm:p-8 lg:p-10",
                  "border border-white/5 bg-gradient-to-br from-white/10 to-transparent",
                  "shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-24px_48px_rgba(0,0,0,0.2)]"
                )}
                style={{
                  backgroundColor: card.bgColor,
                  color: card.textColor,
                  transform: "rotateY(180deg)",
                  zIndex: 1, // Ensure back is behind before flip
                  borderRadius: i === 0 ? borderRadiusLeft : i === 2 ? borderRadiusRight : borderRadiusMiddle,
                  boxShadow,
                }}
              >
                {/* Grainy Noise Overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
                  style={{
                    backgroundImage: `url("https://framerusercontent.com/images/6mcf62RlDfRfU61Yg5vb2pefpi4.png?width=256&height=256")`,
                    backgroundRepeat: "repeat",
                  }}
                />

                <div data-split-card-icon className="relative z-10 mb-auto">{card.icon}</div>
                <h3 data-split-card-title className="relative z-10 mb-4 text-[clamp(1.15rem,2vw,2rem)] font-medium leading-tight">
                  {card.title}
                </h3>
                <p data-split-card-description className="relative z-10 text-[clamp(0.7rem,1vw,0.95rem)] leading-relaxed opacity-80">{card.description}</p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* Ending Text fixed in the sticky viewport */}
        <motion.div
          className="absolute bottom-[32%] left-0 right-0 text-center"
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
