'use client';

import * as React from 'react';
import Image from 'next/image';
import { AuroraFlow } from '@/components/ui/aurora-flow';
import styles from './auth-shell.module.css';

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  appearance?: 'light' | 'dark';
};

export function AuthShell({ title, description, children, appearance = 'light' }: AuthShellProps) {
  const dark = appearance === 'dark';
  return (
    <main className={`${styles.shell} ${dark ? styles.dark : ''} workspace-auth`}>
      <section className={styles.backgroundPanel} aria-hidden="true">
        <AuroraFlow
          preset="mono"
          colors={['#020203', '#090a0c', '#17191d', '#34373c', '#a8abb0']}
          speed={0.32}
          intensity={0.86}
          opacity={1}
          blur={1.25}
          contrast={1.08}
          brightness={0.72}
          grain
          grainOpacity={0.14}
          layers={6}
          flowScale={0.9}
          flowStrength={0.72}
          flowDirection={-14}
          animationSpeed={0.38}
          pointerInteraction
          pointerStrength={0.35}
          scrollInteraction={false}
          parallaxStrength={0.2}
          lighting
          lightingIntensity={0.42}
          lightingRadius={1.2}
          lightingSpeed={0.28}
          ambientGlow
          ambientOpacity={0.38}
          noise
          noiseOpacity={0.1}
          noiseScale={1.15}
          vignette
          vignetteStrength={0.72}
          borderRadius="0px"
          className={styles.aurora}
        />
        <div className={styles.backgroundVeil} />
      </section>

      <section className={styles.formPanel} aria-label={title}>
        <div className={styles.card} style={{ backdropFilter: 'var(--filter-auth-frost)', WebkitBackdropFilter: 'var(--filter-auth-frost)' }}>
          <header className={styles.header}>
            <Image
              src={dark ? '/iris-logo-black-bg.png' : '/iris-logo-white-bg.png'}
              alt="IrisOS"
              width={120}
              height={49}
              priority
              className={styles.logo}
            />
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
