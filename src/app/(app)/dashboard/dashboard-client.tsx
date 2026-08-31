'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExpandableCard } from '@/components/ui/expandable-card';
import { Button } from '@/components/ui/button';

const RevenueLineChart = dynamic(
  () => import('@/components/ui/revenue-line-chart').then((module) => module.RevenueLineChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded bg-zinc-900/40" /> },
);
const ClientRevenueChart = dynamic(
  () => import('@/components/clients/client-revenue-chart').then((module) => module.ClientRevenueChart),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded bg-zinc-900/40" /> },
);
import {
  Sparkles,
  TrendingUp,
  Users,
  ReceiptText,
  ArrowDownRight,
  Plus,
  ArrowUpRight,
  Activity,
  ArrowRight,
  Bell,
  Zap,
  X,
  Calendar,
  Repeat2,
  ImageUp,
} from 'lucide-react';
import { formatCurrencyFor } from '@/lib/utils';
import { validateBrowserFile } from '@/lib/file-security';
import { MAX_SOURCE_IMAGE_BYTES, processBrowserImage } from '@/lib/browser-image-processing';
import type { DashboardReadModel } from '@/server/read-models/workspace-pages';

export default function DashboardPage({ initialData }: { initialData: DashboardReadModel }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formatCurrency = React.useCallback(
    (amount: number, decimals: number = 0) => formatCurrencyFor(
      amount,
      initialData.workspace.organization.currency,
      decimals,
    ),
    [initialData.workspace.organization.currency],
  );
  const initialPreferences = (initialData.workspace.organization.preferences && typeof initialData.workspace.organization.preferences === 'object'
    ? initialData.workspace.organization.preferences
    : {}) as Record<string, unknown>;
  const initialChecklist = (initialData.workspace.onboarding.checklist && typeof initialData.workspace.onboarding.checklist === 'object'
    ? initialData.workspace.onboarding.checklist
    : {}) as Record<string, any>;
  const connectedProviders = new Set(initialData.workspace.integrations.filter((item) => item.status === 'CONNECTED').map((item) => item.provider));
  const [isSkippedAll, setIsSkippedAll] = React.useState(Boolean(initialChecklist.skippedAll));
  const [isRevenueModalOpen, setIsRevenueModalOpen] = React.useState(false);
  // Keep dashboard metrics tied to the latest server read model. These values
  // update whenever the route is refreshed after a workspace mutation.
  const financeData = initialData.dashboard;
  const clientsList = initialData.clients;
  const [metaData, setMetaData] = React.useState<any>(null);
  const [tasksList] = React.useState<any[]>(initialData.tasks);
  const [calendarEvents, setCalendarEvents] = React.useState<any[]>([]);
  const [agencyLeadsData, setAgencyLeadsData] = React.useState<any>(null);
  const [currentUserName] = React.useState(initialData.workspace.user.name.split(' ')[0] || 'there');
  const [canManageWelcomeBackground] = React.useState(initialData.workspace.user.role.toLowerCase() === 'admin');
  const [welcomeBackground, setWelcomeBackground] = React.useState(typeof initialPreferences.welcomeCardBackgroundDataUrl === 'string' ? initialPreferences.welcomeCardBackgroundDataUrl : '');
  const [organizationPreferences, setOrganizationPreferences] = React.useState<Record<string, unknown>>(initialPreferences);
  const [welcomeBackgroundStatus, setWelcomeBackgroundStatus] = React.useState<'idle' | 'saving' | 'error'>('idle');
  const welcomeBackgroundInputRef = React.useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const addReceivableAsRevenue = (invoice: any) => {
    const amount = Number(invoice.balanceDue ?? invoice.pendingAmount ?? 0);
    router.push(`/finance?tab=manual&invoiceId=${encodeURIComponent(invoice.id)}&amount=${encodeURIComponent(String(amount))}`);
  };

  // Onboarding states
  const [needsOnboarding, setNeedsOnboarding] = React.useState(initialData.workspace.onboarding.needsOnboarding);
  const [onboardingState, setOnboardingState] = React.useState<{
    google: 'not_started' | 'connected' | 'skipped';
    meta: 'not_started' | 'connected' | 'skipped';
    financial: 'not_started' | 'uploaded' | 'skipped';
    leads: 'not_started' | 'uploaded' | 'skipped';
  }>({
    google: initialChecklist.google || (connectedProviders.has('GOOGLE') ? 'connected' : 'not_started'),
    meta: initialChecklist.meta || (connectedProviders.has('META') ? 'connected' : 'not_started'),
    financial: initialChecklist.financial || 'not_started',
    leads: initialChecklist.leads || 'not_started',
  });
  const [expandedChecklistIdx, setExpandedChecklistIdx] = React.useState<number | null>(0);
  const [connectingProvider, setConnectingProvider] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const googleConnectedParam = searchParams.get('google_connected');
      if (googleConnectedParam === 'true') {
        router.replace('/dashboard');
      }
    }
    if (searchParams.get('google_connected') === 'true') {
      setOnboardingState((current) => ({ ...current, google: 'connected' }));
    }
  }, [searchParams, router]);

  const saveWelcomeBackground = React.useCallback(async (dataUrl: string) => {
    setWelcomeBackgroundStatus('saving');
    const preferences = { ...organizationPreferences, welcomeCardBackgroundDataUrl: dataUrl || null };
    const response = await fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization: { preferences } }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setWelcomeBackgroundStatus('error');
      throw new Error(payload.error || 'The welcome-card background could not be saved.');
    }
    setOrganizationPreferences(preferences);
    setWelcomeBackground(dataUrl);
    setWelcomeBackgroundStatus('idle');
  }, [organizationPreferences]);

  const handleWelcomeBackground = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const validation = await validateBrowserFile(file, 'profile-avatar', { maxBytes: MAX_SOURCE_IMAGE_BYTES });
      if (!validation.ok) throw new Error(validation.error);
      const processed = await processBrowserImage(file, 'welcome-background');
      await saveWelcomeBackground(processed.dataUrl);
    } catch (reason) {
      setWelcomeBackgroundStatus('error');
      window.alert(reason instanceof Error ? reason.message : 'The selected background could not be saved.');
    }
  };

  const persistChecklist = React.useCallback((next: typeof onboardingState) => {
    return fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding: { checklist: next } }),
    });
  }, []);

  React.useEffect(() => {
    async function load() {
      try {
        const [metaRes, calendarRes, agencyLeadsRes, notificationRes] = await Promise.all([
          fetch('/api/meta-portal'),
          fetch('/api/calendar'),
          fetch('/api/agency-leads'),
          fetch('/api/notifications'),
        ]);

        const [meta, calendar, agencyLeads, notificationData] = await Promise.all([
          metaRes.ok ? metaRes.json() : null,
          calendarRes.ok ? calendarRes.json() : null,
          agencyLeadsRes.ok ? agencyLeadsRes.json() : null,
          notificationRes.ok ? notificationRes.json() : null,
        ]);

        if (meta) setMetaData(meta);
        if (calendar) setCalendarEvents(calendar.events || []);
        if (agencyLeads) setAgencyLeadsData(agencyLeads);
        if (notificationData) setNotifications(notificationData.notifications || []);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  
  const handleConnect = (id: string) => {
    if (id === 'google') {
      window.location.assign('/api/google/auth');
      return;
    }
    // Meta is marked connected only after the provider SDK reports a successful login.
    setConnectingProvider(id);
    window.setTimeout(() => setConnectingProvider(null), 500);
  };

  const handleGoogleSkip = () => {
    setOnboardingState(prev => {
      const next = { ...prev, google: 'skipped' as const };
      void persistChecklist(next);
      return next;
    });
  };

  const handleMetaSkip = () => {
    setOnboardingState(prev => {
      const next = { ...prev, meta: 'skipped' as const };
      void persistChecklist(next);
      return next;
    });
  };

  const handleFinancialSkip = () => {
    setOnboardingState(prev => {
      const next = { ...prev, financial: 'skipped' as const };
      void persistChecklist(next);
      return next;
    });
  };

  const handleLeadsSkip = () => {
    setOnboardingState(prev => {
      const next = { ...prev, leads: 'skipped' as const };
      void persistChecklist(next);
      return next;
    });
  };

  const downloadFinancialTemplate = () => {
    const csvContent = "Type,Identifier,Name,Amount,Date,Status\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "financial_onboarding_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadLeadsTemplate = () => {
    const csvContent = "Full Name,Email,Phone,Status,Funnel Name,Collection Method,Approach Method\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "leads_onboarding_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFinancialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = await validateBrowserFile(file, 'csv-import', { maxBytes: 5 * 1024 * 1024 });
    if (!validation.ok) return alert(validation.error);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length <= 1) {
        alert('File is empty or invalid.');
        return;
      }

      const rows = [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }

      try {
        const res = await fetch('/api/onboarding/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'financial', data: rows }),
        });

        if (res.ok) {
          const result = await res.json();
          alert(`Successfully uploaded ${result.invoices} invoices and ${result.expenses} expenses!`);
          setOnboardingState(prev => {
            const next = { ...prev, financial: 'uploaded' as const };
            void persistChecklist(next);
            return next;
          });
        } else {
          alert('Failed to upload financial data. Please check template format.');
        }
      } catch (err) {
        console.error(err);
        alert('Error uploading financial data.');
      }
    };
    reader.readAsText(file);
  };

  const handleLeadsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = await validateBrowserFile(file, 'csv-import', { maxBytes: 5 * 1024 * 1024 });
    if (!validation.ok) return alert(validation.error);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length <= 1) {
        alert('File is empty or invalid.');
        return;
      }

      const rows = [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }

      try {
        const res = await fetch('/api/onboarding/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'leads', data: rows }),
        });

        if (res.ok) {
          const result = await res.json();
          alert(`Successfully uploaded ${result.count} leads!`);
          setOnboardingState(prev => {
            const next = { ...prev, leads: 'uploaded' as const };
            void persistChecklist(next);
            return next;
          });
        } else {
          alert('Failed to upload leads. Please check template format.');
        }
      } catch (err) {
        console.error(err);
        alert('Error uploading leads.');
      }
    };
    reader.readAsText(file);
  };

  const handleFinishOnboarding = async () => {
    const isGoogleSkipped = onboardingState.google === 'skipped';
    const isMetaSkipped = onboardingState.meta === 'skipped';
    const isFinancialSkipped = onboardingState.financial === 'skipped';
    const isLeadsSkipped = onboardingState.leads === 'skipped';

    const skippedAll = isGoogleSkipped && isMetaSkipped && isFinancialSkipped && isLeadsSkipped;

    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google: onboardingState.google,
          meta: onboardingState.meta,
          financial: onboardingState.financial,
          leads: onboardingState.leads,
          skippedAll
        })
      });

      if (res.ok) {
        setIsSkippedAll(skippedAll);
        setNeedsOnboarding(false);
        window.location.reload();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to complete onboarding on server: ${errorData.error || res.statusText || 'Unknown error'}${errorData.details ? ` (${errorData.details})` : ''}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error completing onboarding.');
    }
  };

  // Computations for Meta Ads Reports
  const ads = React.useMemo(() => {
    if (!metaData) return [];
    const list: any[] = [];
    (metaData.campaigns || []).forEach((c: any) => {
      if (c.ads) list.push(...c.ads);
    });
    return list;
  }, [metaData]);

  const adReports = React.useMemo(() => {
    const leads = metaData?.leads || [];
    const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0);
    const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
    const totalLeads = leads.length;

    const closedLeads = leads.filter((l: any) => l.status?.toLowerCase() === 'closed').length;
    const procuredLeads = leads.filter((l: any) => l.status?.toLowerCase() === 'procured' || l.status?.toLowerCase() === 'new').length;
    const warmLeads = leads.filter((l: any) => l.status?.toLowerCase() === 'warm' || l.status?.toLowerCase() === 'cold-call in progress').length;
    const coldLeads = leads.filter((l: any) => l.status?.toLowerCase() === 'cold' || l.status?.toLowerCase() === 'call back required').length;

    // Report metrics calculations
    const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    
    // 1. Conversion rate uses closed leads: (Closed Leads / Total Leads) * 100
    const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;
    
    // 2. CAC uses closed leads: Total Spend / Closed Leads
    const cac = closedLeads > 0 ? totalSpend / closedLeads : 0;
    
    // Revenue is not available from the Meta provider payload, so do not invent a ROAS.
    const roas = null;
    const impressionsPerCurrency = totalSpend > 0 ? totalImpressions / totalSpend : 0;

    return {
      totalSpend,
      totalImpressions,
      totalLeads,
      closedLeads,
      procuredLeads,
      warmLeads,
      coldLeads,
      cpl,
      conversionRate,
      cac,
      roas,
      impressionsPerCurrency
    };
  }, [ads, metaData]);

  const warmLeads = React.useMemo(() => {
    const leads = metaData?.leads || [];
    return leads.filter((l: any) => l.status?.toLowerCase() === 'warm');
  }, [metaData]);

  const agencyLeadsList = React.useMemo(() => {
    if (agencyLeadsData?.leads && agencyLeadsData.leads.length > 0) {
      return agencyLeadsData.leads;
    }
    return [];
  }, [agencyLeadsData]);

  const warmAgencyLeads = React.useMemo(() => {
    return agencyLeadsList.filter((l: any) => l.status?.toLowerCase() === 'warm');
  }, [agencyLeadsList]);


  const top2Clients = React.useMemo(() => {
    return [...clientsList]
      .sort((a, b) => Number(b.contractValue || 0) - Number(a.contractValue || 0))
      .slice(0, 2);
  }, [clientsList]);

  const sortedClients = React.useMemo(() => {
    return [...clientsList]
      .sort((a, b) => Number(b.contractValue || 0) - Number(a.contractValue || 0));
  }, [clientsList]);

  const monthlyRetainerProjects = React.useMemo(() => {
    return clientsList
      .flatMap((client: any) => (client.projects || []).map((project: any) => ({
        id: project.id,
        name: project.name,
        clientName: client.name,
        amount: Number(project.paymentAmount || 0),
        paymentType: String(project.paymentType || '').toUpperCase(),
        frequency: String(project.paymentFrequency || '').toLowerCase(),
        status: String(project.status || '').toUpperCase(),
      })))
      .filter((project: any) => {
        return project.paymentType === 'RETAINER'
          && project.frequency === 'monthly'
          && project.amount > 0
          && project.status !== 'COMPLETED'
          && project.status !== 'ON_HOLD';
      })
      .sort((left: any, right: any) => right.amount - left.amount || left.name.localeCompare(right.name));
  }, [clientsList]);

  const monthlyRecurringRevenue = React.useMemo(
    () => monthlyRetainerProjects.reduce((total: number, project: any) => total + project.amount, 0),
    [monthlyRetainerProjects],
  );
  const formattedMonthlyRecurringRevenue = React.useMemo(
    () => formatCurrency(monthlyRecurringRevenue),
    [formatCurrency, monthlyRecurringRevenue],
  );

  const priorityTasks = React.useMemo(() => {
    if (!tasksList || tasksList.length === 0) return [];
    return [...tasksList]
      .filter((t: any) => t.status !== 'DONE')
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }, [tasksList]);

  const todayEvents = React.useMemo(() => {
    if (!calendarEvents || calendarEvents.length === 0) return [];

    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date();
    endOfToday.setHours(23,59,59,999);

    return calendarEvents
      .filter((ev: any) => {
        const d = new Date(ev.startTime);
        return d >= startOfToday && d <= endOfToday;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [calendarEvents]);

  return (
    <div className="dashboard-canvas space-y-6">
      {/* Page Header */}
      <div className="dashboard-header dashboard-command-center relative isolate flex flex-col gap-2 overflow-hidden md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div aria-hidden="true" className="dashboard-command-center-banner absolute inset-0 pointer-events-none" style={welcomeBackground ? { backgroundImage: `url(${welcomeBackground})`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined} />
        <div className="relative z-10">
          <div className="dashboard-welcome-card inline-flex items-center gap-3 rounded-2xl border border-zinc-700 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 px-5 py-3 shadow-[inset_0_1px_rgba(255,255,255,.08),0_12px_40px_rgba(0,0,0,.25)]">
            <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Welcome, {currentUserName}</h1>
          </div>
          <p className="mt-3 text-zinc-500">Real-time financial, operational, and paid creative performance intelligence.</p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-300 py-1 px-3">
            Q2 Financial Year 2026
          </Badge>
          {canManageWelcomeBackground && <>
            <input ref={welcomeBackgroundInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => void handleWelcomeBackground(event)} />
            <Button type="button" variant="outline" disabled={welcomeBackgroundStatus === 'saving'} onClick={() => welcomeBackgroundInputRef.current?.click()} className="min-h-11 whitespace-nowrap border-zinc-700 bg-zinc-950/75 text-xs text-zinc-200 backdrop-blur-md hover:bg-zinc-900"><ImageUp className="h-4 w-4" />{welcomeBackgroundStatus === 'saving' ? 'Saving image…' : welcomeBackground ? 'Replace background' : 'Upload background'}</Button>
            {welcomeBackground && <Button type="button" variant="ghost" disabled={welcomeBackgroundStatus === 'saving'} onClick={() => void saveWelcomeBackground('').catch((reason) => { setWelcomeBackgroundStatus('error'); window.alert(reason instanceof Error ? reason.message : 'The background could not be removed.'); })} className="min-h-11 whitespace-nowrap text-xs text-zinc-300 hover:text-white"><X className="h-4 w-4" />Remove</Button>}
          </>}
        </div>
      </div>

      {needsOnboarding ? (
        <div className="min-h-[500px] flex items-center justify-center py-6">
          <Card className="w-full max-w-xl bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl relative">
            <CardHeader className="text-center border-b border-zinc-800/80 pb-5">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Workspace Activation</span>
              <CardTitle className="text-lg font-bold uppercase tracking-tight text-white mt-1">Connect Your Integrations</CardTitle>
              <CardDescription className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Link your active design, communication, ads, and workflow APIs or load your CSV data to populate your databases.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6 space-y-4">
              <div className="space-y-3">
                {[
                  {
                    id: 'google',
                    name: 'Google Services & Authentication',
                    description: 'Authorize email tracking, profile sync, and access token retrieval for Google Drive creative assets.',
                    status: onboardingState.google,
                    type: 'connect' as const
                  },
                  {
                    id: 'meta',
                    name: 'Meta Ads Manager Integration',
                    description: 'Synchronize live campaign indicators, target audience profiles, conversion statistics, and actual ROAS metrics.',
                    status: onboardingState.meta,
                    type: 'connect' as const
                  },
                  {
                    id: 'financial',
                    name: 'Financial Ledger & Invoices',
                    description: 'Load your agency financial ledger details, invoice records, and operational expenditures using our template.',
                    status: onboardingState.financial,
                    type: 'upload' as const,
                    downloadTemplate: downloadFinancialTemplate,
                    handleUpload: handleFinancialUpload
                  },
                  {
                    id: 'leads',
                    name: 'Leads Data & Pipelines',
                    description: 'Load your marketing leads database, pipeline stages, funnel structures, and acquisition sources.',
                    status: onboardingState.leads,
                    type: 'upload' as const,
                    downloadTemplate: downloadLeadsTemplate,
                    handleUpload: handleLeadsUpload
                  }
                ].map((item, idx) => {
                  const isExpanded = expandedChecklistIdx === idx;
                  const isCompleted = item.status !== 'not_started';
                  const isSkipped = item.status === 'skipped';
                  const isConnectedOrUploaded = item.status === 'connected' || item.status === 'uploaded';

                  return (
                    <div key={item.id} className="border border-zinc-850 bg-zinc-900/20">
                      <button
                        type="button"
                        onClick={() => setExpandedChecklistIdx(isExpanded ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs tracking-wide uppercase text-white hover:bg-zinc-900/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${
                            isCompleted 
                              ? isSkipped ? 'bg-amber-600 border-amber-600 text-white' : 'bg-red-650 border-red-600 text-white' 
                              : 'border-zinc-700 text-transparent'
                          }`}>
                            {isCompleted && (
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCompleted && (
                            <Badge variant={isSkipped ? "default" : "risk-low"} className={`py-0.5 px-2 text-[9px] uppercase ${isSkipped ? 'bg-zinc-850 text-zinc-400 border-zinc-700' : ''}`}>
                              {isSkipped ? 'Skipped' : isConnectedOrUploaded ? (item.type === 'connect' ? 'Connected' : 'Uploaded') : 'Done'}
                            </Badge>
                          )}
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </span>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="p-4 border-t border-zinc-850 bg-zinc-950/40 text-xs text-zinc-400 space-y-4 font-sans font-medium leading-relaxed">
                          <p>{item.description}</p>
                          <div className="flex items-center justify-between gap-4 pt-2">
                            <div>
                              {item.type === 'upload' && !isCompleted && (
                                <Button
                                  size="sm"
                                  onClick={item.downloadTemplate}
                                  className="h-8 text-[10px] border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 cursor-pointer font-bold uppercase"
                                >
                                  Download Template
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!isCompleted ? (
                                <>
                                  {item.type === 'connect' ? (
                                    <Button
                                      size="sm"
                                      disabled={connectingProvider !== null}
                                      onClick={() => handleConnect(item.id)}
                                      className="h-8 text-[10px] bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer font-bold uppercase flex items-center gap-1.5"
                                    >
                                      {connectingProvider === item.id ? (
                                        <>
                                          <span className="h-3 w-3 animate-spin rounded-full border border-t-transparent border-zinc-950" />
                                          <span>Authorizing...</span>
                                        </>
                                      ) : (
                                        <>
                                          <span>Connect Integration</span>
                                          <ArrowUpRight className="h-3 w-3 text-zinc-950" />
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <div className="relative">
                                      <Button
                                        size="sm"
                                        className="h-8 text-[10px] bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer font-bold uppercase"
                                      >
                                        Upload CSV
                                      </Button>
                                      <input
                                        type="file"
                                        accept=".csv"
                                        onChange={item.handleUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                      />
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (item.id === 'google') handleGoogleSkip();
                                      else if (item.id === 'meta') handleMetaSkip();
                                      else if (item.id === 'financial') handleFinancialSkip();
                                      else if (item.id === 'leads') handleLeadsSkip();
                                    }}
                                    className="h-8 text-[10px] border-zinc-800 text-zinc-400 hover:text-white cursor-pointer font-bold uppercase"
                                  >
                                    Skip Step
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="risk-low" className="py-1 px-3">
                                  {isSkipped ? 'Skipped' : 'Verification Active'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
 
              {Object.values(onboardingState).every(val => val !== 'not_started') && (
                <div className="pt-4 border-t border-zinc-800 mt-6">
                  <Button
                    onClick={handleFinishOnboarding}
                    className="w-full h-11 font-bold text-xs bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] animate-pulse"
                  >
                    <span>Launch Agency Console</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Grid of Executive Metric Cards */}
           {/* Executive metric composition */}
          <div className="space-y-6">
            {/* MRR anchors four supporting finance metrics. */}
            <div className="dashboard-metric-grid grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <ExpandableCard 
              className="dashboard-metric-card dashboard-metric-revenue min-h-[164px] flex flex-col justify-between"
              expandedContent={
                <div className="flex h-full min-h-0 flex-col gap-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Revenue Breakdown</h3>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                    {financeData?.revenueByClient?.length ? financeData.revenueByClient.map((client: any, index: number) => (
                      <div key={client.id} className="flex justify-between items-center text-xs text-zinc-300 py-1.5 border-b border-zinc-800/50">
                        <span className="font-semibold truncate pr-3">{index + 1}. {client.name}</span>
                        <span className="font-mono text-emerald-400 font-bold">{formatCurrency(client.revenue)}</span>
                      </div>
                    )) : <p className="py-4 text-xs text-zinc-500">No paid invoices have been recorded yet.</p>}
                  </div>
                </div>
              }
              expandedFooter={
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRevenueModalOpen(true);
                  }}
                  className="w-full h-9 text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                >
                  Show more
                </Button>
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {financeData ? formatCurrency(financeData.currentMonthRevenue) : formatCurrency(0)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
                  {financeData?.monthlyChangePercent !== null && financeData?.monthlyChangePercent !== undefined ? <><ArrowUpRight className="h-3.5 w-3.5" /><span>{financeData.monthlyChangePercent >= 0 ? '+' : ''}{financeData.monthlyChangePercent.toFixed(1)}% vs last month</span></> : <span>No prior-month comparison</span>}
                </div>
              </CardContent>
            </ExpandableCard>
 
            <ExpandableCard 
              className="dashboard-metric-card dashboard-metric-profit min-h-[164px] flex flex-col justify-between"
              expandedContent={
                <div className="flex flex-col h-full space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operating Profit Breakdown</h3>
                  <div className="space-y-3 font-sans text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-zinc-855">
                      <span className="text-zinc-400 font-semibold">Gross Billings</span>
                      <span className="font-mono text-white font-bold">
                        {financeData ? formatCurrency(financeData.grossBillings) : formatCurrency(0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-855">
                      <span className="text-zinc-400 font-semibold">Total Expenses</span>
                      <span className="font-mono text-rose-400 font-bold">
                        {financeData ? formatCurrency(financeData.totalExpenses) : formatCurrency(0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-zinc-300 font-semibold">Operating Profit</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {financeData ? formatCurrency(financeData.grossBillings - financeData.totalExpenses) : formatCurrency(0)}
                      </span>
                    </div>
                  </div>
                </div>
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Net Profit (Amount)</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-450" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
                  {financeData ? formatCurrency(financeData.grossBillings - financeData.totalExpenses) : formatCurrency(0)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Net agency earnings</span>
                </div>
              </CardContent>
            </ExpandableCard>

            <ExpandableCard
              className="dashboard-metric-card dashboard-metric-mrr flex min-h-[182px] flex-col justify-between"
              expandedContent={
                <div className="flex h-full min-h-0 flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Monthly Recurring Projects</h3>
                    <p className="mt-1 text-xs text-zinc-400">Active monthly retainers, ranked by recurring revenue.</p>
                  </div>
                  <div className="min-h-0 flex-1 divide-y divide-zinc-800/70 overflow-y-auto pr-1">
                    {monthlyRetainerProjects.length > 0 ? monthlyRetainerProjects.map((project: any, index: number) => (
                      <div key={project.id} className="flex items-center justify-between gap-4 py-3 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-200">{index + 1}. {project.name}</p>
                          <p className="mt-0.5 truncate text-[10px] text-zinc-400">{project.clientName}</p>
                        </div>
                        <span className="shrink-0 font-mono font-bold text-white">{formatCurrency(project.amount)}</span>
                      </div>
                    )) : (
                      <p className="py-6 text-center text-xs text-zinc-400">No active monthly retainer projects.</p>
                    )}
                  </div>
                </div>
              }
            >
              <div className="dashboard-mrr-summary h-full min-h-0">
                <CardHeader className="dashboard-mrr-header flex flex-row items-center justify-between pb-1">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Monthly Recurring Revenue</CardTitle>
                  <Repeat2 className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                </CardHeader>
                <CardContent className="dashboard-mrr-content text-center">
                  <output
                    className="dashboard-mrr-value font-mono font-bold tracking-tight text-emerald-400"
                    aria-label={`Monthly recurring revenue: ${formattedMonthlyRecurringRevenue}`}
                    aria-live="polite"
                  >
                    {formattedMonthlyRecurringRevenue}
                  </output>
                  <p className="dashboard-mrr-caption text-[10px] font-semibold text-zinc-400">
                    {monthlyRetainerProjects.length} active monthly {monthlyRetainerProjects.length === 1 ? 'retainer' : 'retainers'}
                  </p>
                </CardContent>
              </div>
            </ExpandableCard>
 
            <ExpandableCard
              className="dashboard-metric-card dashboard-metric-expenses min-h-[164px] flex flex-col justify-between"
              expandedContent={
                <div className="flex h-full flex-col space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Expense Overview</h3>
                  <div className="space-y-3 font-sans text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-855 py-2">
                      <span className="font-semibold text-zinc-400">Gross Billings</span>
                      <span className="font-mono font-bold text-white">
                        {financeData ? formatCurrency(financeData.grossBillings) : formatCurrency(0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-855 py-2">
                      <span className="font-semibold text-zinc-400">Total Expenses</span>
                      <span className="font-mono font-bold text-rose-400">
                        {financeData ? formatCurrency(financeData.totalExpenses) : formatCurrency(0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-zinc-300">Expense Ratio</span>
                      <span className="font-mono font-bold text-zinc-200">
                        {financeData?.grossBillings > 0 ? `${((financeData.totalExpenses / financeData.grossBillings) * 100).toFixed(1)}%` : '0.0%'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 border-t border-zinc-800 pt-5">
                    <Button
                      type="button"
                      className="h-9 w-full gap-2 text-xs font-semibold"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push('/finance?tab=manual&transactionType=Expense');
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add expense
                    </Button>
                  </div>
                </div>
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Expenses</CardTitle>
                <ReceiptText className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">
                  {financeData ? formatCurrency(financeData.totalExpenses) : formatCurrency(0)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-400 font-semibold">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  <span>Recorded operating expenses</span>
                </div>
              </CardContent>
            </ExpandableCard>
 
            <ExpandableCard 
              className="dashboard-metric-card dashboard-metric-receivables min-h-[164px] flex flex-col justify-between"
              expandedContent={
                <div className="flex h-full min-h-0 flex-col space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pending Receivables</h3>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {(financeData?.outstandingInvoices || []).length ? financeData.outstandingInvoices.map((invoice: any, index: number) => (
                      <div key={invoice.id} className="flex items-center justify-between gap-3 border-b border-zinc-800/70 pb-2 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-200">{index + 1}. {invoice.invoiceNumber}</p>
                          <p className="truncate text-[10px] text-zinc-500">{invoice.clientName}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{formatCurrency(invoice.pendingAmount)}</span>
                          <Button size="sm" className="h-7 px-2 text-[10px]" onClick={(event) => { event.stopPropagation(); addReceivableAsRevenue(invoice); }}>
                            Add revenue
                          </Button>
                        </div>
                      </div>
                    )) : <p className="text-xs text-zinc-500">No invoices have an outstanding balance.</p>}
                  </div>
                </div>
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pending Receivables</CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-amber-400">
                  {financeData ? formatCurrency(financeData.outstandingAmount) : formatCurrency(0)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
                  <span>Invoices not fully paid</span>
                </div>
              </CardContent>
            </ExpandableCard>
            </div>

            {/* Middle Row */}
            <div className="grid gap-6 xl:grid-cols-[minmax(180px,0.9fr)_minmax(420px,3.2fr)_minmax(180px,0.9fr)] xl:items-stretch">
            <div className="flex min-h-[560px] flex-col gap-6">
              <ExpandableCard 
                className="min-h-[230px] flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex h-full min-h-0 flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Agency Leads Pipeline</h3>
                      <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-400 text-[9px] uppercase font-mono rounded-md">
                        {agencyLeadsList.length} Total Leads
                      </Badge>
                    </div>
                    
                    <div className="min-h-0 flex-1 divide-y divide-zinc-900 overflow-y-auto border-t border-zinc-900 pr-1">
                      {agencyLeadsList.length > 0 ? (
                        agencyLeadsList.map((l: any) => {
                          const isWarmFirstTwo = warmAgencyLeads.slice(0, 2).some((wl: any) => wl.leadId === l.leadId);
                          if (isWarmFirstTwo) return null;
                          
                          return (
                            <div key={l.id || l.leadId} className="flex items-center justify-between py-2 text-xs">
                              <div className="truncate pr-2">
                                <span className="block font-semibold text-zinc-250 truncate">{l.fullName}</span>
                                <span className="block text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{l.email}</span>
                              </div>
                              <Badge 
                                variant={
                                  l.status?.toLowerCase() === 'closed' ? 'risk-low' :
                                  l.status?.toLowerCase() === 'lost' ? 'outline' :
                                  l.status?.toLowerCase() === 'warm' ? 'risk-medium' : 'default'
                                }
                                className="text-[9px] px-1.5 py-0 uppercase shrink-0 rounded-md"
                              >
                                {l.status}
                              </Badge>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center text-zinc-650 text-[11px] py-4">No other leads found.</div>
                      )}
                    </div>

                  </div>
                }
                expandedFooter={
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = '/agency-leads';
                    }}
                    className="w-full h-8 font-semibold bg-white hover:bg-zinc-200 text-zinc-950 text-[11px] flex items-center justify-center gap-1 cursor-pointer rounded-md"
                  >
                    <span>See more</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Agency Leads</CardTitle>
                  <Users className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-xl font-bold font-mono text-white">
                      {agencyLeadsList.length} Total
                    </div>
                  </div>
                  <div className="space-y-2">
                    {warmAgencyLeads.slice(0, 2).map((l: any) => (
                      <div key={l.id || l.leadId} className="flex justify-between items-center bg-zinc-900/35 border border-zinc-900/60 p-2 rounded-md">
                        <div className="truncate pr-2">
                          <span className="block text-[11px] font-semibold text-zinc-250 truncate">{l.fullName}</span>
                        </div>
                        <Badge variant="risk-medium" className="text-[8px] px-1 py-0 uppercase shrink-0 rounded-md">
                          Warm
                        </Badge>
                      </div>
                    ))}
                    {warmAgencyLeads.length === 0 && (
                      <div className="text-[10px] text-zinc-600 italic py-1">No warm leads currently.</div>
                    )}
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard 
                className="min-h-[200px] flex-1 flex flex-col justify-between overflow-hidden cursor-default hover:ring-0"
                disableExpand={true}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Quick Actions</CardTitle>
                  <Zap className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center items-center gap-3 min-h-[112px] pt-2 pb-6">
                  <div className="flex flex-col gap-3.5 w-full items-center justify-center">
                    <Button
                      size="lg"
                      className="w-full max-w-[180px] text-[11px] font-bold uppercase tracking-widest bg-zinc-100 border border-zinc-300 text-zinc-950 hover:bg-white rounded-md h-11"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = '/clients/onboard';
                      }}
                    >
                      Add Client
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full max-w-[180px] text-[11px] font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-md h-11"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = '/atlas';
                      }}
                    >
                      Ask Atlas
                    </Button>
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard className="flex-[1.15] flex flex-col justify-between overflow-hidden" expandedContent={<div className="divide-y divide-zinc-900">{notifications.map((item) => <button key={item.id} onClick={() => item.href && router.push(item.href)} className="block w-full py-3 text-left"><div className="font-semibold text-white">{item.title}</div><div className="mt-1 text-zinc-500">{item.body}</div></button>)}{notifications.length === 0 && <div className="py-8 text-center text-zinc-500">No pending notifications.</div>}</div>}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Notifications</CardTitle>
                  <Bell className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-xl font-bold font-mono text-white">{notifications.filter((item) => !item.readAt).length} Unread</div>
                  </div>
                  <div className="space-y-2">
                    {notifications.slice(0, 2).map((item) => <button key={item.id} onClick={() => item.href && router.push(item.href)} className="block w-full rounded-xl border border-zinc-900 bg-zinc-900/35 p-2 text-left h-14"><span className="block truncate font-semibold text-zinc-200">{item.title}</span><span className="mt-0.5 block truncate text-[9px] leading-3 text-zinc-500">{item.type}</span></button>)}
                    {notifications.length === 0 && <div className="text-zinc-600 italic py-1">You’re all caught up.</div>}
                  </div>
                </CardContent>
              </ExpandableCard>
            </div>
            
            <div className="min-h-[560px]">
              <div className="h-full w-full">
            <RevenueLineChart 
              title="Overall Revenue, Expenses & Receivables"
              description="Recognized revenue, recorded expenses, and pending receivables over time"
              className="h-full min-h-[560px] w-full"
              contentClassName="h-[430px] md:h-[452px]"
              data={financeData?.revenueHistory ?? []}
              currencyRate={1}
            />
          </div>
            </div>

            <div className="flex min-h-[560px] flex-col gap-6">
              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Clients Portfolio (by Contract Value)</h3>
                    </div>
                    <div className="min-h-0 flex-1 divide-y divide-zinc-900 overflow-y-auto border-t border-zinc-900">
                      {sortedClients.length > 0 ? (
                        sortedClients.map((client: any) => (
                          <div key={client.id} className="flex items-center justify-between py-4">
                            <div>
                              <span className="block text-xs font-semibold text-white">{client.name}</span>
                              <span className="text-[10px] text-zinc-500 mt-1 block font-mono">{client.domain}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 text-right">
                              <span className="text-[10px] font-medium text-zinc-500">Contract value</span>
                              <span className="text-[11px] font-mono font-bold text-emerald-450">
                                {formatCurrency(Number(client.contractValue || 0))}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-zinc-500 text-xs">
                          No onboarded clients found.
                        </div>
                      )}
                    </div>
                  </div>
                }
                expandedFooter={
                  <Link href="/clients" prefetch={false} onClick={(e) => e.stopPropagation()} className="w-full">
                    <Button variant="outline" size="sm" className="h-7 w-full text-[10px] border-zinc-800 text-zinc-300 font-semibold px-2 hover:text-white rounded-none">
                      View All
                    </Button>
                  </Link>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Onboarded Clients</CardTitle>
                  <Users className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="text-xl font-bold font-mono text-white">
                      {clientsList.length} Total
                    </div>
                  </div>
                  <div className="space-y-2">
                    {top2Clients.map((client: any) => (
                      <div key={client.id} className="flex items-center bg-zinc-900/35 border border-zinc-900/65 p-2 rounded-none">
                        <div className="min-w-0 truncate">
                          <span className="block text-[11px] font-semibold text-zinc-250 truncate">{client.name}</span>
                        </div>
                      </div>
                    ))}
                    {clientsList.length === 0 && (
                      <div className="text-[10px] text-zinc-600 italic py-1">No active clients.</div>
                    )}
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex h-full min-h-0 flex-col">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">All Priority Tasks</h3>
                    <div className="min-h-0 flex-1 divide-y divide-zinc-900 overflow-y-auto border-t border-zinc-900">
                      {priorityTasks.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between py-3">
                          <div className="truncate pr-4">
                            <span className="block text-xs font-semibold text-white truncate">{t.title}</span>
                            {t.deadline && <span className="text-[10px] text-zinc-500 mt-0.5 block">Due: {t.deadline}</span>}
                          </div>
                          <Badge variant={t.status === 'IN_PROGRESS' ? 'risk-medium' : 'outline'}>
                            {t.status.replaceAll('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                }
                expandedFooter={
                  <Link href="/tasks" prefetch={false} className="w-full">
                    <Button className="w-full h-9 text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer">
                      See more
                    </Button>
                  </Link>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Priority Tasks</CardTitle>
                  <Activity className="h-4 w-4 text-zinc-550" />
                </CardHeader>
                <CardContent className="pt-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {priorityTasks.length > 0 ? (
                      priorityTasks.slice(0, 2).map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-900/40">
                          <span className="text-zinc-300 truncate pr-2 font-medium">{t.title}</span>
                          <Badge className="scale-90 text-[9px] uppercase font-mono font-bold shrink-0" variant={t.status === 'IN_PROGRESS' ? 'risk-medium' : 'outline'}>
                            {t.status === 'IN_PROGRESS' ? 'Active' : 'To-Do'}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-zinc-500 py-2">No active tasks</div>
                    )}
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex h-full min-h-0 flex-col">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Today&apos;s Schedule</h3>
                    <div className="min-h-0 flex-1 divide-y divide-zinc-900 overflow-y-auto border-t border-zinc-900">
                      {todayEvents.map((ev: any) => {
                        const timeStr = ev.startTime ? new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        return (
                          <div key={ev.id} className="flex items-start justify-between py-3">
                            <div>
                              <span className="block text-xs font-semibold text-white">{ev.title}</span>
                              {ev.location && <span className="text-[10px] text-zinc-500 mt-0.5 block">{ev.location}</span>}
                            </div>
                            <Badge variant="outline" className="text-emerald-400 font-mono">
                              {timeStr}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                }
                expandedFooter={
                  <Link href="/calendar" prefetch={false} className="w-full">
                    <Button className="w-full h-9 text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer">
                      See more
                    </Button>
                  </Link>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Today&apos;s Meetings</CardTitle>
                  <Calendar className="h-4 w-4 text-emerald-450" />
                </CardHeader>
                <CardContent className="pt-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {todayEvents.length > 0 ? (
                      todayEvents.slice(0, 3).map((ev: any) => {
                        const timeStr = ev.startTime ? new Date(ev.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        return (
                          <div key={ev.id} className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-900/40">
                            <span className="text-zinc-300 truncate pr-2 font-medium">{ev.title}</span>
                            <span className="text-[10px] font-mono text-zinc-400 shrink-0">{timeStr}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[11px] text-zinc-500 py-2">No meetings today</div>
                    )}
                  </div>
                </CardContent>
              </ExpandableCard>
            </div>
            </div>
          </div>
        </>
      )}
      {isRevenueModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsRevenueModalOpen(false)} />
          <div className="relative z-50 bg-[#0d0e12] border border-zinc-800 rounded-xl shadow-[0_0_120px_rgba(0,0,0,0.9)] p-6 md:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRevenueModalOpen(false)}
              className="absolute top-4 right-4 z-[110] p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mt-4">
              <ClientRevenueChart
                clients={(financeData?.revenueByClient || []).map((client: any) => ({
                  ...client,
                  percentage: Math.round(client.share || 0),
                }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
