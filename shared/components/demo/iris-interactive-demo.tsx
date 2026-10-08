'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Eye, ShieldCheck } from 'lucide-react';
import { DemoModeProvider, useDemoMode } from '@/components/demo/demo-mode-provider';
import { WorkspaceShell } from '@/components/app-shell/workspace-shell';
import DashboardClient from '@/app/(app)/dashboard/dashboard-client';
import styles from './iris-interactive-demo.module.css';

const ClientsClient = dynamic(() => import('@/app/(app)/clients/clients-client'), { loading: () => <DemoPageSkeleton /> });
const FinanceClient = dynamic(() => import('@/app/(app)/finance/finance-client'), { loading: () => <DemoPageSkeleton /> });
const CalendarClient = dynamic(() => import('@/app/(app)/calendar/page'), { loading: () => <DemoPageSkeleton /> });
const AgencyLeadsClient = dynamic(() => import('@/app/(app)/agency-leads/page'), { loading: () => <DemoPageSkeleton /> });
const ProjectsClient = dynamic(() => import('@/app/(app)/projects/projects-client'), { loading: () => <DemoPageSkeleton /> });
const InvoicesClient = dynamic(() => import('@/app/(app)/invoices/page'), { loading: () => <DemoPageSkeleton /> });
const TasksClient = dynamic(() => import('@/app/(app)/tasks/tasks-client'), { loading: () => <DemoPageSkeleton /> });
const TeamClient = dynamic(() => import('@/app/(app)/team/team-client'), { loading: () => <DemoPageSkeleton /> });
const MessagesClient = dynamic(() => import('@/app/(app)/messages/messages-client'), { loading: () => <DemoPageSkeleton /> });
const ProposalsClient = dynamic(() => import('@/app/(app)/proposals/page'), { loading: () => <DemoPageSkeleton /> });
const DocumentsClient = dynamic(() => import('@/app/(app)/documents/page'), { loading: () => <DemoPageSkeleton /> });
const ReportingClient = dynamic(() => import('@/app/(app)/reporting/reporting-client'), { loading: () => <DemoPageSkeleton /> });
const StrategyClient = dynamic(() => import('@/app/(app)/strategy/page'), { loading: () => <DemoPageSkeleton /> });
const AtlasClient = dynamic(() => import('@/app/(app)/atlas/atlas-client'), { loading: () => <DemoPageSkeleton /> });
const SettingsClient = dynamic(() => import('@/app/(app)/settings/page'), { loading: () => <DemoPageSkeleton /> });

const supportedRoutes = new Set(['/dashboard', '/agency-leads', '/clients', '/projects', '/finance', '/invoices', '/tasks', '/team', '/calendar', '/messages', '/proposals', '/documents', '/reporting', '/strategy', '/analytics', '/atlas', '/settings']);
const demoFiscalRange = { start: '2026-07-01', end: '2026-09-30' } as const;

function DemoPageSkeleton() {
  return <div className={styles.pageSkeleton} aria-label="Loading demo workspace"><span /><span /><span /><span /></div>;
}

function DemoRoute() {
  const demo = useDemoMode();
  if (!demo) return null;
  const key = `${demo.pathname}-${demo.resetVersion}`;

  if (demo.pathname === '/dashboard') {
    return <DashboardClient key={key} initialData={{ dashboard: demo.state.dashboard, clients: demo.state.clients, tasks: demo.state.tasks, workspace: demo.state.workspace } as never} range={demoFiscalRange} />;
  }
  if (demo.pathname === '/clients') {
    return <ClientsClient key={key} initialData={{ clients: demo.state.clients, team: demo.state.team, canManageClients: true } as never} />;
  }
  if (demo.pathname === '/finance') {
    return <FinanceClient key={key} initialData={{ finance: demo.state.finance, clients: demo.state.clients, workspace: demo.state.workspace } as never} range={demoFiscalRange} />;
  }
  if (demo.pathname === '/calendar') return <CalendarClient key={key} />;
  if (demo.pathname === '/agency-leads') return <AgencyLeadsClient key={key} />;
  if (demo.pathname === '/projects') return <ProjectsClient key={key} initialData={{ projects: demo.state.projects, clients: demo.state.clients, teamMembers: demo.state.team, workspace: demo.state.workspace } as never} />;
  if (demo.pathname === '/invoices') return <InvoicesClient key={key} />;
  if (demo.pathname === '/tasks') return <TasksClient key={key} initialData={{ projects: demo.state.projects, tasks: demo.state.tasks, teamMembers: demo.state.team, currentUser: demo.state.workspace.user } as never} />;
  if (demo.pathname === '/team') return <TeamClient key={key} initialData={{ team: demo.state.team, projects: demo.state.projects, workspace: demo.state.workspace } as never} />;
  if (demo.pathname === '/messages') return <MessagesClient key={key} initialInbox={demo.state.messaging as never} />;
  if (demo.pathname === '/proposals') return <ProposalsClient key={key} />;
  if (demo.pathname === '/documents') return <DocumentsClient key={key} />;
  if (demo.pathname === '/reporting') return <ReportingClient key={key} initialData={{ reports: demo.state.reports, reportPagination: { hasMore: false, nextCursor: null }, clients: demo.state.clients.map((client) => ({ id: client.id, name: client.name })) } as never} />;
  if (demo.pathname === '/strategy' || demo.pathname === '/analytics') return <StrategyClient key={key} />;
  if (demo.pathname === '/atlas') return <AtlasClient key={key} initialData={demo.state.atlas as never} />;
  if (demo.pathname === '/settings') return <SettingsClient key={key} />;

  return <DashboardClient key={key} initialData={{ dashboard: demo.state.dashboard, clients: demo.state.clients, tasks: demo.state.tasks, workspace: demo.state.workspace } as never} range={demoFiscalRange} />;
}

function DemoWorkspace() {
  const demo = useDemoMode();
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setScale(window.innerWidth >= 1024 ? Math.min(1, frame.clientWidth / 1440) : 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  if (!demo) return null;

  const interceptNavigation = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    event.preventDefault();
    event.stopPropagation();
    if (href.startsWith('/') && !href.startsWith('/api/')) demo.navigate(href);
    else demo.showNotice('External links and production-connected actions are disabled in the interactive demo.');
  };

  const blockEditing = (event: React.SyntheticEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const labelControl = target.closest('label')?.querySelector('input, textarea, select');
    const datePickerButton = target.closest('[data-date-input-root] button');
    if (!target.closest('input, textarea, select, [contenteditable="true"]') && !labelControl && !datePickerButton) return;
    event.preventDefault();
    event.stopPropagation();
    demo.showNotice('This is a view-only demo. Form editing is disabled.');
  };

  const blockSubmission = (event: React.FormEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    demo.showNotice('This is a view-only demo. Creating and sending are disabled.');
  };

  return <>
    <div className={styles.toolbar}>
      <div><ShieldCheck aria-hidden="true" /><span><strong>View-only demo</strong> Explore every workspace without changing data.</span></div>
      <span className={styles.readOnlyBadge}><Eye aria-hidden="true" />Browse & inspect</span>
    </div>
    <div ref={frameRef} className={styles.viewportFrame} style={{ '--demo-scale': scale } as React.CSSProperties}>
      <div className={styles.viewportCanvas} onClickCapture={(event) => { interceptNavigation(event); blockEditing(event); }} onKeyDownCapture={blockEditing} onPasteCapture={blockEditing} onSubmitCapture={blockSubmission}>
        <WorkspaceShell initialWorkspace={demo.state.workspace}>
          <DemoRoute />
        </WorkspaceShell>
      </div>
    </div>
    <div className={styles.routeRail} aria-label="Demo shortcuts">
      {[['/dashboard', 'Dashboard'], ['/clients', 'Clients'], ['/finance', 'Finance'], ['/calendar', 'Calendar']].map(([href, label]) => <button key={href} type="button" data-active={demo.pathname === href} onClick={() => demo.navigate(href)}>{label}</button>)}
    </div>
    {demo.notice && <div className={styles.notice} role="status">{demo.notice}</div>}
  </>;
}

export default function IrisInteractiveDemo() {
  return <DemoModeProvider><DemoWorkspace /></DemoModeProvider>;
}

export { supportedRoutes };
