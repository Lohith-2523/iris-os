import * as React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { WorkspaceTour } from './workspace-tour';
import { WORKSPACE_AGENCY_LEADS_PREVIEW_EVENT, WORKSPACE_FINANCE_PREVIEW_EVENT, WORKSPACE_INVOICES_PREVIEW_EVENT, WORKSPACE_ONBOARDING_TOUR_PENDING_KEY, WORKSPACE_PROJECTS_PREVIEW_EVENT, WORKSPACE_QUICK_TOUR_EVENT, WORKSPACE_TOUR_CENTER_EVENT } from '@/lib/workspace-tour-config';

const adminTourAccess = { role: 'admin', plan: 'ADVANCED', deliveryWorkspace: false } as const;

function AgencyLeadTourTargets() {
  const [tab, setTab] = React.useState<'pipeline' | 'entry' | 'meta'>('pipeline');
  React.useEffect(() => {
    const changeTab = (event: Event) => setTab((event as CustomEvent<{ tab: 'pipeline' | 'entry' | 'meta' }>).detail.tab);
    window.addEventListener(WORKSPACE_AGENCY_LEADS_PREVIEW_EVENT, changeTab);
    return () => window.removeEventListener(WORKSPACE_AGENCY_LEADS_PREVIEW_EVENT, changeTab);
  }, []);
  return <>
    <button data-tour="leads-pipeline-tab">Pipeline tab</button>
    <button data-tour="add-lead">Add Leads tab</button>
    <button data-tour="meta-leads-tab">Meta tab</button>
    {tab === 'pipeline' && <div data-tour="lead-pipeline">Pipeline board</div>}
    {tab === 'entry' && <><form data-tour="add-lead-form">Lead form</form><div data-tour="lead-bulk-import">Lead import</div></>}
    {tab === 'meta' && <button data-tour="connect-meta-leads">Connect Meta</button>}
  </>;
}

function FinanceTourTargets() {
  const [tab, setTab] = React.useState<'overview' | 'manual'>('overview');
  React.useEffect(() => {
    const changeTab = (event: Event) => setTab((event as CustomEvent<{ tab: 'overview' | 'manual' }>).detail.tab);
    window.addEventListener(WORKSPACE_FINANCE_PREVIEW_EVENT, changeTab);
    return () => window.removeEventListener(WORKSPACE_FINANCE_PREVIEW_EVENT, changeTab);
  }, []);
  return <>
    <button data-tour="add-transaction">Ledger tab</button>
    {tab === 'overview' && <div data-tour="finance-summary">Finance cards</div>}
    {tab === 'manual' && <><form data-tour="transaction-form">Transaction form</form><div data-tour="recurring-subscriptions">Recurring costs</div><div data-tour="finance-bulk-import">Bulk import</div></>}
  </>;
}

function ProjectTourTargets() {
  const [view, setView] = React.useState<'overview' | 'create'>('overview');
  React.useEffect(() => {
    const changeView = (event: Event) => setView((event as CustomEvent<{ view: 'overview' | 'create' }>).detail.view);
    window.addEventListener(WORKSPACE_PROJECTS_PREVIEW_EVENT, changeView);
    return () => window.removeEventListener(WORKSPACE_PROJECTS_PREVIEW_EVENT, changeView);
  }, []);
  return <>
    {view === 'overview' && <><div data-tour="projects-overview">Project totals</div><button data-tour="create-project">New Project</button></>}
    {view === 'create' && <form data-tour="project-form"><div data-tour="project-payment">Project amount</div><div data-tour="project-budget">Internal budget</div><div data-tour="project-stages">Project stages</div><div data-tour="project-task">Starter task</div><button data-tour="save-project">Save</button></form>}
  </>;
}

function InvoiceTourTargets() {
  const [tab, setTab] = React.useState<'OVERVIEW' | 'TAX' | 'PROFORMA'>('OVERVIEW');
  React.useEffect(() => {
    const changeTab = (event: Event) => setTab((event as CustomEvent<{ tab: 'OVERVIEW' | 'TAX' | 'PROFORMA' }>).detail.tab);
    window.addEventListener(WORKSPACE_INVOICES_PREVIEW_EVENT, changeTab);
    return () => window.removeEventListener(WORKSPACE_INVOICES_PREVIEW_EVENT, changeTab);
  }, []);
  return <>
    <button type="button" data-tour="create-invoice">Tax Invoice</button>
    <button type="button" data-tour="create-proforma">Proforma Invoice</button>
    {tab === 'TAX' && <><form data-tour="invoice-form">Tax form</form><button data-tour="invoice-generate">Create tax invoice</button></>}
    {tab === 'PROFORMA' && <><div data-tour="proforma-lead">Lead</div><div data-tour="proforma-details">Details</div><div data-tour="proforma-items">Items</div><button data-tour="proforma-generate">Create proforma</button></>}
  </>;
}

describe('WorkspaceTour', () => {
  beforeEach(() => {
    router.push.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 40, y: 80, top: 80, left: 40, right: 240, bottom: 130, width: 200, height: 50,
      toJSON: () => ({}),
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function renderTour() {
    return render(
      <>
        <main data-tour="workspace-content"><InvoiceTourTargets /></main>
        <button type="button" className="iris-help-bubble">Get help</button>
        <button type="button" data-help-quick-tour>Quick Tour</button>
        <WorkspaceTour pathname="/invoices" userId="user-1" orgId="org-1" {...adminTourAccess} />
      </>,
    );
  }

  async function startInvoiceTour() {
    renderTour();
    act(() => window.dispatchEvent(new Event(WORKSPACE_QUICK_TOUR_EVENT)));
    await act(async () => { vi.advanceTimersByTime(50); });
  }

  it('shows Next on every card and does not require the highlighted action', async () => {
    await startInvoiceTour();

    expect(screen.getByRole('heading', { name: 'Tax invoice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tax Invoice' }));
    await act(async () => { vi.advanceTimersByTime(150); });
    expect(screen.getByRole('heading', { name: 'Tax invoice' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Tax invoice details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Create the tax invoice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });

  it('saves a postponed tour and opens the workflow center on request', async () => {
    await startInvoiceTour();
    fireEvent.click(screen.getByRole('button', { name: 'Skip All For Now' }));

    expect(screen.getByRole('heading', { name: 'Your walkthroughs are saved here' })).toBeInTheDocument();
    expect(Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.getItem(window.localStorage.key(index)!)).join(' ')).toContain('skipped');

    act(() => window.dispatchEvent(new Event(WORKSPACE_TOUR_CENTER_EVENT)));
    expect(screen.getByRole('heading', { name: 'Learn the workspace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create an invoice/ })).toBeInTheDocument();
  });

  it('shows client tours without exposing agency or team-only walkthroughs', () => {
    render(<WorkspaceTour pathname="/client-dashboard" userId="client-1" orgId="org-1" role="client" plan="PRO" deliveryWorkspace={false} />);

    act(() => window.dispatchEvent(new Event(WORKSPACE_TOUR_CENTER_EVENT)));

    expect(screen.getByRole('button', { name: /Client workspace/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Client projects/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Workspace overview/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Onboard a client/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create an invoice/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Team workspace/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Settings/ })).not.toBeInTheDocument();
  });

  it('does not start a Quick Tour for a page outside the current role', async () => {
    render(<><InvoiceTourTargets /><WorkspaceTour pathname="/invoices" userId="client-1" orgId="org-1" role="client" plan="PRO" deliveryWorkspace={false} /></>);

    act(() => window.dispatchEvent(new Event(WORKSPACE_QUICK_TOUR_EVENT)));
    await act(async () => { vi.advanceTimersByTime(100); });

    expect(screen.queryByRole('heading', { name: 'Tax invoice' })).not.toBeInTheDocument();
  });

  it('auto-starts only on the first dashboard visit immediately after onboarding', async () => {
    window.sessionStorage.setItem(WORKSPACE_ONBOARDING_TOUR_PENDING_KEY, '1');
    const { unmount } = render(<><button data-tour="header-miles">Miles</button><button data-tour="dashboard-date-range">Date range</button><WorkspaceTour pathname="/dashboard" userId="user-1" orgId="org-1" {...adminTourAccess} /></>);
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(screen.getByRole('heading', { name: 'Ask Miles' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(WORKSPACE_ONBOARDING_TOUR_PENDING_KEY)).toBeNull();
    unmount();

    render(<><button data-tour="header-miles">Miles</button><button data-tour="dashboard-date-range">Date range</button><WorkspaceTour pathname="/dashboard" userId="user-1" orgId="org-1" {...adminTourAccess} /></>);
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(screen.queryByRole('heading', { name: 'Ask Miles' })).not.toBeInTheDocument();
  });

  it('keeps the requested step when Next moves the tour to another page', async () => {
    const view = render(<><div data-tour="clients-overview">Clients</div><button data-tour="add-client">Add client</button><WorkspaceTour pathname="/clients" userId="user-1" orgId="org-1" {...adminTourAccess} /></>);
    act(() => window.dispatchEvent(new Event(WORKSPACE_QUICK_TOUR_EVENT)));
    await act(async () => { vi.advanceTimersByTime(50); });

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Add a client' })).toBeInTheDocument();
    const navigationButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(navigationButton);
    fireEvent.click(navigationButton);
    expect(router.push).toHaveBeenCalledWith('/clients/onboard');
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('iris:pending-workspace-tour')).toContain('"stepIndex":2');

    view.rerender(<><div data-tour="client-form">Client form</div><WorkspaceTour pathname="/clients/onboard" userId="user-1" orgId="org-1" {...adminTourAccess} /></>);
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(screen.getByRole('heading', { name: 'Client details' })).toBeInTheDocument();
  });

  it('opens project creation with Next and shows each setup area', async () => {
    render(<><ProjectTourTargets /><WorkspaceTour pathname="/projects" userId="user-1" orgId="org-1" {...adminTourAccess} /></>);
    act(() => window.dispatchEvent(new Event(WORKSPACE_QUICK_TOUR_EVENT)));
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(screen.getByRole('heading', { name: 'Projects overview' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Create a project' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Project details' })).toBeInTheDocument();
    expect(screen.getByText('Project amount')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Project amount' })).toBeInTheDocument();
  });

  it('uses Next to move through every Agency Leads tab', async () => {
    render(<><AgencyLeadTourTargets /><WorkspaceTour pathname="/agency-leads" userId="user-1" orgId="org-1" {...adminTourAccess} /></>);
    act(() => window.dispatchEvent(new Event(WORKSPACE_QUICK_TOUR_EVENT)));
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(screen.getByRole('heading', { name: 'Leads Pipeline' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Move leads forward' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Open Add Leads' })).toBeInTheDocument();
    expect(screen.getByText('Lead form')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Add a lead' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Import many leads' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Open Agency Meta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Meta' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Connect Meta for leads' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('opens the ledger before highlighting entry and bulk import', async () => {
    render(<><FinanceTourTargets /><WorkspaceTour pathname="/finance" userId="user-1" orgId="org-1" {...adminTourAccess} /></>);
    act(() => window.dispatchEvent(new Event(WORKSPACE_QUICK_TOUR_EVENT)));
    await act(async () => { vi.advanceTimersByTime(50); });

    expect(screen.getByRole('heading', { name: 'Check the totals' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Open the ledger' })).toBeInTheDocument();
    expect(screen.getByText('Transaction form')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Add one transaction' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Recurring subscriptions' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Import many transactions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });
});
