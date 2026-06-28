'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  TrendingUp,
  Users,
  FolderKanban,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatPercent, formatUserMessage } from '@/lib/utils';
import { PrismAIService } from '@/lib/prism-ai/service';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';

export default function DashboardPage() {
  const [dbData, setDbData] = React.useState<any>(null);
  const [aiSummary, setAiSummary] = React.useState<string>(formatUserMessage('Lohith, compiling dashboard performance overview metrics via Gemini Flash...'));
  const [leakData, setLeakData] = React.useState<any>(null);
  const [currencyState, setCurrencyState] = React.useState('USD');
  const [clientsList, setClientsList] = React.useState<any[]>([]);

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
    if (typeof window !== 'undefined') {
      setCurrencyState(localStorage.getItem('dashboardCurrency') || 'USD');
      const handleCurrencyChange = () => {
        setCurrencyState(localStorage.getItem('dashboardCurrency') || 'USD');
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
        
        // Fetch AI outputs from service boundary
        const healthInsight = await PrismAIService.getAgencyHealthScore();
        setAiSummary(formatUserMessage(healthInsight.details));
        
        const leaks = await PrismAIService.getProfitLeaks();
        if (leaks.length > 0) {
          setLeakData(leaks[0]);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const aiLeak = React.useMemo(() => {
    if (!leakData) return formatUserMessage('Lohith, analyzing active contractor profit leaks via ChatGPT...');
    return formatUserMessage(`Lohith, I have detected a leak: ${leakData.description} Recommendation: ${leakData.actionStep} (Impact: ${formatCurrency(leakData.impactValue)}/mo).`);
  }, [leakData, currencyState]);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Agency Command Center</h1>
          <p className="text-xs text-zinc-500">Real-time financial, operational, and creative performance intelligence.</p>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbData ? formatCurrency(dbData.currentMonthRevenue) : formatCurrency(198000)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+7.2% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbData ? dbData.activeClientsCount : '12'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>{dbData ? `${dbData.activeClientsCount} active contracts` : '10 active contracts, 2 pipeline leads'}</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
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
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Contractor Profit Leak</CardTitle>
            <Activity className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-rose-400">{formatCurrency(2800)}/mo</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-400/80 font-medium">
              <span>Unoptimized staff seats & utilization</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flagship AI Insight Widget */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Main Visualizations: Operations Capacity & Revenue Growth */}
          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold text-white">Operational Capacity & Monthly Billings</CardTitle>
                <CardDescription>Visual correlation between resource workload and cash flow.</CardDescription>
              </div>
              <Link href="/explorer?chart=billings">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] border-zinc-800 text-zinc-300 font-semibold px-2 hover:text-white rounded-none"
                >
                  Expand Graph
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col justify-between pt-4">
              {/* Custom High-fidelity HTML Grid Chart representation */}
              <div className="h-[240px] w-full flex items-end justify-between gap-6 pb-2">
                {[
                  { month: 'Jan', revenue: 150000, capacity: 62 },
                  { month: 'Feb', revenue: 162000, capacity: 70 },
                  { month: 'Mar', revenue: 175000, capacity: 78 },
                  { month: 'Apr', revenue: 168000, capacity: 74 },
                  { month: 'May', revenue: 185000, capacity: 82 },
                  { month: 'Jun', revenue: 198000, capacity: 88 },
                ].map((item, idx, arr) => {
                  const isRevNegative = idx > 0 && item.revenue < arr[idx - 1].revenue;
                  const isCapNegative = idx > 0 && item.capacity < arr[idx - 1].capacity;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex justify-center items-end gap-1.5 h-[200px]">
                        {/* Revenue Bar */}
                        <div
                          style={{ height: `${(item.revenue / 200000) * 100}%` }}
                          className={`w-1/2 border transition-all rounded-none ${
                            isRevNegative ? 'chart-bar-decline' : 'chart-bar-growth'
                          }`}
                          title={`Revenue: ${formatCurrency(item.revenue)} (${isRevNegative ? 'Negative Growth' : 'Positive/Stable'})`}
                        />
                        {/* Capacity Bar */}
                        <div
                          style={{ height: `${item.capacity}%` }}
                          className={`w-1/2 border transition-all rounded-none ${
                            isCapNegative ? 'chart-bar-decline' : 'chart-bar-growth'
                          }`}
                          title={`Capacity: ${item.capacity}% (${isCapNegative ? 'Decrease' : 'Increase/Stable'})`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-500 font-sans">{item.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-6 text-[10px] text-zinc-400 font-semibold border-t border-zinc-900 pt-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-none chart-bar-growth" />
                  <span>Growth / Stable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-none chart-bar-decline" />
                  <span>Decline / Negative</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Active Projects List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-white">Project Pipeline Risk Logs</CardTitle>
                <CardDescription>Projects requiring immediate operational intervention.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-900 border-t border-zinc-900">
                {dbData?.projectRisks?.length > 0 ? (
                  dbData.projectRisks.map((risk: any) => (
                    <div key={risk.id} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <span className="block text-xs font-semibold text-white">{risk.name}</span>
                        <span className="text-[10px] text-zinc-500 mt-1 block">{risk.riskDescription}</span>
                      </div>
                      <Badge variant={risk.riskLevel === 'HIGH' ? 'risk-high' : 'risk-medium'}>
                        {risk.riskLevel} RISK
                      </Badge>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between px-6 py-4">
                      <div>
                        <span className="block text-xs font-semibold text-white">Solaria Energy - Web Portal Redesign</span>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Timeline delay: waiting for client approval on brand assets</span>
                      </div>
                      <Badge variant="risk-high">HIGH RISK</Badge>
                    </div>
                    <div className="flex items-center justify-between px-6 py-4">
                      <div>
                        <span className="block text-xs font-semibold text-white">Vertex Retail - Brand Guidelines Playbook</span>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Scope adjustment proposed by account lead</span>
                      </div>
                      <Badge variant="risk-medium">MEDIUM RISK</Badge>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Onboarded Clients List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-white">Onboarded Clients Portfolio</CardTitle>
                <CardDescription>Accounts active in agency command network.</CardDescription>
              </div>
              <Link href="/clients">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] border-zinc-800 text-zinc-300 font-semibold px-2 hover:text-white rounded-none"
                >
                  View All Clients
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-900 border-t border-zinc-900">
                {clientsList.length > 0 ? (
                  clientsList.slice(0, 5).map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between px-6 py-4">
                      <div>
                        <span className="block text-xs font-semibold text-white">{client.name}</span>
                        <span className="text-[10px] text-zinc-500 mt-1 block font-mono">{client.domain}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-zinc-400">Health: {client.healthScore}/100</span>
                        <Badge variant={client.status === 'ACTIVE' ? 'risk-low' : 'outline'}>
                          {client.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    No onboarded clients found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar: Embedded Prisma AI Insights */}
        <div className="space-y-6">
          <InsightPanel
            type="health"
            title="Executive Summary Overview"
            score={84}
            scoreLabel="AGENCY HEALTH SCORE"
            riskLevel="LOW"
          >
            <FormattedMarkdown text={aiSummary} />
          </InsightPanel>

          <InsightPanel
            type="leak"
            title="Active Profit Leak Warn"
            score={formatCurrency(2800)}
            scoreLabel="CONTRACTOR LEAK VALUE"
            riskLevel="MEDIUM"
          >
            <FormattedMarkdown text={aiLeak} />
          </InsightPanel>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full text-xs font-semibold h-9" variant="default">
                Review Q2 Invoicing Queue
              </Button>
              <Button className="w-full text-xs font-semibold h-9" variant="secondary">
                Publish Canva Creative Deliverables
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
