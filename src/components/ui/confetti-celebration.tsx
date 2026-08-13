'use client';

import * as React from 'react';
import styles from './confetti-celebration.module.css';

const COLORS = [
  '#ff3b30',
  '#ff9500',
  '#ffd60a',
  '#34c759',
  '#00c7be',
  '#0a84ff',
  '#5e5ce6',
  '#bf5af2',
  '#ff2d55',
  '#ffffff',
  '#f7c948',
];
const PARTICLE_COUNT = 128;

function seededValue(seed: number) {
  const value = Math.sin(seed * 12_989.8) * 43_758.5453;
  return value - Math.floor(value);
}

const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const direction = index % 2 === 0 ? -1 : 1;
  const x = direction * (10 + seededValue(index + 1) * 38);
  const burstY = -(10 + seededValue(index + 19) * 34);
  const drift = x + direction * (2 + seededValue(index + 37) * 10);

  return {
    id: index,
    color: COLORS[index % COLORS.length],
    x: `${x.toFixed(2)}vw`,
    burstY: `${burstY.toFixed(2)}vh`,
    drift: `${drift.toFixed(2)}vw`,
    spin: `${Math.round(direction * (420 + seededValue(index + 53) * 720))}deg`,
    finalSpin: `${Math.round(direction * (760 + seededValue(index + 53) * 1290))}deg`,
    delay: `${Math.round(seededValue(index + 71) * 260)}ms`,
    duration: `${Math.round(2200 + seededValue(index + 89) * 850)}ms`,
  };
});

export function ConfettiCelebration() {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(false), 3500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className={styles.celebration} aria-hidden="true" data-testid="onboarding-confetti">
      {PARTICLES.map((particle) => (
        <i
          key={particle.id}
          className={styles.piece}
          style={{
            '--confetti-color': particle.color,
            '--confetti-x': particle.x,
            '--confetti-burst-y': particle.burstY,
            '--confetti-drift': particle.drift,
            '--confetti-spin': particle.spin,
            '--confetti-final-spin': particle.finalSpin,
            '--confetti-delay': particle.delay,
            '--confetti-duration': particle.duration,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
