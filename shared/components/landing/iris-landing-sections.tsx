'use client';

import { Bot, ChartNoAxesCombined, FileCheck2, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { CaseStudyFlipStack, type CaseStudyFlipItem } from '@/components/ui/case-study-flip-stack';
import { ScrollSplitCard } from '@/components/ui/scroll-split-card';
import mainDashboardImage from '../../../main-dashboard.png';
import financeDashboardImage from '../../../finance-dashboard.png';
import clientOverviewImage from '../../../client-overview.png';
import projectDeliverablesImage from '../../../project-deliverables.png';
import mainDashboardLandscapeImage from '../../../md16.png';
import financeDashboardLandscapeImage from '../../../fd16.png';
import clientOverviewLandscapeImage from '../../../co16.png';
import projectDeliverablesLandscapeImage from '../../../pd16.png';
import styles from './iris-landing-sections.module.css';

const consoleItems: CaseStudyFlipItem[] = [
  {
    number: '01',
    eyebrow: 'Command centre',
    title: 'Keep every operating signal in one shared view.',
    description: 'Projects, priorities, team capacity and deadlines stay connected so owners can move from signal to action without rebuilding context.',
    image: mainDashboardImage.src,
    landscapeImage: mainDashboardLandscapeImage.src,
    imageAlt: 'IrisOS main dashboard overview',
    background: 'var(--color-landing-surface)',
    foreground: 'var(--color-landing-ink)',
  },
  {
    number: '02',
    eyebrow: 'Revenue control',
    title: 'See the work and the margin behind it.',
    description: 'Invoices, expenses, profitability and forecasts share the same operating record as delivery, exposing risk before month end.',
    image: financeDashboardImage.src,
    landscapeImage: financeDashboardLandscapeImage.src,
    imageAlt: 'IrisOS finance dashboard',
    background: 'var(--color-landing-surface-raised)',
    foreground: 'var(--color-landing-ink)',
  },
  {
    number: '03',
    eyebrow: 'Client workspace',
    title: 'Give every client a clear, accountable experience.',
    description: 'Onboarding, approvals, reports, documents and secure communication move through one controlled client journey.',
    image: clientOverviewImage.src,
    landscapeImage: clientOverviewLandscapeImage.src,
    imageAlt: 'IrisOS client overview',
    background: 'var(--color-landing-surface-inset)',
    foreground: 'var(--color-landing-ink)',
  },
  {
    number: '04',
    eyebrow: 'Delivery system',
    title: 'Turn briefs into coordinated work without tool hopping.',
    description: 'Leads, projects, tasks, documents and automations stay linked from first conversation through final delivery.',
    image: projectDeliverablesImage.src,
    landscapeImage: projectDeliverablesLandscapeImage.src,
    imageAlt: 'IrisOS project deliverables workspace',
    background: 'var(--color-landing-metal-dark)',
    foreground: 'var(--color-landing-ink)',
  },
];

const milesCards = [
  {
    title: 'Understand the whole business',
    description: 'Ask questions across finance, clients, projects and campaign performance. Miles surfaces summaries, forecasts, risks, profit leaks and opportunities from the workspace context you permit.',
    mobileDescription: 'Ask across finance, clients, projects and campaigns. Miles surfaces forecasts, risks, profit leaks and opportunities.',
    bgColor: 'var(--color-landing-surface)',
    textColor: 'var(--color-landing-ink)',
    icon: <ChartNoAxesCombined aria-hidden="true" />,
  },
  {
    title: 'Create decision-ready work',
    description: 'Draft proposals, contracts, statements of work, reports, strategies, meeting plans and executive summaries while keeping review and approval in the loop.',
    mobileDescription: 'Draft proposals, contracts, reports, strategies and executive summaries with review and approval built in.',
    bgColor: 'var(--color-landing-surface-raised)',
    textColor: 'var(--color-landing-ink)',
    icon: <FileCheck2 aria-hidden="true" />,
  },
  {
    title: 'Act with control',
    description: 'Create projects, tasks, invoices, reports and meetings; coordinate automations; use text or voice; and require confirmation before consequential workspace changes.',
    mobileDescription: 'Create projects, tasks, invoices, reports and meetings—with confirmation before consequential changes.',
    bgColor: 'var(--color-landing-surface-inset)',
    textColor: 'var(--color-landing-ink)',
    icon: <Workflow aria-hidden="true" />,
  },
];

export function ConsoleEcosystem() {
  return (
    <section id="features" className={styles.consoleSection} aria-labelledby="console-title">
      <div className={styles.sectionHeading}>
        <span>Console ecosystem</span>
        <h2 id="console-title">One operating system. Every critical workflow.</h2>
        <p>Scroll through the connected layers that turn IrisOS into the control surface for a modern service business.</p>
      </div>
      <CaseStudyFlipStack
        className={styles.consoleStack}
        items={consoleItems}
        hint="Scroll through the console"
        heading="The operating picture changes. The context stays connected."
        scrollVhPerCard={48}
      />
    </section>
  );
}

export function MilesAiSection() {
  return (
    <section id="miles" className={styles.milesSection} aria-labelledby="miles-title">
      <div className={styles.milesHeading}>
        <div>
          <span className={styles.milesEyebrow}><Sparkles aria-hidden="true" /> Miles AI</span>
          <h2 id="miles-title">Intelligence that can see the work—and help move it forward.</h2>
        </div>
        <div className={styles.milesIntro}>
          <p>Miles is the proprietary intelligence and action layer inside IrisOS, grounded in the workspace data your organisation permits.</p>
          <span><ShieldCheck aria-hidden="true" /> Permission-aware, reviewable and human-controlled.</span>
        </div>
      </div>
      <div className={styles.milesStage}>
        <ScrollSplitCard
          className={styles.milesSplit}
          imageSrc="/workspace_banner_dark.png"
          cards={milesCards}
          startLabel="Scroll down to see Miles AI intelligence layer"
          endLabel="Ask. Understand. Create. Act."
          scrollLengthVh={300}
        />
      </div>
      <div className={styles.capabilityRail} aria-label="Miles AI capabilities">
        {[['Reasoning', 'Workspace Q&A and executive summaries'], ['Prediction', 'Forecasts, risks and opportunity detection'], ['Creation', 'Documents, reports and strategies'], ['Action', 'Approved projects, tasks, invoices and meetings'], ['Conversation', 'Text, voice and saved context'], ['Governance', 'Consent, permissions and confirmation']].map(([label, detail]) => (
          <div key={label}><Bot aria-hidden="true" /><strong>{label}</strong><span>{detail}</span></div>
        ))}
      </div>
    </section>
  );
}
