'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RevenueLineChart } from '@/components/ui/revenue-line-chart';
import { ExpandableCard } from '@/components/ui/expandable-card';
import { ClientRevenueChart } from '@/components/clients/client-revenue-chart';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  TrendingUp,
  Users,
  FolderKanban,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  ArrowRight,
  Megaphone,
  Zap,
  X,
  Calendar
} from 'lucide-react';
import { formatCurrency, obfuscateEmail } from '@/lib/utils';

export default function DashboardPage() {
  const [dbData, setDbData] = React.useState<any>(null);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = React.useState(false);
  const [currencyState, setCurrencyState] = React.useState('USD');
  const [currencyRate, setCurrencyRate] = React.useState(1.0);
  const [clientsList, setClientsList] = React.useState<any[]>([]);
  const [metaData, setMetaData] = React.useState<any>(null);
  const [tasksList, setTasksList] = React.useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = React.useState<any[]>([]);
  const [agencyLeadsData, setAgencyLeadsData] = React.useState<any>(null);

  // Onboarding states
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);
  const [onboardingState, setOnboardingState] = React.useState({
    google: false,
    notion: false,
    canva: false,
    meta: false,
  });
  const [expandedChecklistIdx, setExpandedChecklistIdx] = React.useState<number | null>(0);
  const [connectingProvider, setConnectingProvider] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const needs = localStorage.getItem('needsOnboarding') === 'true';
      setNeedsOnboarding(needs);
      
      const google = localStorage.getItem('conn_google') === 'true';
      const notion = localStorage.getItem('conn_notion') === 'true';
      const canva = localStorage.getItem('conn_canva') === 'true';
      const meta = localStorage.getItem('conn_meta') === 'true';
      setOnboardingState({ google, notion, canva, meta });
    }
  }, []);

  React.useEffect(() => {
    const statusChangeCallback = (response: any) => {
      if (response.status === 'connected') {
        console.log('Meta connected via FB SDK:', response);
        localStorage.setItem('conn_meta', 'true');
        setOnboardingState(prev => ({ ...prev, meta: true }));
        fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'META',
            action: 'connect_sdk',
            authResponse: response.authResponse
          })
        }).catch(err => console.error('Failed to sync FB connection to backend:', err));
      } else {
        console.log('Meta login status check failed or disconnected:', response.status);
      }
    };

    const checkFbLogin = () => {
      if (typeof window !== 'undefined' && (window as any).FB) {
        (window as any).FB.getLoginStatus(function(response: any) {
          statusChangeCallback(response);
        });
      }
    };

    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).FB) {
        clearInterval(interval);
        checkFbLogin();
      }
    }, 550);

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboardCurrency') || 'USD';
      setCurrencyState(stored);
      
      const updateRates = (curr: string) => {
        if (curr === 'EUR') setCurrencyRate(0.92);
        else if (curr === 'GBP') setCurrencyRate(0.78);
        else if (curr === 'INR') setCurrencyRate(83.5);
        else if (curr === 'CAD') setCurrencyRate(1.37);
        else setCurrencyRate(1.0);
      };
      updateRates(stored);

      const handleCurrencyChange = () => {
        const newCurr = localStorage.getItem('dashboardCurrency') || 'USD';
        setCurrencyState(newCurr);
        updateRates(newCurr);
      };
      window.addEventListener('currency-updated', handleCurrencyChange);
      return () => {
        window.removeEventListener('currency-updated', handleCurrencyChange);
      };
    }
  }, []);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data?domain=dashboard');
        if (res.ok) {
          const json = await res.json();
          setDbData(json);
        }
        
        const clientsRes = await fetch('/api/data?domain=clients');
        if (clientsRes.ok) {
          const clientsJson = await clientsRes.json();
          setClientsList(clientsJson);
        }

        const tasksRes = await fetch('/api/tasks');
        if (tasksRes.ok) {
          const tasksJson = await tasksRes.json();
          setTasksList(tasksJson);
        }
        
        // Fetch Meta ads data
        const email = localStorage.getItem('currentUserEmail') || sessionStorage.getItem('currentUserEmail') || 'lohith@apex.co';
        const metaRes = await fetch(`/api/meta-portal?email=${encodeURIComponent(obfuscateEmail(email))}`);
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          setMetaData(metaJson);
        }

        const calendarRes = await fetch(`/api/calendar?email=${encodeURIComponent(obfuscateEmail(email))}`);
        if (calendarRes.ok) {
          const calendarJson = await calendarRes.json();
          setCalendarEvents(calendarJson.events || []);
        }

        const agencyLeadsRes = await fetch(`/api/agency-leads?email=${encodeURIComponent(obfuscateEmail(email))}`);
        if (agencyLeadsRes.ok) {
          const agencyLeadsJson = await agencyLeadsRes.json();
          setAgencyLeadsData(agencyLeadsJson);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  
  const handleConnect = (id: string) => {
    setConnectingProvider(id);
    setTimeout(() => {
      setConnectingProvider(null);
      setOnboardingState((prev) => {
        const next = { ...prev, [id]: true };
        localStorage.setItem(`conn_${id}`, 'true');
        return next;
      });
      
      setOnboardingState((currState) => {
        const nextState = { ...currState, [id]: true };
        const order = ['google', 'notion', 'canva', 'meta'];
        const nextUncompletedIdx = order.findIndex(p => !nextState[p as keyof typeof nextState]);
        if (nextUncompletedIdx !== -1) {
          setExpandedChecklistIdx(nextUncompletedIdx);
        } else {
          setExpandedChecklistIdx(null);
        }
        return currState;
      });
    }, 1500);
  };

  const handleFinishOnboarding = () => {
    localStorage.removeItem('needsOnboarding');
    setNeedsOnboarding(false);
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
    const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0) || 4950.00;
    const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0) || 130500;
    const totalLeads = leads.length || 174;

    const closedLeads = leads.filter((l: any) => l.status?.toLowerCase() === 'closed').length;
    const lostLeads = leads.filter((l: any) => l.status?.toLowerCase() === 'lost').length;
    const procuredLeads = leads.filter((l: any) => l.status?.toLowerCase() === 'procured' || l.status?.toLowerCase() === 'new').length;
    const warmLeads = leads.filter((l: any) => l.status?.toLowerCase() === 'warm' || l.status?.toLowerCase() === 'cold-call in progress').length;
    const coldLeads = leads.filter((l: any) => l.status?.toLowerCase() === 'cold' || l.status?.toLowerCase() === 'call back required').length;

    // Report metrics calculations
    const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    
    // 1. Conversion rate uses closed leads: (Closed Leads / Total Leads) * 100
    const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;
    
    // 2. CAC uses closed leads: Total Spend / Closed Leads
    const cac = closedLeads > 0 ? totalSpend / closedLeads : 0;
    
    // 3. ROAS uses total leads minus lost leads
    // Target conversion value estimated at $150 per lead
    const leadTargetValue = 150;
    const activeLeadValue = (totalLeads - lostLeads) * leadTargetValue;
    const roas = totalSpend > 0 ? activeLeadValue / totalSpend : 0;
    
    // 4. Impressions per Rupee/USD
    const impressionsPerCurrency = totalSpend > 0 ? totalImpressions / (totalSpend * currencyRate) : 0;

    return {
      totalSpend,
      totalImpressions,
      totalLeads,
      closedLeads,
      lostLeads,
      procuredLeads,
      warmLeads,
      coldLeads,
      cpl,
      conversionRate,
      cac,
      roas,
      impressionsPerCurrency
    };
  }, [ads, metaData, currencyRate]);

  const warmLeads = React.useMemo(() => {
    const leads = metaData?.leads || [];
    return leads.filter((l: any) => l.status?.toLowerCase() === 'warm');
  }, [metaData]);

  const agencyLeadsList = React.useMemo(() => {
    if (agencyLeadsData?.leads && agencyLeadsData.leads.length > 0) {
      return agencyLeadsData.leads;
    }
    return [
      { id: 'mock-1', leadId: 'mock-1', fullName: 'Aarav Mehta', email: 'aarav@mehta.co', status: 'warm', funnelName: 'Enterprise Outreach', collectionMethod: 'Manual Entry', approachMethod: 'Email', createdTime: new Date().toISOString() },
      { id: 'mock-2', leadId: 'mock-2', fullName: 'Priya Nair', email: 'priya@nairtech.com', status: 'warm', funnelName: 'Direct Inbound', collectionMethod: 'Bulk Import', approachMethod: 'LinkedIn', createdTime: new Date().toISOString() },
      { id: 'mock-3', leadId: 'mock-3', fullName: 'Rohan Deshmukh', email: 'rohan@deshmukh.org', status: 'procured', funnelName: 'Inbound Form', collectionMethod: 'Manual Entry', approachMethod: 'Phone', createdTime: new Date().toISOString() },
      { id: 'mock-4', leadId: 'mock-4', fullName: 'Ananya Goel', email: 'ananya@goelcorp.in', status: 'closed', funnelName: 'LinkedIn Campaign', collectionMethod: 'Bulk Import', approachMethod: 'LinkedIn', createdTime: new Date().toISOString() }
    ];
  }, [agencyLeadsData]);

  const warmAgencyLeads = React.useMemo(() => {
    return agencyLeadsList.filter((l: any) => l.status?.toLowerCase() === 'warm');
  }, [agencyLeadsList]);


  const top2Clients = React.useMemo(() => {
    return [...clientsList]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 2);
  }, [clientsList]);

  const sortedClients = React.useMemo(() => {
    return [...clientsList]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  }, [clientsList]);

  const priorityTasks = React.useMemo(() => {
    if (!tasksList || tasksList.length === 0) {
      // Fallback mock tasks
      return [
        { id: 't-1', title: 'Approve final design assets for Aether Tech', status: 'IN_PROGRESS', progress: 80, deadline: '2026-07-10' },
        { id: 't-2', title: 'Prepare Q2 financial audit statement', status: 'TODO', progress: 0, deadline: '2026-07-12' },
        { id: 't-3', title: 'Resolve Meta API token sync warning', status: 'TODO', progress: 10, deadline: '2026-07-10' },
        { id: 't-4', title: 'Onboard Solar Energy marketing lead', status: 'DONE', progress: 100, deadline: '2026-07-08' },
        { id: 't-5', title: 'Schedule retainer review call with Pulsar', status: 'TODO', progress: 0, deadline: '2026-07-15' },
      ];
    }
    return [...tasksList]
      .filter((t: any) => t.status !== 'DONE')
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }, [tasksList]);

  const todayEvents = React.useMemo(() => {
    if (!calendarEvents || calendarEvents.length === 0) {
      // Fallback mock meetings for today
      const today = new Date();
      return [
        {
          id: 'mock-1',
          title: 'Project Kickoff: Nova BioLabs',
          startTime: new Date(new Date(today).setHours(10, 0, 0, 0)).toISOString(),
          endTime: new Date(new Date(today).setHours(10, 45, 0, 0)).toISOString(),
          description: 'Nova BioLabs web portal requirements gathering',
          location: 'Google Meet',
        },
        {
          id: 'mock-2',
          title: 'Retainer Alignment: Aether Tech',
          startTime: new Date(new Date(today).setHours(13, 30, 0, 0)).toISOString(),
          endTime: new Date(new Date(today).setHours(14, 0, 0, 0)).toISOString(),
          description: 'Reviewing retainer terms and campaign reports',
          location: 'Zoom',
        },
        {
          id: 'mock-3',
          title: 'Design Critique & Assets Review',
          startTime: new Date(new Date(today).setHours(15, 0, 0, 0)).toISOString(),
          endTime: new Date(new Date(today).setHours(15, 45, 0, 0)).toISOString(),
          description: 'Weekly team design alignment',
          location: 'Google Meet',
        },
        {
          id: 'mock-4',
          title: 'Client Sync: Pulse Media',
          startTime: new Date(new Date(today).setHours(16, 30, 0, 0)).toISOString(),
          endTime: new Date(new Date(today).setHours(17, 0, 0, 0)).toISOString(),
          description: 'Reviewing conversion statistics and ad creatives',
          location: 'Zoom',
        }
      ];
    }

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Agency Command Center</h1>
          <p className="text-xs text-zinc-500">Real-time financial, operational, and paid creative performance intelligence.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-300 py-1 px-3">
            Q2 Fiscal Year 2026
          </Badge>
        </div>
      </div>

      {needsOnboarding ? (
        <div className="min-h-[500px] flex items-center justify-center py-6">
          <Card className="w-full max-w-xl bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl relative">
            <CardHeader className="text-center border-b border-zinc-800/80 pb-5">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Workspace Activation</span>
              <CardTitle className="text-lg font-bold uppercase tracking-tight text-white mt-1">Connect Your Integrations</CardTitle>
              <CardDescription className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Link your active design, communication, ads, and workflow APIs to populate your operational databases.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6 space-y-4">
              <div className="space-y-3">
                {[
                  {
                    id: 'google',
                    name: 'Google Services & Authentication',
                    description: 'Authorize email tracking, profile sync, and access token retrieval for Google Drive creative assets.',
                    isConnected: onboardingState.google,
                  },
                  {
                    id: 'notion',
                    name: 'Notion Workspace API',
                    description: 'Link your Notion database tables to auto-sync client operational milestones and deliverable logs.',
                    isConnected: onboardingState.notion,
                  },
                  {
                    id: 'canva',
                    name: 'Canva Design Hub Sync',
                    description: 'Synchronize design catalogs, branding materials, templates, and export portals into your asset vault.',
                    isConnected: onboardingState.canva,
                  },
                  {
                    id: 'meta',
                    name: 'Meta Ads Manager Integration',
                    description: 'Synchronize live campaign indicators, target audience profiles, conversion statistics, and actual ROAS metrics.',
                    isConnected: onboardingState.meta,
                  }
                ].map((item, idx) => {
                  const isExpanded = expandedChecklistIdx === idx;
                  return (
                    <div key={item.id} className="border border-zinc-850 bg-zinc-900/20">
                      <button
                        type="button"
                        onClick={() => setExpandedChecklistIdx(isExpanded ? null : idx)}
                        className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs tracking-wide uppercase text-white hover:bg-zinc-900/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-4 w-4 rounded-full flex items-center justify-center border ${
                            item.isConnected 
                              ? 'bg-red-650 border-red-600 text-white' 
                              : 'border-zinc-700 text-transparent'
                          }`}>
                            {item.isConnected && (
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={`${item.isConnected ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </span>
                      </button>
                      
                      {isExpanded && (
                        <div className="p-4 border-t border-zinc-850 bg-zinc-950/40 text-xs text-zinc-400 space-y-4 font-sans font-medium leading-relaxed">
                          <p>{item.description}</p>
                          <div className="flex justify-end">
                            {item.isConnected ? (
                              <Badge variant="risk-low" className="py-1 px-3">
                                Active Connection Verified
                              </Badge>
                            ) : (
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
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {Object.values(onboardingState).every(Boolean) && (
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
           {/* Top Row: 4 Metric Cards */}
          <div className="space-y-6">
            {/* Top 4 Metrics */}
            <div className="grid gap-6 md:grid-cols-4">
            <ExpandableCard 
              className="min-h-[164px] flex flex-col justify-between"
              expandedContent={
                <div className="flex flex-col h-full space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Revenue Breakdown</h3>
                  <div className="space-y-3 relative overflow-hidden pb-10">
                    <div className="flex justify-between items-center text-xs text-zinc-300 py-1.5 border-b border-zinc-800/50">
                      <span className="font-semibold">1. Aether Technologies</span>
                      <span className="font-mono text-emerald-400 font-bold">{formatCurrency(65000 * currencyRate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-300 py-1.5 border-b border-zinc-800/50">
                      <span className="font-semibold">2. Pulse Media</span>
                      <span className="font-mono text-emerald-400 font-bold">{formatCurrency(42000 * currencyRate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-300 py-1.5 border-b border-zinc-800/50">
                      <span className="font-semibold">3. Nova BioLabs</span>
                      <span className="font-mono text-emerald-400 font-bold">{formatCurrency(28000 * currencyRate)}</span>
                    </div>
                    <div className="space-y-3 opacity-30 select-none blur-[0.5px]">
                      <div className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-800/50">
                        <span>4. Quantum Capital</span>
                        <span className="font-mono">{formatCurrency(22000 * currencyRate)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-800/50">
                        <span>5. Vertex Retail</span>
                        <span className="font-mono">{formatCurrency(16000 * currencyRate)}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0d0e12] to-transparent pointer-events-none" />
                  </div>
                  <div className="flex justify-center pt-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRevenueModalOpen(true);
                      }}
                      className="w-full h-9 text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                    >
                      Show more
                    </Button>
                  </div>
                </div>
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {dbData ? formatCurrency(dbData.currentMonthRevenue * currencyRate) : formatCurrency(198000 * currencyRate)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>+7.2% vs last month</span>
                </div>
              </CardContent>
            </ExpandableCard>

            <ExpandableCard 
              className="min-h-[164px] flex flex-col justify-between"
              expandedContent={
                <div className="flex flex-col h-full space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operating Profit Breakdown</h3>
                  <div className="space-y-3 font-sans text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-zinc-855">
                      <span className="text-zinc-400 font-semibold">Gross Billings</span>
                      <span className="font-mono text-white font-bold">
                        {dbData ? formatCurrency(dbData.grossBillings * currencyRate) : formatCurrency(198000 * currencyRate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-855">
                      <span className="text-zinc-400 font-semibold">Total Expenses</span>
                      <span className="font-mono text-rose-400 font-bold">
                        {dbData ? formatCurrency(dbData.totalExpenses * currencyRate) : formatCurrency(74000 * currencyRate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-zinc-300 font-semibold">Operating Profit</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {dbData ? formatCurrency((dbData.grossBillings - dbData.totalExpenses) * currencyRate) : formatCurrency(124000 * currencyRate)}
                      </span>
                    </div>
                  </div>
                </div>
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Net Profit (Amount)</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-450" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
                  {dbData ? formatCurrency((dbData.grossBillings - dbData.totalExpenses) * currencyRate) : formatCurrency(124000 * currencyRate)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Net agency earnings</span>
                </div>
              </CardContent>
            </ExpandableCard>

            <ExpandableCard className="min-h-[164px] flex flex-col justify-between">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Projects</CardTitle>
                <FolderKanban className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {dbData ? dbData.activeProjectsCount : '20'}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-400 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{dbData?.projectRisks?.length ?? 3} project risks flagged</span>
                </div>
              </CardContent>
            </ExpandableCard>

            <ExpandableCard 
              className="min-h-[164px] flex flex-col justify-between"
              expandedContent={
                <div className="flex flex-col h-full space-y-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pending Receivables</h3>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                    Consolidated outstanding and overdue client invoices waiting for capture.
                  </p>
                </div>
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pending Receivables</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-amber-400">
                  {dbData ? formatCurrency(dbData.outstandingAmount * currencyRate) : formatCurrency(45000 * currencyRate)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
                  <span>Unpaid client invoices</span>
                </div>
              </CardContent>
            </ExpandableCard>
            </div>

            {/* Middle Row */}
            <div className="grid gap-6 md:grid-cols-[minmax(180px,0.9fr)_minmax(420px,3.2fr)_minmax(180px,0.9fr)] md:items-stretch">
            <div className="flex min-h-[560px] flex-col gap-6">
              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex flex-col h-full space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Agency Leads Pipeline</h3>
                      <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-400 text-[9px] uppercase font-mono rounded-md">
                        {agencyLeadsList.length} Total Leads
                      </Badge>
                    </div>
                    
                    <div className="divide-y divide-zinc-900 border-t border-zinc-900 overflow-y-auto max-h-[220px] pr-1">
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

                    <div className="pt-2 border-t border-zinc-900">
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
                    </div>
                  </div>
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
                    <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-mono font-bold">Warm Queue</span>
                  </div>
                  <div className="space-y-2">
                    {warmAgencyLeads.slice(0, 2).map((l: any) => (
                      <div key={l.id || l.leadId} className="flex justify-between items-center bg-zinc-900/35 border border-zinc-900/60 p-2 rounded-md">
                        <div className="truncate pr-2">
                          <span className="block text-[11px] font-semibold text-zinc-250 truncate">{l.fullName}</span>
                          <span className="block text-[9px] font-mono text-zinc-555 truncate">{l.email}</span>
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
                className="flex-1 flex flex-col justify-between overflow-hidden cursor-default hover:ring-0"
                disableExpand={true}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Quick Actions</CardTitle>
                  <Zap className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center items-center gap-3 min-h-[140px] pt-2 pb-6">
                  <div className="flex flex-col gap-3.5 w-full items-center justify-center">
                    <Button 
                      size="lg" 
                      className="w-full max-w-[180px] text-[11px] font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-md h-11" 
                      variant="outline" 
                      onClick={(e) => { e.stopPropagation(); window.location.href = '/meta-portal/leads'; }}
                    >
                      Pipeline
                    </Button>
                    <Button 
                      size="lg" 
                      className="w-full max-w-[180px] text-[11px] font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white hover:bg-zinc-800/80 rounded-md h-11" 
                      variant="outline" 
                      onClick={(e) => { e.stopPropagation(); window.location.href = '/meta-portal'; }}
                    >
                      Ads Manager
                    </Button>
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex flex-col h-full space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Leads Pipeline Overview</h3>
                      <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-400 text-[9px] uppercase font-mono">
                        {metaData?.leads?.length || 0} Total Leads
                      </Badge>
                    </div>
                    
                    <div className="divide-y divide-zinc-900 border-t border-zinc-900 overflow-y-auto max-h-[220px] pr-1">
                      {metaData?.leads && metaData.leads.length > 0 ? (
                        metaData.leads.map((l: any) => {
                          const isWarmFirstTwo = warmLeads.slice(0, 2).some((wl: any) => wl.leadId === l.leadId);
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
                                className="text-[9px] px-1.5 py-0 uppercase shrink-0"
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

                    <div className="pt-2 border-t border-zinc-900">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = '/meta-portal/leads';
                        }}
                        className="w-full h-8 font-semibold bg-white hover:bg-zinc-200 text-zinc-950 text-[11px] flex items-center justify-center gap-1 cursor-pointer rounded-md"
                      >
                        <span>See more</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Meta Leads</CardTitle>
                  <Megaphone className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-xl font-bold font-mono text-white">
                      {adReports.totalLeads} Total
                    </div>
                    <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-mono font-bold">Warm Queue</span>
                  </div>
                  <div className="space-y-2">
                    {warmLeads.slice(0, 2).map((l: any) => (
                      <div key={l.id || l.leadId} className="flex justify-between items-center bg-zinc-900/35 border border-zinc-900/60 p-2 rounded-none">
                        <div className="truncate pr-2">
                          <span className="block text-[11px] font-semibold text-zinc-250 truncate">{l.fullName}</span>
                          <span className="block text-[9px] font-mono text-zinc-550 truncate">{l.email}</span>
                        </div>
                        <Badge variant="risk-medium" className="text-[8px] px-1 py-0 uppercase shrink-0">
                          Warm
                        </Badge>
                      </div>
                    ))}
                    {warmLeads.length === 0 && (
                      <div className="text-[10px] text-zinc-600 italic py-1">No warm leads currently.</div>
                    )}
                  </div>
                </CardContent>
              </ExpandableCard>
            </div>
            
            <div className="min-h-[560px]">
              <div className="h-full w-full">
            <RevenueLineChart 
              title="Global Revenue Flow"
              description="Aggregated gross billings vs time"
              className="h-full min-h-[560px] w-full"
              contentClassName="h-[430px] md:h-[452px]"
              data={[
                { label: 'Jan', value: 150000 },
                { label: 'Feb', value: 162000 },
                { label: 'Mar', value: 175000 },
                { label: 'Apr', value: 168000 },
                { label: 'May', value: 185000 },
                { label: 'Jun', value: 198000 },
              ]}
              currencyRate={currencyRate}
            />
          </div>
            </div>

            <div className="flex min-h-[560px] flex-col gap-6">
              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Clients Portfolio (by Revenue)</h3>
                      <Link href="/clients" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] border-zinc-800 text-zinc-300 font-semibold px-2 hover:text-white rounded-none">
                          View All
                        </Button>
                      </Link>
                    </div>
                    <div className="divide-y divide-zinc-900 border-t border-zinc-900 overflow-y-auto max-h-[300px]">
                      {sortedClients.length > 0 ? (
                        sortedClients.map((client: any) => (
                          <div key={client.id} className="flex items-center justify-between py-4">
                            <div>
                              <span className="block text-xs font-semibold text-white">{client.name}</span>
                              <span className="text-[10px] text-zinc-500 mt-1 block font-mono">{client.domain}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-zinc-400">Health: {client.healthScore}/100</span>
                              <span className="text-[11px] font-mono font-bold text-emerald-450">
                                {formatCurrency(client.revenue * currencyRate)}
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
                    <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-mono font-bold">Top Earners</span>
                  </div>
                  <div className="space-y-2">
                    {top2Clients.map((client: any) => (
                      <div key={client.id} className="flex justify-between items-center bg-zinc-900/35 border border-zinc-900/65 p-2 rounded-none">
                        <div className="truncate pr-2">
                          <span className="block text-[11px] font-semibold text-zinc-250 truncate">{client.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-450 shrink-0">
                          {formatCurrency(client.revenue * currencyRate)}
                        </span>
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
                  <div className="flex flex-col h-full">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">All Priority Tasks</h3>
                    <div className="divide-y divide-zinc-900 border-t border-zinc-900 overflow-y-auto max-h-[300px]">
                      {priorityTasks.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between py-3">
                          <div className="truncate pr-4">
                            <span className="block text-xs font-semibold text-white truncate">{t.title}</span>
                            {t.deadline && <span className="text-[10px] text-zinc-500 mt-0.5 block">Due: {t.deadline}</span>}
                          </div>
                          <Badge variant={t.status === 'IN_PROGRESS' ? 'risk-medium' : 'outline'}>
                            {t.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto pt-4 flex justify-center">
                      <Link href="/tasks" className="w-full">
                        <Button className="w-full h-9 text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer">
                          See more
                        </Button>
                      </Link>
                    </div>
                  </div>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Priority Tasks</CardTitle>
                  <Activity className="h-4 w-4 text-zinc-550" />
                </CardHeader>
                <CardContent className="pt-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {priorityTasks.slice(0, 3).map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-900/40">
                        <span className="text-zinc-300 truncate pr-2 font-medium">{t.title}</span>
                        <Badge className="scale-90 text-[9px] uppercase font-mono font-bold shrink-0" variant={t.status === 'IN_PROGRESS' ? 'risk-medium' : 'outline'}>
                          {t.status === 'IN_PROGRESS' ? 'Active' : 'Todo'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex flex-col h-full">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Today&apos;s Schedule</h3>
                    <div className="divide-y divide-zinc-900 border-t border-zinc-900 overflow-y-auto max-h-[300px]">
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
                    <div className="mt-auto pt-4 flex justify-center">
                      <Link href="/calendar" className="w-full">
                        <Button className="w-full h-9 text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer">
                          See more
                        </Button>
                      </Link>
                    </div>
                  </div>
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
              <ClientRevenueChart />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
