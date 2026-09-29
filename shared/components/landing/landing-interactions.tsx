'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, CalendarDays, Check, ChevronRight, FileCheck2,
  LayoutDashboard, Menu, MessageSquareText, Sparkles, Users, X,
} from 'lucide-react';
import { WorkspacePreview } from './workspace-preview';
import styles from './iris-landing.module.css';
import { isWaitlistGateActive } from '@/lib/waitlist-config';

const executionSteps = [
  'Client created', 'Project created', 'Delivery stages generated', 'Tasks created',
  'Specialists assigned', 'Invoice generated', 'Kickoff scheduled', 'Command Center updated',
];

const journeyModes = [
  { key: 'acquire', number: '01', label: 'Acquire', copy: 'Turn opportunities into clients.' },
  { key: 'clients', number: '02', label: 'Clients', copy: 'Keep one complete operating record.' },
  { key: 'delivery', number: '03', label: 'Deliver', copy: 'Move work from plan to approval.' },
  { key: 'money', number: '04', label: 'Money', copy: 'See revenue, margin and receivables.' },
  { key: 'intelligence', number: '05', label: 'Intelligence', copy: 'Know what needs attention.' },
] as const;

export function LandingNavigation() {
  const waitlistGateActive = isWaitlistGateActive();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; setScrolled(window.scrollY > 24); };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  const links = [['Product', '#product'], ['Miles', '#atlas'], ['Solutions', '#roles'], ['Integrations', '#integrations'], ['Pricing', '/pricing']];
  return <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
    <div className={styles.navInner}>
      <Link className={styles.wordmark} href="#top" aria-label="IrisOS home" onClick={() => setOpen(false)}><Image className={styles.brandLogo} src="/iris-logo-black-bg.png" alt="" width={76} height={31} priority /></Link>
      <nav className={styles.navLinks} aria-label="Primary navigation">{links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}</nav>
      <div className={styles.navActions}><Link className={styles.primaryButton} href={waitlistGateActive ? '/waitlist' : '/signup'}>{waitlistGateActive ? 'Join the Waitlist' : 'Create your workspace'} <ArrowRight aria-hidden="true" /></Link></div>
      <button className={styles.menuButton} type="button" aria-expanded={open} aria-controls="landing-mobile-nav" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen((value) => !value)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
    </div>
    <nav id="landing-mobile-nav" className={`${styles.mobileNav} ${open ? styles.mobileNavOpen : ''}`} aria-label="Mobile navigation">
      {links.map(([label, href]) => <Link href={href} key={label} onClick={() => setOpen(false)}>{label}<ChevronRight aria-hidden="true" /></Link>)}
      <Link href={waitlistGateActive ? '/waitlist' : '/signup'} onClick={() => setOpen(false)}>{waitlistGateActive ? 'Join the Waitlist' : 'Create your workspace'}<ArrowRight aria-hidden="true" /></Link>
    </nav>
  </header>;
}

export function ParallaxWorkbench({ children }: { children: React.ReactNode }) {
  return <div className={styles.parallaxWorkbench} data-scroll-depth data-depth="1.2">{children}</div>;
}

export function PageParallax({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compactViewport = window.matchMedia('(max-width: 40rem)');
    if (!container) return;

    const sections = Array.from(container.querySelectorAll<HTMLElement>('section'));
    const revealTargets = Array.from(container.querySelectorAll<HTMLElement>('[data-reveal]'));
    const depthTargets = Array.from(container.querySelectorAll<HTMLElement>('[data-scroll-depth]'));
    const visibleSections = new Set<HTMLElement>();
    const visibleDepth = new Set<HTMLElement>();
    let frame = 0;
    let motionAllowed = !reducedMotion.matches;

    const resetMotion = () => {
      container.style.setProperty('--page-progress', '0');
      sections.forEach((section) => {
        section.style.removeProperty('--section-depth-y');
        section.style.removeProperty('--section-depth-opacity');
        section.style.removeProperty('--section-depth-scale');
      });
      depthTargets.forEach((target) => {
        target.style.removeProperty('--parallax-y');
        target.style.removeProperty('--parallax-tilt');
        target.style.removeProperty('--parallax-scale');
      });
    };

    const update = () => {
      frame = 0;
      if (!motionAllowed) { resetMotion(); return; }
      const viewportHeight = window.innerHeight;
      const motionScale = compactViewport.matches ? 0.45 : 1;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
      container.style.setProperty('--page-progress', `${Math.min(1, Math.max(0, window.scrollY / scrollRange)).toFixed(4)}`);

      visibleSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const distance = (rect.top + rect.height / 2 - viewportHeight / 2) / (viewportHeight + rect.height);
        const progress = Math.max(-1, Math.min(1, distance));
        section.style.setProperty('--section-depth-y', `${(progress * 26 * motionScale).toFixed(2)}px`);
        section.style.setProperty('--section-depth-opacity', `${(1 - Math.abs(progress) * 0.1).toFixed(3)}`);
        section.style.setProperty('--section-depth-scale', `${(1 - Math.abs(progress) * 0.008 * motionScale).toFixed(4)}`);
      });

      depthTargets.forEach((target) => {
        if (compactViewport.matches) {
          target.style.removeProperty('--parallax-y');
          target.style.removeProperty('--parallax-tilt');
          target.style.removeProperty('--parallax-scale');
          return;
        }
        if (!visibleDepth.has(target)) return;
        const rect = target.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / (viewportHeight + rect.height))) - 0.5;
        const depth = Number(target.dataset.depth ?? 1);
        target.style.setProperty('--parallax-y', `${(progress * depth * -64).toFixed(2)}px`);
        target.style.setProperty('--parallax-tilt', `${(progress * depth * 0.8).toFixed(3)}deg`);
        target.style.setProperty('--parallax-scale', `${(1 - Math.abs(progress) * depth * 0.012).toFixed(4)}`);
      });
    };
    const requestUpdate = () => { if (!frame) frame = window.requestAnimationFrame(update); };

    revealTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) target.dataset.revealed = 'true';
    });
    container.dataset.motionReady = 'true';

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.revealed = 'true';
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    const depthObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          visibleSections.add(section);
          section.dataset.parallaxVisible = 'true';
        } else {
          visibleSections.delete(section);
          delete section.dataset.parallaxVisible;
        }
      });
      requestUpdate();
    }, { rootMargin: '30% 0px 30% 0px' });

    const elementDepthObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        if (entry.isIntersecting) visibleDepth.add(target);
        else visibleDepth.delete(target);
      });
      requestUpdate();
    }, { rootMargin: '20% 0px 20% 0px' });

    revealTargets.forEach((target) => revealObserver.observe(target));
    sections.forEach((section) => depthObserver.observe(section));
    depthTargets.forEach((target) => elementDepthObserver.observe(target));
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    const onMotionPreference = () => {
      motionAllowed = !reducedMotion.matches;
      if (!motionAllowed) revealTargets.forEach((target) => { target.dataset.revealed = 'true'; });
      requestUpdate();
    };
    reducedMotion.addEventListener('change', onMotionPreference);
    compactViewport.addEventListener('change', requestUpdate);
    requestUpdate();

    return () => {
      revealObserver.disconnect();
      depthObserver.disconnect();
      elementDepthObserver.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      reducedMotion.removeEventListener('change', onMotionPreference);
      compactViewport.removeEventListener('change', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={root} className={styles.pageParallax}><div className={styles.scrollProgress} aria-hidden="true" />{children}</div>;
}

export function AtlasExecutionDemo() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    if (step >= executionSteps.length) { setRunning(false); return; }
    const timeout = window.setTimeout(() => setStep((value) => value + 1), 520);
    return () => window.clearTimeout(timeout);
  }, [running, step]);
  const reset = () => { setStep(0); setRunning(false); };
  return <WorkspacePreview active="Miles AI" area="Miles AI" title="Action plan" description="Review and approve workspace actions before Miles executes them."><div className={styles.atlasDemo}>
    <div className={styles.atlasPrompt}><span><Sparkles aria-hidden="true" /> Miles command</span><p>Onboard Nova Studio. Create the launch project, assign the team, generate the first invoice and schedule the kickoff.</p></div>
    <div className={styles.actionSummary}>
      <div className={styles.panelHeader}><div><span>Structured action summary</span><strong>{step >= executionSteps.length ? 'Execution complete' : running ? 'Executing approved work' : 'Ready for review'}</strong></div><span className={styles.statusDot}>{running ? 'Live' : step ? 'Updated' : 'Review'}</span></div>
      <ol className={styles.executionList} aria-live="polite">{executionSteps.map((label, index) => <li key={label} className={index < step ? styles.stepComplete : index === step && running ? styles.stepCurrent : ''}><i>{index < step ? <Check aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</i><span>{label}</span><small>{index < step ? 'Done' : index === step && running ? 'In progress' : 'Queued'}</small></li>)}</ol>
      <div className={styles.demoActions}>{step > 0 && <button type="button" className={styles.textButton} onClick={reset}>Reset</button>}<button type="button" className={styles.primaryButton} onClick={() => { if (step >= executionSteps.length) reset(); else setRunning(true); }} disabled={running}>{running ? 'Miles is working' : step >= executionSteps.length ? 'Run again' : 'Confirm 8 actions'}{!running && <ArrowRight aria-hidden="true" />}</button></div>
    </div>
  </div></WorkspacePreview>;
}

function SceneChrome({ title, area, children }: { title: string; area: string; children: React.ReactNode }) {
  const active = area === 'Acquire' ? 'Clients' : area === 'Delivery' ? 'Projects' : area === 'Money' ? 'Finance' : area === 'Intelligence' ? 'Command Center' : 'Clients';
  return <WorkspacePreview active={active} area={area} title={title}><div className={styles.sceneBody}>{children}</div></WorkspacePreview>;
}

function AcquireScene() {
  return <SceneChrome title="Lead Pipeline" area="Acquire"><div className={styles.kanban}>{['New', 'Warm', 'Qualified', 'Won'].map((stage, index) => <div key={stage}><header><span>{stage}</span><b>{index + 2}</b></header>{index === 2 && <article className={styles.liveCard}><strong>Nova Studio</strong><span>Brand launch system</span><b>₹2,40,000</b><small>Meta · follow-up today</small></article>}<article><strong>{['Cedar Creative', 'North & Co.', 'Lumen Labs', 'Fieldwork'][index]}</strong><span>{['Website system', 'Paid media', 'Strategy sprint', 'Content ops'][index]}</span></article></div>)}</div></SceneChrome>;
}

function ClientScene() {
  return <SceneChrome title="Nova Studio" area="Client workspace"><div className={styles.clientSummary}><div className={styles.profileBlock}><span>NS</span><div><strong>Nova Studio</strong><small>Active client · Brand strategy</small></div></div><dl><div><dt>Engagement</dt><dd>₹2,40,000</dd></div><div><dt>Health</dt><dd>On track</dd></div><div><dt>Receivable</dt><dd>₹80,000</dd></div></dl></div><div className={styles.recordGrid}>{['Projects · 02', 'Tasks · 18', 'Deliverables · 06', 'Approvals · 02', 'Invoices · 03', 'Team · 04'].map((item) => <div key={item}><span>{item.split(' · ')[0]}</span><strong>{item.split(' · ')[1]}</strong></div>)}</div><div className={styles.contextChain}>{['Lead', 'Proposal', 'Contract', 'Project', 'Invoice'].map((item, index) => <span key={item}>{item}{index < 4 && <i />}</span>)}</div></SceneChrome>;
}

function DeliveryScene() {
  return <SceneChrome title="Brand Launch System" area="Delivery"><div className={styles.stageBoard}>{['Strategy', 'Design', 'Review', 'Launch'].map((stage, index) => <div key={stage}><header><span>0{index + 1}</span><b>{stage}</b></header><article><small>{index < 2 ? 'In progress' : 'Queued'}</small><strong>{['Audience mapping', 'Campaign system', 'Creative approval', 'Go live'][index]}</strong><p>{index === 1 ? 'Maya → Arjun handover' : index === 2 ? 'Client approval required' : 'Nova Studio'}</p><div className={styles.progressBar}><i style={{ width: `${[82, 54, 18, 4][index]}%` }} /></div></article></div>)}</div></SceneChrome>;
}

function MoneyScene() {
  return <SceneChrome title="Financial Control" area="Money"><div className={styles.metricRow}>{[['Recognized revenue', '₹16.2L'], ['Operating profit', '₹6.8L'], ['Receivables', '₹4.2L']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>Current month</small></div>)}</div><div className={styles.financeSplit}><div><span className={styles.microLabel}>Operating signal</span><div className={styles.chartBars}>{[38, 52, 47, 67, 62, 78, 73, 91].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div><article><small>Invoice · INV-0842</small><h4>Nova Studio</h4><p>Brand launch system</p><strong>₹2,40,000</strong><span>Part paid · ₹1,60,000</span></article></div></SceneChrome>;
}

function IntelligenceScene() {
  return <SceneChrome title="Command Center" area="Intelligence"><div className={styles.intelGrid}><div className={styles.attentionCard}><span><Sparkles aria-hidden="true" /> Handle this first</span><strong>Nova Studio creative is ready for approval.</strong><button type="button">Open approval <ArrowRight aria-hidden="true" /></button></div><div className={styles.priorityList}>{['₹1.8L invoice is 8 days overdue', 'Launch project has one blocked task', 'High-value lead needs follow-up'].map((item, index) => <div key={item}><i>0{index + 1}</i><span>{item}</span><ChevronRight aria-hidden="true" /></div>)}</div></div></SceneChrome>;
}

export function ProductJourney() {
  const [mode, setMode] = useState<(typeof journeyModes)[number]['key']>('acquire');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    const desktop = window.matchMedia('(min-width: 60rem)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!container || !desktop.matches || reducedMotion.matches) return;

    const scene = container.querySelector<HTMLElement>('[data-journey-scene]');
    const section = container.closest<HTMLElement>('section');
    if (!section) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const sectionRect = section.getBoundingClientRect();
      const scrollRange = Math.max(1, sectionRect.height - window.innerHeight);
      const sectionProgress = Math.max(0, Math.min(1, -sectionRect.top / scrollRange));
      const exact = sectionProgress * (journeyModes.length - 1);
      const activeIndex = Math.round(exact);
      setMode((current) => current === journeyModes[activeIndex].key ? current : journeyModes[activeIndex].key);

      if (scene) {
        const local = exact - Math.round(exact);
        scene.style.setProperty('--handoff-y', `${(local * -28).toFixed(2)}px`);
        scene.style.setProperty('--handoff-opacity', `${(1 - Math.abs(local) * 0.42).toFixed(3)}`);
      }
    };
    const requestUpdate = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const selectMode = (key: (typeof journeyModes)[number]['key']) => {
    setMode(key);
    if (window.matchMedia('(min-width: 60rem)').matches) {
      const section = root.current?.closest<HTMLElement>('section');
      if (!section) return;
      const sectionRect = section.getBoundingClientRect();
      const sectionTop = window.scrollY + sectionRect.top;
      const scrollRange = Math.max(1, sectionRect.height - window.innerHeight);
      const index = journeyModes.findIndex((item) => item.key === key);
      window.scrollTo({
        top: sectionTop + (index / (journeyModes.length - 1)) * scrollRange,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    }
  };

  return <div ref={root} className={styles.journeyGrid}><div className={styles.journeyNav} role="tablist" aria-label="IrisOS operating layers">{journeyModes.map((item, index) => <button data-journey-step={index} key={item.key} type="button" role="tab" aria-selected={mode === item.key} onClick={() => selectMode(item.key)}><span>{item.number}</span><b>{item.label}</b><small>{item.copy}</small></button>)}</div><div data-journey-scene className={styles.journeyScene} role="tabpanel"><div className={styles.sceneTransition}>{mode === 'acquire' && <AcquireScene />}{mode === 'clients' && <ClientScene />}{mode === 'delivery' && <DeliveryScene />}{mode === 'money' && <MoneyScene />}{mode === 'intelligence' && <IntelligenceScene />}</div></div></div>;
}

const roleViews = [
  { key: 'admin', label: 'Agency admin', icon: LayoutDashboard, copy: 'See and operate the entire agency.', items: ['Command Center', 'Clients', 'Finance', 'Miles'] },
  { key: 'member', label: 'Team member', icon: Users, copy: 'See assigned work—not the entire agency.', items: ['My Kanban', 'Deadlines', 'Handover', 'Messages'] },
  { key: 'client', label: 'Client', icon: FileCheck2, copy: 'Visibility without the internal workspace.', items: ['Progress', 'Deliverables', 'Approvals', 'Messages'] },
] as const;

export function RoleSwitcher() {
  const [active, setActive] = useState<(typeof roleViews)[number]['key']>('admin');
  const role = roleViews.find((item) => item.key === active) ?? roleViews[0];
  const RoleIcon = role.icon;
  return <div className={styles.roleSwitcher}><div className={styles.roleTabs} role="tablist" aria-label="IrisOS role experiences">{roleViews.map((item) => { const Icon = item.icon; return <button type="button" role="tab" aria-selected={active === item.key} onClick={() => setActive(item.key)} key={item.key}><Icon aria-hidden="true" />{item.label}</button>; })}</div><div className={styles.roleView} role="tabpanel"><WorkspacePreview active={role.items[0]} area={role.label} title={role.items[0]} description={role.copy} navigation={role.items}><div className={styles.roleCards}>{role.items.map((item, index) => <article key={item}><span>0{index + 1}</span><RoleIcon aria-hidden="true" /><strong>{item}</strong><small>{active === 'client' ? 'Client-visible' : active === 'member' ? 'Assigned access' : 'Administrative access'}</small></article>)}</div></WorkspacePreview></div></div>;
}

export function CoordinationPanel() {
  const [view, setView] = useState<'calendar' | 'messages'>('calendar');
  return <div className={styles.coordination}><div className={styles.segmented} role="tablist" aria-label="Coordination preview"><button type="button" role="tab" aria-selected={view === 'calendar'} onClick={() => setView('calendar')}><CalendarDays aria-hidden="true" /> Calendar</button><button type="button" role="tab" aria-selected={view === 'messages'} onClick={() => setView('messages')}><MessageSquareText aria-hidden="true" /> Secure messaging <span>Pro</span></button></div><WorkspacePreview active={view === 'calendar' ? 'Calendar' : 'Messages'} area={view === 'calendar' ? 'Calendar' : 'Secure messaging'} title={view === 'calendar' ? 'Interactive Calendar Hub' : 'Nova Studio'} description={view === 'calendar' ? 'Coordinate workspace events and meetings.' : 'Client-scoped encrypted conversation.'} navigation={view === 'calendar' ? undefined : ['Messages', 'Clients', 'Projects', 'Tasks']}>{view === 'calendar' ? <div className={styles.calendarView}><div className={styles.calendarGrid}>{Array.from({ length: 21 }, (_, index) => <span key={index} className={index === 10 ? styles.calendarToday : ''}>{index + 5}{index === 10 && <i>Review</i>}</span>)}</div><aside><small>Today · 3 events</small><strong>Nova Studio review</strong><span>14:30 · Google Meet</span><p>Miles prepared the meeting, collected the guests and is waiting for confirmation.</p><button type="button">Review meeting <ArrowRight aria-hidden="true" /></button></aside></div> : <div className={styles.messageView}><aside>{['Nova Studio', 'Maya Singh', 'North & Co.'].map((name, index) => <span className={index === 0 ? styles.messageActive : ''} key={name}><i>{name.slice(0, 1)}</i><b>{name}</b><small>{index === 0 ? '2 unread' : 'Delivered'}</small></span>)}</aside><div><small>Encrypted before upload · keys remain on user devices</small><p><b>Nova Studio</b> The final creative is ready for approval.</p><p className={styles.ownMessage}>Thanks. I’ll review it in the portal now.</p><div className={styles.messageInput}>Write a message… <MessageSquareText aria-hidden="true" /></div></div></div>}</WorkspacePreview></div>;
}
