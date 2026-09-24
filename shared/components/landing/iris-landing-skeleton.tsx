import styles from './iris-landing-skeleton.module.css';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <span className={`${styles.block} ${className}`} aria-hidden="true" />;
}

export function IrisLandingSkeleton() {
  return (
    <main
      className={styles.page}
      role="status"
      aria-live="polite"
      aria-label="Loading IrisOS"
      aria-busy="true"
    >
      <header className={styles.header}>
        <SkeletonBlock className={styles.logo} />
        <div className={styles.nav}>
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <SkeletonBlock className={styles.headerAction} />
      </header>

      <section className={styles.hero}>
        <SkeletonBlock className={styles.eyebrow} />
        <div className={styles.title}>
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <SkeletonBlock className={styles.subtitle} />
        <SkeletonBlock className={styles.audience} />
        <div className={styles.actions}>
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <SkeletonBlock className={styles.preview} />
      </section>

      <span className="sr-only">Loading landing page content</span>
    </main>
  );
}
