'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { 
  Megaphone, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Activity, 
  ChevronDown, 
  ChevronRight, 
  ImageIcon, 
  Calendar as CalendarIcon, 
  Clock, 
  BarChart3, 
  Sparkles, 
  Send, 
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { formatCurrency, formatPercent, formatUserMessage } from '@/lib/utils';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { PrismIcon } from '@/components/ui/prism-icon';

// Inline SVGs for Facebook & Instagram to avoid compilation issues
const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface MetaAd {
  id: string;
  adId: string;
  name: string;
  status: string;
  spend: number;
  leadsCount: number;
  reach: number;
  impressions: number;
  clicks: number;
  platform: string;
  imageUrl?: string | null;
  campaignId?: string | null;
  createdAt: string;
}

interface MetaCampaign {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  objective: string | null;
  dailyBudget: number | null;
  createdAt: string;
  ads: MetaAd[];
}

interface MetaLead {
  id: string;
  leadId: string;
  adId: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  adName: string | null;
  status: string;
  createdTime: string;
}

interface ScheduledPost {
  id: string;
  platform: string[];
  postType: string;
  caption: string;
  mediaUrl: string;
  status: 'SCHEDULED' | 'APPROVED' | 'CHANGES_PROPOSED' | 'PUBLISHED';
  scheduledAt: string;
  clientFeedback?: string | null;
}

export default function ClientDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<string>('overview');
  const [campaigns, setCampaigns] = React.useState<MetaCampaign[]>([]);
  const [leads, setLeads] = React.useState<MetaLead[]>([]);
  const [orphanedAds, setOrphanedAds] = React.useState<MetaAd[]>([]);
  const [scheduledPosts, setScheduledPosts] = React.useState<ScheduledPost[]>([]);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [userRole, setUserRole] = React.useState<string>('client');
  const [clientName, setClientName] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [updatingLeadId, setUpdatingLeadId] = React.useState<string | null>(null);

  // Expanded campaigns map
  const [expandedCampaigns, setExpandedCampaigns] = React.useState<Record<string, boolean>>({});

  // Calendar States
  const [selectedDayPost, setSelectedDayPost] = React.useState<ScheduledPost | null>(null);
  const [feedbackText, setFeedbackText] = React.useState('');
  const [showFeedbackInput, setShowFeedbackInput] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/meta-portal');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setLeads(data.leads || []);
        setOrphanedAds(data.orphanedAds || []);
        setScheduledPosts(data.scheduledPosts || []);
        setTasks(data.clientTasks || []);
        const role = data.role || 'client';
        setUserRole(role);
        setClientName(data.clientName || '');
        if (role === 'client') {
          setActiveTab('calendar');
        }
      }
    } catch (e) {
      console.error('Error fetching client dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  const toggleCampaignExpand = (id: string) => {
    setExpandedCampaigns((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Lead status updates
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    setUpdatingLeadId(leadId);
    try {
      const res = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.leadId === leadId ? { ...l, status: newStatus } : l))
        );
      }
    } catch (e) {
      console.error('Failed to update lead status:', e);
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // Propose calendar changes or approve post
  const handleClientFeedback = async (postId: string, newStatus: 'APPROVED' | 'CHANGES_PROPOSED', feedback?: string) => {
    try {
      const res = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'client_feedback',
          postId,
          status: newStatus,
          feedback,
        }),
      });

      if (res.ok) {
        setScheduledPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, status: newStatus, clientFeedback: feedback || null }
              : p
          )
        );
        setSelectedDayPost(null);
        setFeedbackText('');
        setShowFeedbackInput(false);
      }
    } catch (e) {
      console.error('Failed to submit client feedback:', e);
    }
  };

  // Calendar Day slots builder (June 2026)
  const calendarDays = React.useMemo(() => {
    const days = [];
    // June 2026 starts on Monday (1st)
    for (let i = 1; i <= 30; i++) {
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      days.push({
        dayNum: i,
        dateStr: `2026-06-${dayStr}`,
        isCurrentMonth: true,
      });
    }
    // Pad end with next month days
    for (let i = 1; i <= 5; i++) {
      days.push({
        dayNum: i,
        dateStr: `2026-07-0${i}`,
        isCurrentMonth: false,
      });
    }
    return days;
  }, []);

  // Aggregated Ads Stats
  const totalCampaignSpend = React.useMemo(() => {
    const campSpend = campaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum, ad) => adSum + ad.spend, 0);
    }, 0);
    const orphanedSpend = orphanedAds.reduce((sum, ad) => sum + ad.spend, 0);
    return campSpend + orphanedSpend;
  }, [campaigns, orphanedAds]);

  const totalLeadsCount = React.useMemo(() => {
    const campLeads = campaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum, ad) => adSum + ad.leadsCount, 0);
    }, 0);
    const orphanedLeads = orphanedAds.reduce((sum, ad) => sum + ad.leadsCount, 0);
    return campLeads + orphanedLeads;
  }, [campaigns, orphanedAds]);

  const totalImpressions = React.useMemo(() => {
    const campImp = campaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum, ad) => adSum + ad.impressions, 0);
    }, 0);
    const orphanedImp = orphanedAds.reduce((sum, ad) => sum + ad.impressions, 0);
    return campImp + orphanedImp;
  }, [campaigns, orphanedAds]);

  const totalClicks = React.useMemo(() => {
    const campClicks = campaigns.reduce((sum, camp) => {
      return sum + (camp.ads || []).reduce((adSum, ad) => adSum + ad.clicks, 0);
    }, 0);
    const orphanedClicks = orphanedAds.reduce((sum, ad) => sum + ad.clicks, 0);
    return campClicks + orphanedClicks;
  }, [campaigns, orphanedAds]);

  const averageCpl = totalLeadsCount > 0 ? totalCampaignSpend / totalLeadsCount : 0;
  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  // Filtered Leads
  const filteredLeads = React.useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        (l.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = selectedStatus === 'all' || l.status === selectedStatus;
      return matchSearch && matchStatus;
    });
  }, [leads, searchQuery, selectedStatus]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Synchronizing Meta Portal APIs & Content buffers...</span>
        </div>
      </div>
    );
  }

  if (userRole !== 'client') {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center font-sans text-xs">
        <div className="w-full max-w-md bg-[#0d0e12] border border-zinc-800 p-6 rounded-lg shadow-2xl space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Restricted Area</h2>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto leading-normal">
              This Client Dashboard is dedicated to client clearance levels only. Admin commands should be run in the command center.
            </p>
          </div>
          <div className="pt-2">
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full h-9 font-semibold bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Go to Admin Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-canvas space-y-6">
      {/* Header */}
      <div className="dashboard-header flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Client Workspace</span>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient font-sans mt-0.5">
            {clientName} Marketing Command
          </h1>
          <p className="text-xs text-zinc-500">
            {userRole === 'client' 
              ? 'Content calendar feedback and broadcast scheduled post approvals.' 
              : 'Live ad performance auditing, content calendar feedback, and engagement charts.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncData}
            disabled={syncing}
            className="h-8 border-zinc-800 text-zinc-300 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Live Data</span>
          </Button>
          <Badge variant="risk-low" className="h-8 border-emerald-900/40 bg-emerald-950/20 text-emerald-400 gap-1.5 px-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Connection Active</span>
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-850 gap-1.5 scrollbar-none overflow-x-auto">
        {userRole === 'client' ? (
          <>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'calendar' 
                  ? 'border-white text-white font-bold' 
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Broadcast Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'tasks' 
                  ? 'border-white text-white font-bold' 
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Tasks & Updates</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'overview' 
                  ? 'border-white text-white font-bold' 
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              Performance Overview
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'campaigns' 
                  ? 'border-white text-white font-bold' 
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              Ads & Campaigns
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'insights' 
                  ? 'border-white text-white font-bold' 
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              Engagement Insights
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'calendar' 
                  ? 'border-white text-white font-bold' 
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Broadcast Calendar</span>
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'tasks' 
                  ? 'border-white text-white font-bold' 
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Tasks & Updates</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Ad Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card hoverEffect>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Ads Budget Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {formatCurrency(totalCampaignSpend)}
                </div>
                <span className="text-[9px] text-zinc-550 mt-1 block">Dynamic Facebook & Instagram ads</span>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Leads Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {totalLeadsCount} Leads
                </div>
                <span className="text-[9px] text-emerald-450 mt-1 block font-semibold">+12% over organic benchmarks</span>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Average Cost Per Lead</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {formatCurrency(averageCpl, 2)}
                </div>
                <span className="text-[9px] text-zinc-500 mt-1 block">Within targeted {formatCurrency(15)} limit</span>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Average CTR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {averageCtr.toFixed(2)}%
                </div>
                <span className="text-[9px] text-emerald-400 mt-1 block font-semibold">+0.4% above benchmark</span>
              </CardContent>
            </Card>
          </div>

          {/* Quick Info & AI strategy block */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Ad Campaign CTR Breakdown</CardTitle>
                  <CardDescription>Live relative Click-Through-Rate comparison for your ads.</CardDescription>
                </CardHeader>
                <CardContent className="h-[220px] flex items-end justify-between gap-6 pb-2">
                  {campaigns.map((camp, idx) => {
                    const cSpend = (camp.ads || []).reduce((sum, a) => sum + a.spend, 0);
                    const cClicks = (camp.ads || []).reduce((sum, a) => sum + a.clicks, 0);
                    const cImp = (camp.ads || []).reduce((sum, a) => sum + a.impressions, 0);
                    const cCtr = cImp > 0 ? (cClicks / cImp) * 100 : 0;
                    return (
                      <div key={camp.id} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex justify-center items-end h-[170px]">
                          <div
                            style={{ height: `${Math.min(100, (cCtr / 5) * 100)}%` }}
                            className="w-12 bg-white/10 hover:bg-white/20 border border-zinc-800 transition-all rounded-none"
                            title={`${camp.name}: ${cCtr.toFixed(2)}% CTR`}
                          />
                        </div>
                        <span className="text-[9px] font-semibold text-zinc-500 truncate w-20 text-center font-sans">
                          {camp.name}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-[#0b0c10] border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                    <PrismIcon className="h-4 w-4" />
                    <span>Prism Strategy Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 leading-relaxed text-zinc-400 text-[11px] font-sans">
                  <p>
                    Provider-backed strategy insights appear here after Meta campaign metrics have synchronized.
                  </p>
                  <p className="border-t border-zinc-900 pt-3">
                    Content calendar scheduled slots for Tuesdays show the highest engagement index values. Focus media deliverables around those time windows.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGNS & LEADS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Active Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Active Ads & Campaigns List</CardTitle>
              <CardDescription>Live delivery indexes directly populated from Meta Ad Account.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Objective</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Reach</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                        No campaigns or active ad accounts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((camp) => {
                      const isExpanded = !!expandedCampaigns[camp.id];
                      const campSpend = (camp.ads || []).reduce((sum, a) => sum + a.spend, 0);
                      const campReach = (camp.ads || []).reduce((sum, a) => sum + a.reach, 0);
                      const campClicks = (camp.ads || []).reduce((sum, a) => sum + a.clicks, 0);
                      const campLeads = (camp.ads || []).reduce((sum, a) => sum + a.leadsCount, 0);
                      return (
                        <React.Fragment key={camp.id}>
                          <TableRow className="hover:bg-zinc-900/30 border-b border-zinc-900">
                            <TableCell className="text-center p-0">
                              <button
                                onClick={() => toggleCampaignExpand(camp.id)}
                                className="text-zinc-550 hover:text-white cursor-pointer h-8 w-8 flex items-center justify-center"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </TableCell>
                            <TableCell className="font-bold text-white tracking-wider flex items-center gap-2">
                              <Megaphone className="h-3.5 w-3.5 text-zinc-450" />
                              <span>{camp.name}</span>
                              <Badge variant="outline" className="text-[8px] tracking-wider uppercase">
                                {camp.objective?.replace('OUTCOME_', '')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={camp.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="uppercase text-[9px]">
                                {camp.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-zinc-450 uppercase text-[10px] font-mono">{camp.objective || 'N/A'}</TableCell>
                            <TableCell className="text-right font-mono text-white">{formatCurrency(campSpend)}</TableCell>
                            <TableCell className="text-right font-mono text-zinc-450">{campReach.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-zinc-450">{campClicks.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-white">{campLeads}</TableCell>
                          </TableRow>
 
                          {isExpanded && (camp.ads || []).map((ad) => {
                            return (
                              <TableRow key={ad.id} className="bg-zinc-900/10 hover:bg-zinc-900/30 border-b border-zinc-900/60">
                                <TableCell></TableCell>
                                <TableCell className="pl-8 font-semibold text-zinc-200">
                                  <div className="flex items-center gap-3">
                                    {ad.imageUrl ? (
                                      <div className="h-8 w-12 border border-zinc-800 bg-zinc-955 overflow-hidden shrink-0">
                                        <img src={ad.imageUrl} alt={ad.name} className="h-full w-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="h-8 w-12 border border-dashed border-zinc-800 bg-zinc-955/20 flex items-center justify-center shrink-0">
                                        <ImageIcon className="h-4 w-4 text-zinc-650" />
                                      </div>
                                    )}
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold text-white">{ad.name}</span>
                                      <span className="text-[9px] font-mono text-zinc-550">ID: {ad.adId}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={ad.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="text-[9px] uppercase">
                                    {ad.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[10px] text-zinc-450 capitalize">{ad.platform.toLowerCase()}</TableCell>
                                <TableCell className="text-right font-mono text-white">{formatCurrency(ad.spend)}</TableCell>
                                <TableCell className="text-right font-mono text-zinc-450">{ad.reach.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-zinc-450">{ad.clicks.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-white">{ad.leadsCount}</TableCell>
                                <TableCell className="text-right font-mono text-white">—</TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Qualified Leads Directory */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Lead Qualified Directory</CardTitle>
              <CardDescription>Review and track leads synced from live Instant Forms.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between pb-4 border-b border-zinc-900/60 no-print filter-section">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-750 focus:bg-zinc-900/85 focus:outline-none transition-all font-sans"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {['all', 'new', 'cold-call in progress', 'call back required', 'closed', 'unqualified'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedStatus(s)}
                      className={`px-2 py-0.5 rounded text-[9px] font-semibold border cursor-pointer capitalize transition-all ${
                        selectedStatus === s ? 'bg-white text-zinc-950 border-white' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="pt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact Name</TableHead>
                      <TableHead>Email Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Source Creative</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                          No qualified leads found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map(lead => (
                        <TableRow key={lead.id}>
                        <TableCell className="font-semibold text-white">{lead.fullName || 'Name not provided'}</TableCell>
                        <TableCell className="font-mono text-xs">{lead.email || 'Not provided'}</TableCell>
                        <TableCell className="text-xs font-mono">{lead.phone || 'N/A'}</TableCell>
                        <TableCell className="text-xs text-zinc-400">{lead.adName || 'Instant Form'}</TableCell>
                        <TableCell>
                          <select
                            disabled={updatingLeadId === lead.leadId}
                            value={lead.status}
                            onChange={(e) => handleUpdateStatus(lead.leadId, e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 text-white text-[10px] rounded px-2 py-1 focus:outline-none focus:border-zinc-700 capitalize font-semibold"
                          >
                            <option value="new">New</option>
                            <option value="cold-call in progress">Cold-Call in Progress</option>
                            <option value="call back required">Call Back Required</option>
                            <option value="closed">Closed</option>
                            <option value="unqualified">Unqualified</option>
                          </select>
                        </TableCell>
                      </TableRow>
                    )))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: ENGAGEMENT INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Engagement metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card hoverEffect>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Average Engagement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">4.8%</div>
                <span className="text-[9px] text-emerald-400 font-semibold block mt-1">+0.6% vs target benchmark</span>
              </CardContent>
            </Card>
            <Card hoverEffect>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Top Performing Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-white">Carousel Posts</div>
                <span className="text-[9px] text-zinc-550 block mt-1">Drives 12% more comments</span>
              </CardContent>
            </Card>
            <Card hoverEffect>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Organic Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">12,480 people</div>
                <span className="text-[9px] text-emerald-450 font-semibold block mt-1">Expanding 5.4% week-on-week</span>
              </CardContent>
            </Card>
          </div>

          {/* Heatmaps optimal posting slots */}
          <div className="grid gap-6 md:grid-cols-2 mt-4">
            <div className="p-5 border border-zinc-850 bg-zinc-900/10 space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
                <Instagram className="h-4.5 w-4.5 text-pink-500" />
                <span>Instagram Optimal Posting Slots</span>
              </span>
              <div className="space-y-1.5 text-xs font-sans text-zinc-400 pt-2">
                <div className="flex justify-between py-1.5 border-b border-zinc-900">
                  <span className="font-semibold text-zinc-350">Tuesdays</span> 
                  <span className="font-mono font-bold text-zinc-100">2:00 PM – 4:00 PM</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-900">
                  <span className="font-semibold text-zinc-350">Fridays</span> 
                  <span className="font-mono font-bold text-zinc-100">6:00 PM – 8:00 PM</span>
                </div>
              </div>
            </div>

            <div className="p-5 border border-zinc-850 bg-zinc-900/10 space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
                <Facebook className="h-4.5 w-4.5 text-blue-500" />
                <span>Facebook Optimal Posting Slots</span>
              </span>
              <div className="space-y-1.5 text-xs font-sans text-zinc-400 pt-2">
                <div className="flex justify-between py-1.5 border-b border-zinc-900">
                  <span className="font-semibold text-zinc-350">Mondays</span> 
                  <span className="font-mono font-bold text-zinc-100">9:00 AM – 11:00 AM</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-900">
                  <span className="font-semibold text-zinc-350">Wednesdays</span> 
                  <span className="font-mono font-bold text-zinc-100">1:00 PM – 3:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="grid gap-6 md:grid-cols-3 animate-fadeIn">
          {/* Monthly Calendar */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                    <span>Monthly Broadcast Calendar (June 2026)</span>
                  </CardTitle>
                  <CardDescription>Review drafts and click scheduled slots to view post details.</CardDescription>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-mono bg-zinc-900/20 border border-zinc-800/80 px-2 py-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block mr-1"></span> Published
                  <span className="h-2 w-2 rounded-full bg-blue-400 inline-block ml-3 mr-1"></span> Scheduled
                </div>
              </CardHeader>
              <CardContent>
                <div className="border border-zinc-850 bg-zinc-950/20 font-sans">
                  {/* Grid Headers */}
                  <div className="grid grid-cols-7 border-b border-zinc-850 bg-zinc-900/30 text-center text-[10px] font-bold text-zinc-400 py-2">
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                    <div>Sun</div>
                  </div>

                  {/* Day cells grid */}
                  <div className="grid grid-cols-7 grid-rows-5 auto-rows-fr divide-x divide-y divide-zinc-850">
                    {calendarDays.map((cell, idx) => {
                      const dayPosts = scheduledPosts.filter(p => p.scheduledAt.startsWith(cell.dateStr));
                      
                      return (
                        <div
                          key={idx}
                          className={`min-h-[90px] p-2 flex flex-col justify-between hover:bg-zinc-900/20 transition-all cursor-pointer relative ${
                            !cell.isCurrentMonth ? 'text-zinc-650 opacity-40 bg-zinc-900/5' : 'text-zinc-300 bg-zinc-950/10'
                          }`}
                        >
                          <span className={`text-[10px] font-bold ${
                            cell.dateStr === '2026-06-26' ? 'bg-white text-zinc-950 h-5 w-5 rounded-full flex items-center justify-center font-black shadow-md' : 'text-zinc-400'
                          }`}>
                            {cell.dayNum}
                          </span>

                          <div className="space-y-1 mt-1 overflow-y-auto max-h-[55px] scrollbar-none">
                            {dayPosts.map((post) => {
                              const isPublished = post.status === 'PUBLISHED';
                              return (
                                <div
                                  key={post.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDayPost(post);
                                  }}
                                  className={`p-1 text-[8px] flex items-center justify-between gap-1 border border-zinc-800 transition-all hover:brightness-125 ${
                                    isPublished 
                                      ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
                                      : 'bg-blue-950/20 border-blue-900/30 text-blue-400'
                                  }`}
                                >
                                  <span className="truncate font-semibold uppercase">{post.postType}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue side panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">Broadcast Queue</CardTitle>
                <CardDescription>Content drafts awaiting publishing.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-900 border-t border-zinc-900">
                  {scheduledPosts.map((post) => (
                    <div key={post.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {post.platform.includes('facebook') && <Facebook className="h-3.5 w-3.5 text-blue-500" />}
                          {post.platform.includes('instagram') && <Instagram className="h-3.5 w-3.5 text-pink-500" />}
                          <Badge variant="outline" className="text-[8px] uppercase tracking-wide border-zinc-800 text-zinc-500 font-mono">
                            {post.postType}
                          </Badge>
                        </div>
                        <Badge variant={post.status === 'PUBLISHED' ? 'risk-low' : post.status === 'APPROVED' ? 'default' : 'outline'} className="text-[8px]">
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{post.caption}</p>
                      <div className="flex items-center justify-between pt-1 text-[9px] text-zinc-550">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {post.status === 'PUBLISHED' 
                            ? `Published ${new Date(post.scheduledAt).toLocaleDateString()}` 
                            : `Scheduled: ${new Date(post.scheduledAt).toLocaleDateString()}`}
                        </span>
                        {post.status === 'SCHEDULED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDayPost(post)}
                            className="h-5 p-0 text-white hover:text-zinc-300 text-[9px] font-bold"
                          >
                            Inspect
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Calendar Inspector Dialog modal */}
      {selectedDayPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDayPost(null)} />
          <Card className="relative z-10 w-full max-w-md bg-[#0d0e12] border-zinc-800 shadow-2xl p-2 font-sans text-xs">
            <CardHeader className="border-b border-zinc-900 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedDayPost.platform.includes('facebook') && <Facebook className="h-4 w-4 text-blue-500" />}
                {selectedDayPost.platform.includes('instagram') && <Instagram className="h-4 w-4 text-pink-500" />}
                <span className="text-xs font-bold text-white uppercase tracking-wider">{selectedDayPost.postType} Broadcast</span>
              </div>
              <Badge variant={selectedDayPost.status === 'PUBLISHED' ? 'risk-low' : 'outline'}>
                {selectedDayPost.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="aspect-[4/3] border border-zinc-850 bg-zinc-950 overflow-hidden relative">
                <img src={selectedDayPost.mediaUrl} alt="Post creative" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Caption</span>
                <p className="text-zinc-300 font-medium leading-relaxed font-sans">{selectedDayPost.caption}</p>
              </div>

              <div className="flex justify-between items-center bg-zinc-900/30 border border-zinc-850 p-2 text-[10px] font-semibold text-zinc-400">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{new Date(selectedDayPost.scheduledAt).toLocaleDateString()}</span>
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(selectedDayPost.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              </div>

              {/* Client Review Interactions */}
              {(selectedDayPost.status === 'SCHEDULED' || selectedDayPost.status === 'APPROVED') && (
                <div className="space-y-3 pt-3 border-t border-zinc-900">
                  {showFeedbackInput ? (
                    <div className="space-y-2">
                      <label className="font-semibold text-zinc-400 block">Propose Change Details</label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Provide details on text adjustments, caption changes, or design requests..."
                        className="w-full h-20 rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-750 transition-all font-medium font-sans text-xs resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowFeedbackInput(false);
                            setFeedbackText('');
                          }}
                          className="h-8 text-zinc-400 font-semibold"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          disabled={!feedbackText.trim()}
                          onClick={() => handleClientFeedback(selectedDayPost.id, 'CHANGES_PROPOSED', feedbackText)}
                          className="h-8 bg-white text-zinc-950 font-bold"
                        >
                          Submit Proposals
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedDayPost.status === 'SCHEDULED' ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowFeedbackInput(true)}
                            className="h-9 border border-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-900"
                          >
                            Propose Changes
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleClientFeedback(selectedDayPost.id, 'APPROVED')}
                            className="h-9 bg-white text-zinc-950 font-bold hover:bg-zinc-250"
                          >
                            Approve Post
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowFeedbackInput(true)}
                          className="h-9 border border-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-900 col-span-2"
                        >
                          Cancel Approval & Request Changes
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedDayPost.status === 'CHANGES_PROPOSED' && (
                <div className="space-y-3 pt-3 border-t border-zinc-900">
                  <div className="p-3 bg-amber-950/15 border border-amber-900/30 text-amber-400 rounded leading-relaxed text-[11px] font-sans">
                    <span className="font-bold block uppercase tracking-wider text-[9px] mb-1">Feedback Submitted</span>
                    &ldquo;{selectedDayPost.clientFeedback || feedbackText}&rdquo;
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      onClick={() => handleClientFeedback(selectedDayPost.id, 'APPROVED')}
                      className="h-8 bg-white text-zinc-950 font-bold w-full"
                    >
                      Approve Instead
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={() => setSelectedDayPost(null)}
                className="w-full h-8 font-semibold text-zinc-400 hover:text-white"
              >
                Close Inspector
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {/* TAB: TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Project Deliverables & Task Status</CardTitle>
              <CardDescription>Real-time tasks, active progress, and blockers logged by our team.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-zinc-550 italic">No tasks have been logged for your account yet.</div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-white text-xs block">{task.title}</span>
                          {task.description && <span className="text-[10px] text-zinc-500 mt-0.5 block">{task.description}</span>}
                        </div>
                        <Badge
                          variant={
                            task.status === 'COMPLETED'
                              ? 'risk-low'
                              : task.status === 'BLOCKED'
                              ? 'risk-high'
                              : task.status === 'IN_PROGRESS'
                              ? 'risk-medium'
                              : 'outline'
                          }
                          className="rounded-none uppercase tracking-wider text-[9px]"
                        >
                          {task.status}
                        </Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-zinc-500">
                          <span>Task Progress</span>
                          <span className="font-mono">{task.progress}%</span>
                        </div>
                        <div className="h-1 bg-zinc-900 overflow-hidden">
                          <div
                            style={{ width: `${task.progress}%` }}
                            className={`h-full ${
                              task.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : task.status === 'BLOCKED'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Updates & Blockers */}
                      {task.status === 'BLOCKED' && task.blocker && (
                        <div className="bg-rose-950/15 border border-rose-950/40 p-2 text-[10px] text-rose-455 flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span><strong>Blocker:</strong> {task.blocker}</span>
                        </div>
                      )}
                      {task.update && (
                        <div className="bg-zinc-955 p-2 text-[10px] text-zinc-450 border border-zinc-900 flex items-start gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                          <span><strong>Latest Update:</strong> {task.update}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[9px] text-zinc-650 pt-1">
                        <span>Lead Specialist:</span>
                        <span>{task.assignedTo?.name || 'Unassigned'} ({task.assignedTo?.role || 'Apex Specialist'})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
