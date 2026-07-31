'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import styles from './daily-briefing.module.css';

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
}

export function DailyBriefingLauncher() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasUnreadBriefing, setHasUnreadBriefing] = React.useState(false);

  React.useEffect(() => {
    if (pathname === '/briefing') return;
    const timeZone = browserTimeZone();
    const controller = new AbortController();
    void fetch(`/api/daily-briefing?intent=status&timeZone=${encodeURIComponent(timeZone)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setHasUnreadBriefing(Boolean(data?.shouldOpen)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);

  if (pathname === '/briefing') return null;

  return (
    <button
      type="button"
      className={styles.launcher}
      aria-label="Open Prisma daily briefing"
      onClick={() => router.push('/briefing?source=bubble')}
    >
      <Sparkles aria-hidden className="h-5 w-5" />
      {hasUnreadBriefing && <span className={styles.launcherBadge} aria-hidden />}
      <span className={styles.launcherLabel}>Open daily briefing</span>
    </button>
  );
}
