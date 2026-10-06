'use client';

import * as React from 'react';
import { ArrowRight, Check, Compass, Lightbulb, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { readWorkspaceUiPreference, writeWorkspaceUiPreference } from '@/lib/workspace-ui-storage';
import {
  TOUR_CATEGORIES,
  WORKSPACE_ONBOARDING_TOUR_PENDING_KEY,
  WORKSPACE_QUICK_TOUR_EVENT,
  WORKSPACE_TOUR_CENTER_EVENT,
  workspaceTourForPath,
  workspaceToursForAccess,
  type WorkspaceTour,
  type WorkspaceTourAccess,
  type WorkspaceTourStep,
} from '@/lib/workspace-tour-config';
import styles from './workspace-tour.module.css';

type TourStatus = 'completed' | 'skipped';
type TourProgress = Record<string, TourStatus>;
type Rect = { top: number; left: number; width: number; height: number; right: number; bottom: number };
type Props = { pathname: string; userId: string; orgId: string } & WorkspaceTourAccess;
type PendingTour = { tourId: string; stepIndex: number };

const STORAGE_KEY = 'workspace-tours-v2';
const PENDING_KEY = 'iris:pending-workspace-tour';
const TARGET_PADDING = 7;

function isTourProgress(value: unknown): value is TourProgress {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every((status) => status === 'completed' || status === 'skipped');
}

function visibleElement(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function findTarget(step: WorkspaceTourStep) {
  return Array.from(document.querySelectorAll<HTMLElement>(step.target)).find(visibleElement) || null;
}

function paddedRect(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  const left = Math.max(4, rect.left - TARGET_PADDING);
  const top = Math.max(4, rect.top - TARGET_PADDING);
  const right = Math.min(window.innerWidth - 4, rect.right + TARGET_PADDING);
  const bottom = Math.min(window.innerHeight - 4, rect.bottom + TARGET_PADDING);
  return { top, left, right, bottom, width: right - left, height: bottom - top };
}

function dispatchTourEvent(event?: { event: string; detail?: unknown }) {
  if (event) window.dispatchEvent(new CustomEvent(event.event, { detail: event.detail }));
}

function stepRoute(activeTour: WorkspaceTour, index: number) {
  return activeTour.steps[index]?.route || activeTour.route;
}

function readPendingTour(): PendingTour | null {
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingTour;
    return typeof parsed.tourId === 'string' && Number.isInteger(parsed.stepIndex) ? parsed : null;
  } catch {
    return { tourId: raw, stepIndex: 0 };
  }
}

function panelPosition(rect: Rect, shiftLeft = false) {
  const width = Math.min(368, window.innerWidth - 32);
  const height = 360;
  const roomRight = window.innerWidth - rect.right;
  const roomLeft = rect.left;
  if (roomRight >= width + 28) return { left: rect.right + 14, top: Math.min(Math.max(16, rect.top), window.innerHeight - height - 16) };
  if (roomLeft >= width + 28) return { left: Math.max(16, rect.left - width - 14), top: Math.min(Math.max(16, rect.top), window.innerHeight - height - 16) };
  const anchoredLeft = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
  const left = shiftLeft ? Math.max(16, anchoredLeft - width * 0.1) : anchoredLeft;
  return { left, top: rect.bottom + height + 14 <= window.innerHeight ? rect.bottom + 14 : Math.max(16, rect.top - height - 14) };
}

export function WorkspaceTour({ pathname, userId, orgId, role, plan, accessPermissions, deliveryWorkspace }: Props) {
  const router = useRouter();
  const navigationRouteRef = React.useRef<string | null>(null);
  const accessibleTours = React.useMemo(() => workspaceToursForAccess({
    role,
    plan,
    accessPermissions,
    deliveryWorkspace,
  }), [accessPermissions, deliveryWorkspace, plan, role]);
  const routeTour = React.useMemo(() => {
    const candidate = workspaceTourForPath(pathname);
    return candidate ? accessibleTours.find((item) => item.id === candidate.id) || null : null;
  }, [accessibleTours, pathname]);
  const scope = React.useMemo(() => ({ userId, orgId }), [orgId, userId]);
  const [tour, setTour] = React.useState<WorkspaceTour | null>(null);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [target, setTarget] = React.useState<HTMLElement | null>(null);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [centerOpen, setCenterOpen] = React.useState(false);
  const [recovery, setRecovery] = React.useState<'help' | 'quick' | null>(null);
  const progress = readWorkspaceUiPreference(scope, STORAGE_KEY, {} as TourProgress, isTourProgress);

  const saveStatus = React.useCallback((activeTour: WorkspaceTour, status: TourStatus) => {
    const current = readWorkspaceUiPreference(scope, STORAGE_KEY, {} as TourProgress, isTourProgress);
    writeWorkspaceUiPreference(scope, STORAGE_KEY, { ...current, [activeTour.id]: status });
  }, [scope]);

  const showStep = React.useCallback((nextTour: WorkspaceTour, nextIndex: number) => {
    setCenterOpen(false);
    setRecovery(null);
    setTarget(null);
    setRect(null);
    const nextStep = nextTour.steps[nextIndex];
    if (!nextStep) return;
    const route = stepRoute(nextTour, nextIndex);
    if (pathname !== route) {
      if (navigationRouteRef.current) return;
      navigationRouteRef.current = route;
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ tourId: nextTour.id, stepIndex: nextIndex } satisfies PendingTour));
      setTour(null);
      router.push(route);
      return;
    }
    window.sessionStorage.removeItem(PENDING_KEY);
    setTour(nextTour);
    setStepIndex(nextIndex);
    dispatchTourEvent(nextStep.preview);
  }, [pathname, router]);

  const startTour = React.useCallback((nextTour: WorkspaceTour) => {
    const accessibleTour = accessibleTours.find((item) => item.id === nextTour.id);
    if (accessibleTour) showStep(accessibleTour, 0);
  }, [accessibleTours, showStep]);

  React.useEffect(() => {
    navigationRouteRef.current = null;
    setTarget(null);
    setRect(null);
    const pendingState = readPendingTour();
    const pending = pendingState ? accessibleTours.find((item) => item.id === pendingState.tourId) || null : null;
    if (pendingState && !pending) window.sessionStorage.removeItem(PENDING_KEY);
    if (pending && pendingState && pathname === stepRoute(pending, pendingState.stepIndex)) {
      window.sessionStorage.removeItem(PENDING_KEY);
      const timer = window.setTimeout(() => {
        setTour(pending);
        setStepIndex(pendingState.stepIndex);
        dispatchTourEvent(pending.steps[pendingState.stepIndex]?.preview);
      }, 350);
      return () => window.clearTimeout(timer);
    }
    setTour(null);
    if (pathname !== '/dashboard' || routeTour?.id !== 'dashboard-orientation') return;
    if (window.sessionStorage.getItem(WORKSPACE_ONBOARDING_TOUR_PENDING_KEY) !== '1') return;
    window.sessionStorage.removeItem(WORKSPACE_ONBOARDING_TOUR_PENDING_KEY);
    const timer = window.setTimeout(() => startTour(routeTour), 450);
    return () => window.clearTimeout(timer);
  }, [accessibleTours, pathname, routeTour, scope, startTour]);

  React.useEffect(() => {
    const quick = () => routeTour && startTour(routeTour);
    const center = () => { setTour(null); setRecovery(null); setCenterOpen(true); };
    window.addEventListener(WORKSPACE_QUICK_TOUR_EVENT, quick);
    window.addEventListener(WORKSPACE_TOUR_CENTER_EVENT, center);
    return () => {
      window.removeEventListener(WORKSPACE_QUICK_TOUR_EVENT, quick);
      window.removeEventListener(WORKSPACE_TOUR_CENTER_EVENT, center);
    };
  }, [routeTour, startTour]);

  const closeTour = React.useCallback((status: TourStatus, showRecovery: boolean) => {
    if (!tour) return;
    saveStatus(tour, status);
    window.sessionStorage.removeItem(PENDING_KEY);
    dispatchTourEvent(tour.returnPreview);
    if (tour.returnRoute && pathname !== tour.returnRoute && (status === 'completed' || pathname !== tour.route)) router.push(tour.returnRoute);
    setTour(null);
    setTarget(null);
    setRect(null);
    if (showRecovery) setRecovery('help');
  }, [pathname, router, saveStatus, tour]);

  const finish = React.useCallback(() => closeTour('completed', false), [closeTour]);

  const next = React.useCallback(() => {
    if (!tour) return;
    if (stepIndex >= tour.steps.length - 1) finish();
    else showStep(tour, stepIndex + 1);
  }, [finish, showStep, stepIndex, tour]);

  React.useEffect(() => {
    if (!tour) return;
    const step = tour.steps[stepIndex];
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;
    let cleanup = () => {};

    const locate = () => {
      if (cancelled) return;
      const element = findTarget(step);
      if (!element && attempts++ < 40) {
        timer = window.setTimeout(locate, 100);
        return;
      }
      if (!element) {
        if (stepIndex < tour.steps.length - 1) showStep(tour, stepIndex + 1);
        else finish();
        return;
      }
      setTarget(element);
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      const update = () => setRect(paddedRect(element));
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
      observer?.observe(element);

      cleanup = () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
        observer?.disconnect();
      };
    };
    locate();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); cleanup(); };
  }, [finish, showStep, stepIndex, tour]);

  React.useEffect(() => {
    if (!recovery) return;
    setTarget(null);
    setRect(null);
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;
    let cleanup = () => {};
    const locate = () => {
      if (cancelled) return;
      const selector = recovery === 'help' ? '.iris-help-bubble' : '[data-help-quick-tour]';
      const element = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(visibleElement) || null;
      if (!element && attempts++ < 30) { timer = window.setTimeout(locate, 100); return; }
      if (!element) return;
      setTarget(element);
      const update = () => setRect(paddedRect(element));
      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      const revealQuickTour = () => window.setTimeout(() => setRecovery('quick'), 120);
      if (recovery === 'help') element.addEventListener('click', revealQuickTour, { once: true });
      cleanup = () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
        element.removeEventListener('click', revealQuickTour);
      };
    };
    locate();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); cleanup(); };
  }, [recovery]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (centerOpen) setCenterOpen(false);
      else if (tour) closeTour('skipped', true);
      else setRecovery(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [centerOpen, closeTour, tour]);

  if (centerOpen) return (
    <div className={styles.centerBackdrop} data-workspace-tour-ui>
      <section className={styles.center} aria-label="Walkthrough Center">
        <header className={styles.centerHeader}>
          <div><span className={styles.eyebrow}>Walkthrough Center</span><h2>Learn the workspace</h2><p>Pick a tour. Use Next to move through each part.</p></div>
          <button type="button" onClick={() => setCenterOpen(false)} aria-label="Close walkthrough center"><X /></button>
        </header>
        <div className={styles.centerContent}>
          {TOUR_CATEGORIES.map((category) => {
            const categoryTours = accessibleTours.filter((item) => item.category === category);
            if (!categoryTours.length) return null;
            return <section key={category} className={styles.tourGroup}><h3>{category}</h3><div className={styles.tourList}>{categoryTours.map((item) => (
              <button type="button" key={item.id} onClick={() => startTour(item)}>
                <span className={styles.tourState}>{progress[item.id] === 'completed' ? <Check /> : <Compass />}</span>
                <span><strong>{item.pageName}</strong><small>{item.summary}</small></span><ArrowRight />
              </button>
            ))}</div></section>;
          })}
        </div>
      </section>
    </div>
  );

  if (recovery && target && rect) {
    const recoveryCopy = recovery === 'help'
      ? { title: 'Your walkthroughs are saved here', description: 'Open Get help whenever you want to return to a walkthrough.', hint: 'Select the highlighted Get help button' }
      : { title: 'Choose Quick Tour', description: 'Restart the walkthrough for this page, or open the Walkthrough Center to choose another workflow.', hint: 'Select Quick Tour to restart this page guide' };
    return <div className={styles.root} data-workspace-tour-ui>
      <div className={styles.blocker} aria-hidden="true" style={{ inset: '0 0 auto 0', height: rect.top }} />
      <div className={styles.blocker} aria-hidden="true" style={{ top: rect.bottom, right: 0, bottom: 0, left: 0 }} />
      <div className={styles.blocker} aria-hidden="true" style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
      <div className={styles.blocker} aria-hidden="true" style={{ top: rect.top, right: 0, width: Math.max(0, window.innerWidth - rect.right), height: rect.height }} />
      <div className={styles.spotlight} aria-hidden="true" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
      <section className={styles.card} aria-label="Saved walkthroughs" style={panelPosition(rect, true)}>
        <div className={styles.cardHeader}><span className={styles.eyebrow}>Quick Tour</span><span className={styles.stepCount}>Come back anytime</span></div>
        <div className={styles.body}><h2 className={styles.title}>{recoveryCopy.title}</h2><p className={styles.description}>{recoveryCopy.description}</p></div>
        <div className={styles.actions}><button type="button" className={styles.skip} onClick={() => setRecovery(null)}>Done</button><span className={styles.stepCount}>{recoveryCopy.hint}</span></div>
      </section>
    </div>;
  }

  if (!tour || !target || !rect) return null;
  const step = tour.steps[stepIndex];
  return (
    <div className={styles.root} data-workspace-tour-ui>
      <div className={styles.blocker} aria-hidden="true" style={{ inset: '0 0 auto 0', height: rect.top }} />
      <div className={styles.blocker} aria-hidden="true" style={{ top: rect.bottom, right: 0, bottom: 0, left: 0 }} />
      <div className={styles.blocker} aria-hidden="true" style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
      <div className={styles.blocker} aria-hidden="true" style={{ top: rect.top, right: 0, width: Math.max(0, window.innerWidth - rect.right), height: rect.height }} />
      <div className={styles.spotlight} aria-hidden="true" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
      <section className={styles.card} aria-label={`${tour.pageName} walkthrough`} style={panelPosition(rect)}>
        <div className={styles.cardHeader}><span className={styles.eyebrow}>{tour.category}</span><span className={styles.stepCount}>{stepIndex + 1} of {tour.steps.length}</span></div>
        <div className={styles.body}><h2 className={styles.title}>{step.title}</h2><p className={styles.description}>{step.description}</p><div className={styles.tip}><Lightbulb /><span><strong>Tip:</strong> {step.tip}</span></div></div>
        <div className={styles.actions}>
          <button type="button" className={styles.skip} onClick={() => closeTour('skipped', true)}>Skip All For Now</button>
          <div className={styles.navigation}><button type="button" className={styles.previous} disabled={stepIndex === 0} onClick={() => showStep(tour, Math.max(0, stepIndex - 1))}>Back</button><button type="button" className={styles.next} onClick={next}>{stepIndex === tour.steps.length - 1 ? 'Done' : 'Next'}{stepIndex < tour.steps.length - 1 && <ArrowRight />}</button></div>
        </div>
        <p className={styles.actionHint}>Review the highlighted area, then choose Next.</p>
      </section>
    </div>
  );
}
