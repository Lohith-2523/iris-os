'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import styles from './daily-briefing.module.css';

export function DailyBriefingLauncher({ hasUnreadBriefing }: { hasUnreadBriefing: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/briefing') return null;

  return (
    <button
      type="button"
      className={styles.launcher}
      aria-label="Open Atlas daily briefing"
      onClick={() => router.push('/briefing?source=bubble')}
    >
      <Sparkles aria-hidden className="h-5 w-5" />
      {hasUnreadBriefing && <span className={styles.launcherBadge} aria-hidden />}
      <span className={styles.launcherLabel}>Open daily briefing</span>
    </button>
  );
}
