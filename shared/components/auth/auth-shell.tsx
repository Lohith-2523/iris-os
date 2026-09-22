'use client';

import * as React from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import styles from './auth-shell.module.css';

const ProceduralAuthBackground = dynamic(
  () => import('./procedural-auth-background').then((module) => module.ProceduralAuthBackground),
  { ssr: false },
);

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
        <ProceduralAuthBackground inverted={dark} />
      </section>

      <section className={styles.formPanel} aria-label={title}>
        <div className={styles.card} style={{ backdropFilter: 'var(--filter-auth-frost)', WebkitBackdropFilter: 'var(--filter-auth-frost)' }}>
          <header className={styles.header}>
            <Image
              src={dark ? '/iris-logo-white-transparent.png' : '/iris-logo-black-transparent.png'}
              alt="Iris OS"
              width={120}
              height={46}
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
