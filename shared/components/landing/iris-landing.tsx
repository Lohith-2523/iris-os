import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown, ArrowRight, BadgeCheck, Check, ChevronRight,
  FileCheck2, FileText, KeyRound, Layers3, LockKeyhole,
  Network, Sparkles, Target,
} from 'lucide-react';
import {
  AtlasExecutionDemo, CoordinationPanel, LandingNavigation, PageParallax, ParallaxWorkbench,
  ProductJourney, RoleSwitcher,
} from './landing-interactions';
import { WorkspacePreview } from './workspace-preview';
import styles from './iris-landing.module.css';

const faqItems = [
  ['What is IrisOS?', 'A connected operating system for agencies and service businesses. It brings commercial, delivery, financial, collaborative and intelligence workflows into one workspace.'],
  ['Is Miles just another AI chatbot?', 'No. Miles understands workspace context, prepares a structured action plan, asks for missing information, waits for confirmation and then executes approved work.'],
  ['Can my clients use IrisOS?', 'Yes. The Client Portal provides client-scoped projects, deliverables, approvals, changes, performance and messaging without exposing the agency’s internal workspace.'],
  ['Can team members use IrisOS without seeing finance or administration?', 'Yes. Member access is assignment-scoped. Specialists see their work, deadlines, handovers, calendar and conversations—not unrestricted agency data.'],
  ['Does IrisOS connect to existing tools?', 'IrisOS supports connected services such as Google Calendar, Google Meet and Meta workflows. Availability varies by provider and explicit authorization is required where noted.'],
  ['Is Meta data sent directly to Miles?', 'Not by default. Provider access and Miles data consent are separate controls, and any allowed analysis is scoped to the approved data surface.'],
  ['Which Miles capabilities require Pro or Advanced?', 'Miles features begin on Pro. Broader actions, Daily Briefing and Strategy Studio are included with Advanced. See the pricing comparison for the current plan details.'],
  ['Are Design Hub and forecasting available now?', 'No. They are clearly marked product vision and remain upcoming until they are released.'],
];

function StatusBadge({ children, tone = 'now' }: { children: React.ReactNode; tone?: 'now' | 'pro' | 'advanced' | 'consent' | 'future' }) {
  return <span className={`${styles.badge} ${styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>{children}</span>;
}

function SectionIntro({ index, eyebrow, title, copy }: { index: string; eyebrow: string; title: string; copy?: string }) {
  return <div className={styles.sectionIntro} data-reveal="copy"><span>{index} / {eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>;
}

function HeroWorkspace() {
  return <div className={styles.productMachine} aria-label="Representative IrisOS Command Center interface">
    <div className={styles.machineRail}><span>IRIS / COMMAND CENTER</span><span><i /> SYSTEM ONLINE</span></div>
    <WorkspacePreview area="Command Center" title="Welcome, Alex" description="Real-time financial, operational, and creative performance intelligence.">
      <div className={styles.heroMetrics}>{[['Monthly revenue', '₹16.2L', 'Recognized'], ['Operating profit', '₹6.8L', '41.2% margin'], ['Outstanding', '₹4.2L', '3 invoices'], ['Active projects', '17', '2 at risk']].map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>
      <div className={styles.heroDashboard}><div className={styles.revenuePanel}><div className={styles.panelHeader}><div><span>Revenue signal</span><strong>Last 8 months</strong></div><small>Ledger synced</small></div><div className={styles.heroBars}>{[36, 47, 43, 61, 58, 76, 71, 91].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div><div className={styles.priorityPanel}><div className={styles.panelHeader}><div><span>Priority work</span><strong>Needs attention</strong></div><small>03</small></div>{['Approve launch creative', 'Review Q3 report', 'Nova kickoff · 14:30'].map((item, index) => <span key={item}><i>{index + 1}</i><b>{item}</b><ChevronRight aria-hidden="true" /></span>)}</div></div>
      <div className={styles.atlasLauncher}><Sparkles aria-hidden="true" /><div><small>Miles</small><strong>What needs your attention?</strong></div><span>⌘ K</span></div>
    </WorkspacePreview>
  </div>;
}

function IntegrationNetwork() {
  const services = [
    { name: 'Meta', icon: '/meta_logo.png' },
    { name: 'Google', icon: '/integrations/google.png' },
    { name: 'Google Calendar', icon: '/integrations/googlecalendar.ico' },
    { name: 'Google Meet', icon: '/integrations/googlemeet.png' },
    { name: 'Instagram', icon: '/integrations/instagram.png' },
    { name: 'WhatsApp', icon: '/whatsapp.png' },
  ];

  return <div className={styles.integrationNetwork} data-reveal="network" data-scroll-depth data-depth="0.45">{services.map((service) => <span key={service.name} role="img" aria-label={service.name} title={service.name}><Image src={service.icon} alt="" width={32} height={32} unoptimized /></span>)}<div role="img" aria-label="IrisOS connected workspace"><Image className={styles.brandLogo} src="/iris-logo-black-bg.png" alt="" width={84} height={34} /><small>Connected workspace</small></div><i className={styles.networkHorizontal} aria-hidden="true" /><i className={styles.networkVertical} aria-hidden="true" /></div>;
}

function CommercialFlow() {
  return <div className={styles.commercialFlow} data-reveal="sequence">{['Lead', 'Proposal', 'Contract / SOW', 'E-sign', 'Project', 'Tax invoice', 'Receipt'].map((item, index) => <div key={item} style={{ '--reveal-index': index } as React.CSSProperties}><span>0{index + 1}</span><strong>{item}</strong><small>{index < 2 ? 'Commercial context' : index < 4 ? 'Approved record' : 'Connected delivery'}</small>{index < 6 && <ArrowRight aria-hidden="true" />}</div>)}</div>;
}

function DocumentWorkspacePreview() {
  return <WorkspacePreview active="Documents" area="Documents" title="Statement of work" description="Signed commercial records and audit history."><div className={styles.documentPreview}><div><FileText aria-hidden="true" /><span>Statement of work</span><strong>Nova Studio · Brand launch</strong></div><dl><div><dt>Engagement</dt><dd>12 weeks</dd></div><div><dt>Fees</dt><dd>₹2,40,000</dd></div><div><dt>Status</dt><dd>Executed</dd></div></dl><span><FileCheck2 aria-hidden="true" /> Signed by both parties · audit recorded</span></div></WorkspacePreview>;
}

function AtlasSection() {
  return <section className={styles.atlasSection} id="atlas"><div className={styles.contentWidth}>
    <div className={styles.atlasHeading} data-reveal="copy"><div><StatusBadge tone="pro">PRO / ADVANCED</StatusBadge><span>   The intelligence layer</span><h2>Meet Miles.</h2></div><div><h3>Your agency has an AI operating layer now.</h3><p>Miles uses the same connected context your team works in, then turns intent into a reviewable plan and approved action.</p></div></div>
    <div data-reveal="depth" data-scroll-depth data-depth="0.4"><WorkspacePreview active="Miles AI" area="Miles AI" title="Miles Command Center" description="Workspace-aware analysis with approval-gated execution.">
      <div className={styles.atlasConversation}><div className={styles.conversationRail}><span><small>You</small>What’s happening with the agency this month?</span><span><small>Miles · analysis</small>Revenue, delivery, receivables and pipeline are ready. Three accounts need attention.</span><span><small>You</small>Create follow-ups and move the urgent work forward.</span></div><div className={styles.proposedActions}><div className={styles.panelHeader}><div><span>Proposed actions</span><strong>Review before execution</strong></div><StatusBadge tone="consent">CONFIRMATION REQUIRED</StatusBadge></div>{['Create follow-up for Nova Studio', 'Assign account owner', 'Schedule review meeting', 'Generate project status report'].map((item) => <span key={item}><Check aria-hidden="true" />{item}</span>)}<div><button type="button">Cancel</button><button type="button">Confirm 4 actions <ArrowRight aria-hidden="true" /></button></div></div></div>
      <div className={styles.atlasModes}>{[['ASK', 'Clients, projects, team, leads and finance'], ['ANALYZE', 'Performance, profit leakage and operational risk'], ['CREATE', 'Projects, tasks, invoices, reports and meetings'], ['ACT', 'Collect, review, confirm and execute']].map(([label, copy], index) => <article key={label}><span>0{index + 1}</span><strong>{label}</strong><p>{copy}</p></article>)}</div>
    </WorkspacePreview></div>
  </div></section>;
}

function TrustPanel() {
  const groups = [
    [KeyRound, 'Identity', 'Agency admin, team member, client and organization-scoped records.'],
    [Layers3, 'Permissions', 'Page-level delegation, assigned-work access and client-specific scope.'],
    [BadgeCheck, 'Consent', 'Independent Miles and Meta permissions, revocation and disconnect.'],
    [LockKeyhole, 'Security', 'Encrypted secrets, validated uploads, audit history and encrypted messages.'],
  ] as const;
  return <div className={styles.trustPanel} data-reveal="sequence">{groups.map(([Icon, label, copy], index) => <article key={label} style={{ '--reveal-index': index } as React.CSSProperties}><span>0{index + 1}</span><Icon aria-hidden="true" /><strong>{label}</strong><p>{copy}</p><small><i /> Enforced</small></article>)}</div>;
}

function FAQ() {
  const structuredData = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) };
  return <section className={styles.faqSection}><div className={styles.contentWidth}><SectionIntro index="10" eyebrow="QUESTIONS" title="The useful answers." /><div className={styles.faqList}>{faqItems.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /></div></section>;
}

export function IrisLanding() {
  return <main className={styles.landing} id="top">
    <LandingNavigation />
    <PageParallax>
    <section className={styles.hero}>
      <div className={styles.heroCopy} data-reveal="hero"><span className={styles.eyebrow}><i /> The Advanced operating system for modern agencies</span><h1>See it all. <span>Manage it all.</span></h1><p>Clients. Projects. Tasks. Team. Finances. Invoices. Reporting. Communication. And AI that actually gets work done.</p><div className={styles.heroActions}><Link className={styles.primaryButton} href="/signup">Start using IrisOS <ArrowRight aria-hidden="true" /></Link><a className={styles.secondaryButton} href="#product">See IrisOS in action <ArrowDown aria-hidden="true" /></a></div><div className={styles.trustLabels}>{['One connected workspace', 'Role-aware', 'AI-powered', 'Built for service businesses'].map((item) => <span key={item}><i />{item}</span>)}</div></div>
      <ParallaxWorkbench><HeroWorkspace /></ParallaxWorkbench>
      <div className={styles.heroStatement} data-reveal="copy"><span>One request</span><i /><span>Multiple actions</span><i /><strong>Zero busywork</strong></div>
    </section>

    <section className={styles.executionSection}><div className={styles.contentWidth}><SectionIntro index="01" eyebrow="SAFE EXECUTION" title="Miles can create the work." copy="IrisOS turns intent into a structured action summary. You review it. Miles executes only after confirmation." /><div data-reveal="depth"><AtlasExecutionDemo /></div></div></section>

    <section className={styles.integrationsSection} id="integrations"><div className={styles.contentWidth}><div className={styles.splitSection}><SectionIntro index="02" eyebrow="CONNECTED SERVICES" title="Works with the tools you already use." copy="Bring provider-backed workflows into one operating context. Integrations require the appropriate authorization; they are not endorsements." /><IntegrationNetwork /></div></div></section>

    <section className={styles.fragmentSection}><div className={styles.contentWidth}><div className={styles.fragmentCopy} data-reveal="copy"><span>03 / SYSTEM CONSOLIDATION</span><h2>You don’t need another app. <b>You need fewer of them.</b></h2><p>IrisOS connects the records external tools leave fragmented: the lead, the deal, the work, the money, the decision and the next action.</p></div><div className={styles.fragmentModules} data-reveal="modules" data-scroll-depth data-depth="0.5">{['CRM', 'Tasks', 'Sheets', 'Calendar', 'Invoices', 'Reports', 'Messages', 'AI'].map((item, index) => <span key={item}><small>0{index + 1}</small>{item}<i /></span>)}<div><span className={styles.logoMark} aria-hidden="true"><i /><i /></span><strong>IRISOS</strong><small>One source of truth</small></div></div></div></section>

    <section className={styles.productSection} id="product"><div className={styles.contentWidth}><SectionIntro index="04" eyebrow="THE OPERATING LAYER" title="One system. Every handoff." copy="Follow the same business context from opportunity to delivery, payment, reporting and the next Miles action." /><div className={styles.storyChain} data-reveal="sequence">{['Lead', 'Proposal', 'Client', 'Project', 'Task', 'Team', 'Approval', 'Invoice', 'Payment', 'Report', 'Miles insight'].map((item, index) => <span key={item}><small>{String(index + 1).padStart(2, '0')}</small>{item}{index < 10 && <i />}</span>)}</div><div data-reveal="depth"><ProductJourney /></div></div></section>

    <section className={styles.commercialSection}><div className={styles.contentWidth}><div className={styles.splitSection}><SectionIntro index="05" eyebrow="COMMERCIAL WORKFLOW" title="From proposal to payment without rebuilding the deal." copy="Identity, outcomes, commercial terms, approvals and billing move through one traceable record." /><DocumentWorkspacePreview /></div><CommercialFlow /></div></section>

    <AtlasSection />

    <section className={styles.coordinationSection}><div className={styles.contentWidth}><div className={styles.splitSection}><SectionIntro index="06" eyebrow="COORDINATION" title="Work and time stay connected." copy="Schedule with context. Keep conversations beside the work. Give every participant the view their role requires." /><div className={styles.availabilityStack}><StatusBadge tone="now">CALENDAR · AVAILABLE NOW</StatusBadge><StatusBadge tone="pro">MESSAGING · PRO / ADVANCED</StatusBadge></div></div><CoordinationPanel /></div></section>

    <section className={styles.rolesSection} id="roles"><div className={styles.contentWidth}><SectionIntro index="07" eyebrow="ROLE-AWARE WORKSPACE" title="One system. Different views." copy="Agency administrators, specialists and clients share context without sharing unrestricted access." /><RoleSwitcher /></div></section>

    <section className={styles.providerSection}><div className={styles.contentWidth}><div className={styles.providerGrid} data-reveal="depth"><div><StatusBadge tone="consent">CONSENT REQUIRED</StatusBadge><h2>Bring acquisition data into the operating system.</h2><p>Meta performance and Instant Form leads can enter IrisOS after provider authorization and explicit consent. Provider data remains provider-synced; IrisOS does not imply campaign editing.</p><div className={styles.providerMetrics}>{[['Spend', '₹84K'], ['Leads', '42'], ['CPL', '₹2K']].map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}</div></div><div className={styles.leadRoute}>{['Meta campaign', 'Instant Form lead', 'IrisOS pipeline', 'Qualification', 'Client'].map((item, index) => <span key={item}><i>{index + 1}</i><b>{item}</b>{index < 4 && <ArrowDown aria-hidden="true" />}</span>)}</div></div></div></section>

    <section className={styles.trustSection}><div className={styles.contentWidth}><SectionIntro index="08" eyebrow="GOVERNANCE" title="Powerful where it should be. Restricted where it matters." copy="IrisOS is connected, scoped and governed at every operating boundary." /><TrustPanel /></div></section>

    <section className={styles.beforeAfter}><div className={styles.contentWidth} data-reveal="depth"><div><span>Before IrisOS</span><h2>Work scattered across tools.</h2>{['Repeated data entry', 'Disconnected decisions', 'Hidden delivery risk', 'Reporting after the fact'].map((item) => <p key={item}><XMark />{item}</p>)}</div><i><ArrowRight aria-hidden="true" /></i><div><span>After IrisOS</span><h2>One operating context.</h2>{['One client record', 'Traceable handovers', 'Live commercial context', 'Miles-guided next action'].map((item) => <p key={item}><Check aria-hidden="true" />{item}</p>)}</div></div></section>

    <section className={styles.futureSection}><div className={styles.contentWidth}><div className={styles.futureHeader}><SectionIntro index="09" eyebrow="THE ROAD AHEAD" title="IrisOS is just getting started." copy="Today’s operating system is distinct from the product vision that expands it." /><div><StatusBadge tone="now">AVAILABLE NOW</StatusBadge><p>Command Center, leads, clients, projects, tasks, team, finance, documents, reporting, calendar, portal and administration.</p></div></div><div className={styles.futureGrid}>{[[Target, 'Design Hub', 'Canva-connected creative library, review, approvals and content operations.'], [Network, 'Automation & forecasting', 'Approval-aware workflows, capacity, revenue and cash-flow scenarios.'], [Sparkles, 'Expanded intelligence', 'Client health, profitability, churn, upsell and project-risk signals.']].map(([Icon, title, copy]) => { const FutureIcon = Icon as typeof Target; return <article key={title as string}><StatusBadge tone="future">COMING TO IrisOS</StatusBadge><FutureIcon aria-hidden="true" /><h3>{title as string}</h3><p>{copy as string}</p></article>; })}</div></div></section>

    <FAQ />

    <section className={styles.finalCta}><div data-reveal="depth"><Image className={styles.brandLogo} src="/iris-logo-black-bg.png" alt="" width={88} height={36} /><p>The operating layer connecting the entire agency.</p><h2>Your agency deserves one operating system.</h2><Link className={styles.primaryButton} href="/signup">Start using IrisOS <ArrowRight aria-hidden="true" /></Link></div></section>
    <footer className={styles.footer}><p>Run the business. See the context. Move the work.</p><div><span className={styles.wordmark}><Image className={styles.brandLogo} src="/iris-logo-black-bg.png" alt="" width={68} height={28} /></span><nav aria-label="Footer navigation"><a href="#product">Product</a><a href="#atlas">Miles</a><Link href="/pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><small>© 2026 IrisOS</small></div></footer>
    </PageParallax>
  </main>;
}

function XMark() {
  return <span className={styles.xMark} aria-hidden="true">×</span>;
}
