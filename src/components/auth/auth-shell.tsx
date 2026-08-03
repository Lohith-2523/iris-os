'use client';

import * as React from 'react';
import Image from 'next/image';
import styles from './auth-shell.module.css';

const AUTH_VIDEO_PATH = '/media/iris-auth-workspace-v2.mp4';

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: no-preference)');
    const idleWindow = window as IdleWindow;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;

    const stopVideo = () => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      delete video.dataset.loaded;
      video.removeAttribute('src');
      video.load();
    };

    const loadVideo = () => {
      if (!mediaQuery.matches || !videoRef.current || videoRef.current.src) return;
      videoRef.current.src = AUTH_VIDEO_PATH;
      videoRef.current.load();
      void videoRef.current.play().catch(() => undefined);
    };

    const scheduleVideo = () => {
      if (!mediaQuery.matches) {
        stopVideo();
        return;
      }
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(loadVideo, { timeout: 1200 });
      } else {
        timeoutHandle = window.setTimeout(loadVideo, 300);
      }
    };

    scheduleVideo();
    mediaQuery.addEventListener('change', scheduleVideo);
    return () => {
      mediaQuery.removeEventListener('change', scheduleVideo);
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
      stopVideo();
    };
  }, []);

  return (
    <main className={`${styles.shell} workspace-auth`}>
      <section className={styles.videoPanel} aria-hidden="true">
        <video
          ref={videoRef}
          className={styles.video}
          muted
          loop
          playsInline
          preload="none"
          tabIndex={-1}
          onCanPlay={(event) => { event.currentTarget.dataset.loaded = 'true'; }}
        />
        <div className={styles.videoOverlay} />
      </section>

      <section className={styles.formPanel} aria-label={title}>
        <div className={styles.abstractShape} aria-hidden="true" />
        <div className={styles.card}>
          <header className={styles.header}>
            <Image
              src="/iris-logo-black-transparent.png"
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
