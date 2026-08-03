'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import {
  ArrowRight,
  Ban,
  CalendarDays,
  CalendarSync,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  HandCoins,
  MousePointer2,
  Target,
  TimerOff,
} from 'lucide-react';
import type { DailyBriefingItem, DailyBriefingPayload } from '@/lib/daily-briefing';
import { dailyBriefingGreeting } from '@/lib/daily-briefing';
import styles from './daily-briefing.module.css';

type BriefingResponse = {
  id: string;
  payload: DailyBriefingPayload;
  readCount: number;
  openedAt: string | null;
  completedAt: string | null;
};

const ICONS: Record<DailyBriefingItem['id'], React.ComponentType<{ 'aria-hidden'?: boolean }>> = {
  'priority-tasks': ClipboardCheck,
  revenue: CircleDollarSign,
  meetings: CalendarDays,
  receivables: HandCoins,
  'delivery-delays': TimerOff,
  pipeline: Target,
  'renewals-due': CalendarSync,
  'blocked-tasks': Ban,
};

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
}

function greetingName(greeting: string) {
  return greeting.match(/^Good (?:morning|afternoon|evening),\s*(.+?)\.?$/i)?.[1] || 'there';
}

function transitionStyle(item: DailyBriefingItem) {
  return { viewTransitionName: `briefing-${item.id}` } as React.CSSProperties;
}

function FiledCard({ item, index }: { item: DailyBriefingItem; index: number }) {
  const Icon = ICONS[item.id];
  return (
    <article
      className={`${styles.filedCard} ${styles[`slot${index}`] || ''}`}
      style={transitionStyle(item)}
      data-item={item.id}
      data-tone={item.tone}
    >
      <div>
        <div className={styles.cardLabel}>
          <Icon aria-hidden />
          <span>{item.label}</span>
        </div>
        <div className={styles.filedMetric}>{item.metric}</div>
        <p className={styles.filedTitle}>{item.title}</p>
      </div>
      <Link className={styles.actionButton} href={item.href}>
        <span>Handle this first</span>
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

export function DailyBriefing() {
  const [briefing, setBriefing] = React.useState<BriefingResponse | null>(null);
  const [readCount, setReadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [timeZone] = React.useState(() => browserTimeZone());
  const [greetingNow, setGreetingNow] = React.useState(() => new Date());
  const progressSaveQueue = React.useRef<Promise<void>>(Promise.resolve());

  React.useEffect(() => {
    const interval = window.setInterval(() => setGreetingNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const loadBriefing = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/daily-briefing?intent=briefing&timeZone=${encodeURIComponent(timeZone)}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Atlas could not prepare today’s briefing.');
      const data = await response.json() as BriefingResponse;
      setBriefing(data);
      setReadCount(Math.min(data.readCount, data.payload.items.length));
      void fetch('/api/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', timeZone }),
      }).then((openResponse) => {
        if (openResponse.ok) window.dispatchEvent(new Event('daily-briefing-opened'));
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Atlas could not prepare today’s briefing.');
    } finally {
      setIsLoading(false);
    }
  }, [timeZone]);

  React.useEffect(() => {
    void loadBriefing();
  }, [loadBriefing]);

  const fileCurrentUpdate = React.useCallback(async () => {
    if (!briefing || readCount >= briefing.payload.items.length) return;
    const nextCount = readCount + 1;
    const documentWithTransitions = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> };
    };

    const commit = () => flushSync(() => setReadCount(nextCount));
    const transition = documentWithTransitions.startViewTransition?.(commit);
    if (!transition) commit();

    void transition?.finished;
    progressSaveQueue.current = progressSaveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch('/api/daily-briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'progress', readCount: nextCount, timeZone }),
        });
        if (!response.ok) throw new Error('Progress could not be saved. Your next click will retry it.');
        setError(null);
      })
      .catch((progressError) => {
        setError(progressError instanceof Error ? progressError.message : 'Progress could not be saved.');
      });
  }, [briefing, readCount, timeZone]);

  if (isLoading) {
    return (
      <div className={`${styles.loadingState} ${styles.immersiveState}`} role="status" aria-live="polite">
        <span>Atlas is assembling your morning scan…</span>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className={`${styles.loadingState} ${styles.immersiveState}`} role="alert">
        <div className="text-center">
          <p>{error || 'Today’s briefing is unavailable.'}</p>
          <button className={`${styles.dashboardButton} mt-4`} type="button" onClick={() => void loadBriefing()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { payload } = briefing;
  const liveGreeting = dailyBriefingGreeting(greetingName(payload.greeting), greetingNow, timeZone);
  const currentItem = payload.items[readCount];
  const isComplete = readCount >= payload.items.length;
  const currentNumber = Math.min(readCount + 1, payload.items.length);
  const isImmersive = readCount === 0;

  return (
    <section
      className={`${styles.page} ${isImmersive ? styles.immersive : styles.framed}`}
      aria-labelledby="daily-briefing-title"
      data-layout={isImmersive ? 'immersive' : 'workspace'}
      style={{ viewTransitionName: 'briefing-shell' } as React.CSSProperties}
    >
      <header className={styles.header}>
        <div className={styles.brandLine}>
          <span className={styles.liveDot} />
          <span>Atlas daily briefing</span>
        </div>
        <span className={styles.progress}>
          {isComplete ? 'Review complete' : `${currentNumber} / ${payload.items.length}`}
        </span>
      </header>

      <div className={styles.intro}>
        <h1 id="daily-briefing-title" className={styles.greeting}>{liveGreeting}</h1>
        <p className={styles.introduction}>{payload.introduction}</p>
      </div>

      <div className={styles.stageGrid}>
        {payload.items.slice(0, readCount).map((item, index) => (
          <FiledCard key={item.id} item={item} index={index} />
        ))}

        {!isComplete && currentItem ? (
          <div className={styles.currentWrap}>
            <button
              className={styles.currentCard}
              type="button"
              onClick={() => void fileCurrentUpdate()}
              aria-label={`File ${currentItem.label} update and continue`}
              style={transitionStyle(currentItem)}
              data-item={currentItem.id}
              data-tone={currentItem.tone}
            >
              <div>
                <div className={styles.cardLabel}>
                  {React.createElement(ICONS[currentItem.id], { 'aria-hidden': true })}
                  <span>{currentItem.label}</span>
                </div>
                <div className={styles.currentMetric}>{currentItem.metric}</div>
                <h2 className={styles.currentTitle}>{currentItem.title}</h2>
                <p className={styles.currentSummary}>{currentItem.summary}</p>
                {currentItem.details.length > 0 && (
                  <ul className={styles.detailList}>
                    {currentItem.details.map((detail) => <li key={detail}>{detail}</li>)}
                  </ul>
                )}
              </div>
              <span className={styles.clickHint}>
                <span>Click anywhere to file this update</span>
                <MousePointer2 aria-hidden className="h-4 w-4 shrink-0" />
              </span>
            </button>
          </div>
        ) : (
          <div className={styles.completion}>
            <div className={styles.completionPanel}>
              <div className={styles.completionIcon}><Check aria-hidden className="h-5 w-5" /></div>
              <h2 className={styles.completionTitle}>That’s all the updates.</h2>
              <p className={styles.completionCopy}>Click on any card or head on over to the dashboard.</p>
              <Link className={styles.dashboardButton} href="/dashboard">
                <span>Go to dashboard</span>
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {error && <p className="sr-only" role="status">{error}</p>}
    </section>
  );
}
