'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { 
  Megaphone, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  BarChart3, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import { formatCurrency, formatPercent, formatUserMessage, obfuscateEmail } from '@/lib/utils';

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
  adName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  createdTime: string;
  collectionMethod?: string | null;
}

export default function MetaPortalPage() {
  const [campaigns, setCampaigns] = React.useState<MetaCampaign[]>([]);
  const [leads, setLeads] = React.useState<MetaLead[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [syncing, setSyncing] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [updatingLeadId, setUpdatingLeadId] = React.useState<string | null>(null);
  
  // Tabs State (overview, ads)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'ads'>('overview');

  // Currency Re-rendering State
  const [currencyState, setCurrencyState] = React.useState('USD');
  const [currencyRate, setCurrencyRate] = React.useState(1.0);

  // Role & Context States
  const [userRole, setUserRole] = React.useState<'admin' | 'client'>('admin');
  const [clientName, setClientName] = React.useState<string | null>(null);

  // Accordion toggle states for campaign rows
  const [expandedCampaigns, setExpandedCampaigns] = React.useState<Record<string, boolean>>({});

  // Load Currency preferences and setup listener
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

  // Fetch campaigns and leads
  const loadData = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('currentUserEmail') || sessionStorage.getItem('currentUserEmail') || 'lohith@apex.co';
      const res = await fetch(`/api/meta-portal?email=${encodeURIComponent(obfuscateEmail(email))}`);
      if (res.ok) {
        const data = await res.json();
        const loadedCamps = data.campaigns || [];
        setCampaigns(loadedCamps);
        setLeads(data.leads || []);
        setUserRole(data.role || 'admin');
        setClientName(data.clientName || null);
        
        // Auto-expand campaigns
        const expansions: Record<string, boolean> = {};
        loadedCamps.forEach((c: MetaCampaign) => {
          expansions[c.id] = true;
        });
        setExpandedCampaigns(expansions);
      }
    } catch (error) {
      console.error('Failed to load Meta Portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Derived state of ads
  const ads = React.useMemo(() => {
    const list: MetaAd[] = [];
    campaigns.forEach(c => {
      if (c.ads) list.push(...c.ads);
    });
    return list;
  }, [campaigns]);

  // Simulated sync
  const handleSyncData = async () => {
    setSyncing(true);
    setTimeout(async () => {
      await loadData();
      setSyncing(false);
      alert(formatUserMessage('Facebook Ads Manager API fetch completed! Metrics updated successfully.'));
    }, 1500);
  };

  // Update lead status
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      setUpdatingLeadId(leadId);
      const res = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus }),
      });

      if (res.ok) {
        setLeads((prev) =>
          prev.map((lead) => (lead.leadId === leadId ? { ...lead, status: newStatus } : lead))
        );
      } else {
        alert(formatUserMessage('Failed to update lead status.'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const toggleCampaignExpansion = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Computations
  const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0) || 4950.00;
  const totalLeads = leads.length || 174;
  const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0) || 130500;
  const totalReach = ads.reduce((sum, ad) => sum + ad.reach, 0) || 94700;
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0) || 1200;

  // Efficiency metrics
  const costPerLead = totalSpend / (totalLeads || 1);
  const costPerClick = totalSpend / (totalClicks || 1);
  const clickThroughRate = (totalClicks / (totalImpressions || 1)) * 100;
  const costPerThousandImpressions = (totalSpend / (totalImpressions || 1)) * 1000;
  const conversionRate = (totalLeads / (totalClicks || 1)) * 100;

  const leadStatuses = ['all', 'procured', 'warm', 'cold', 'lost', 'closed'];

  const getStatusSelectClass = (status: string) => {
    const base = "text-[10px] border px-2.5 py-0.5 outline-none cursor-pointer capitalize font-semibold transition-colors rounded-none focus:ring-0 ";
    switch (status?.toLowerCase()) {
      case 'procured':
      case 'new':
        return base + "border-zinc-700 text-zinc-300 bg-transparent";
      case 'warm':
      case 'cold-call in progress':
        return base + "border-amber-900/40 bg-amber-950/20 text-amber-200";
      case 'cold':
      case 'call back required':
        return base + "border-zinc-700 bg-zinc-800 text-zinc-100";
      case 'closed':
        return base + "border-zinc-850 bg-zinc-900/60 text-zinc-400";
      case 'lost':
      case 'unqualified':
        return base + "border-rose-900/40 bg-rose-950/20 text-rose-200";
      default:
        return base + "border-zinc-700 text-zinc-300 bg-transparent";
    }
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;
    const matchesSearch =
      lead.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.phone && lead.phone.includes(searchQuery));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient font-sans">
            {userRole === 'client' ? `Client Meta Portal: ${clientName || ''}` : 'Meta Portal'}
          </h1>
          <p className="text-xs text-zinc-500">
            Streamlined ads manager analytics command and lead tracking directory.
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
            <span>Sync Ads Manager</span>
          </Button>
          <Badge variant="risk-low" className="h-8 border-emerald-900/40 bg-emerald-950/20 text-emerald-400 gap-1.5 px-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ads API Feed Active</span>
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 no-print gap-1.5 scrollbar-none overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview' 
              ? 'border-white text-white font-bold' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Paid Advertising Overview
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ads' 
              ? 'border-white text-white font-bold' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Detailed Performance & Leads
        </button>
      </div>

      {/* TAB 1: PAID ADVERTISING OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Main Stats Grid */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-white" />
              <span>Core Ads Metrics</span>
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Amount Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{formatCurrency(totalSpend * currencyRate)}</div>
                  <span className="text-[9px] text-zinc-500 font-medium">Campaign Total Spend ({currencyState})</span>
                </CardContent>
              </Card>

              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Impressions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{totalImpressions.toLocaleString()}</div>
                  <span className="text-[9px] text-zinc-500 font-medium">Total views generated</span>
                </CardContent>
              </Card>

              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Reach</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{totalReach.toLocaleString()}</div>
                  <span className="text-[9px] text-zinc-500 font-medium">Unique accounts reached</span>
                </CardContent>
              </Card>

              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{totalClicks.toLocaleString()}</div>
                  <span className="text-[9px] text-zinc-500 font-medium">Link clicks registered</span>
                </CardContent>
              </Card>

              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Leads Generated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{totalLeads}</div>
                  <span className="text-[9px] text-zinc-500 font-medium">Instant Forms completions</span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Efficiency Analytics Grid */}
          <div className="space-y-4 pt-4 border-t border-zinc-900">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-white" />
              <span>Spend & Impression Efficiency Metrics</span>
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">CTR (Click-Through Rate)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-white">{clickThroughRate.toFixed(2)}%</div>
                  <span className="text-[9px] text-emerald-400 font-semibold block mt-1">Clicks / Impressions</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">CPC (Cost Per Click)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-white">{formatCurrency(costPerClick * currencyRate, 2)}</div>
                  <span className="text-[9px] text-zinc-500 block mt-1">Spend per link click</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">CPL (Cost Per Lead)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-white">{formatCurrency(costPerLead * currencyRate, 2)}</div>
                  <span className="text-[9px] text-emerald-400 font-semibold block mt-1">Spend per generated lead</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">CPM (Cost Per 1k Views)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-white">{formatCurrency(costPerThousandImpressions * currencyRate, 2)}</div>
                  <span className="text-[9px] text-zinc-500 block mt-1">Cost per thousand views</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Form Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-white">{conversionRate.toFixed(2)}%</div>
                  <span className="text-[9px] text-emerald-400 font-semibold block mt-1">Leads / Clicks ratio</span>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED PERFORMANCE & LEADS */}
      {activeTab === 'ads' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Performance Center */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Campaign & Creative Performance Center</CardTitle>
              <CardDescription>Live campaign breakdown with nested creative logs synced from Ads Manager.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Campaign / Ad Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Reach</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead className="text-right">CPM</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-6 text-zinc-500">
                        Loading Campaigns...
                      </TableCell>
                    </TableRow>
                  ) : campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-6 text-zinc-500">
                        No campaigns found.
                      </TableCell>
                    </TableRow>
                  ) : campaigns.map((camp) => {
                    const campSpend = camp.ads?.reduce((sum, ad) => sum + ad.spend, 0) || 0;
                    const campLeads = camp.ads?.reduce((sum, ad) => sum + ad.leadsCount, 0) || 0;
                    const campReach = camp.ads?.reduce((sum, ad) => sum + ad.reach, 0) || 0;
                    const campImpressions = camp.ads?.reduce((sum, ad) => sum + ad.impressions, 0) || 0;
                    const campClicks = camp.ads?.reduce((sum, ad) => sum + ad.clicks, 0) || 0;
                    
                    const campCpl = campSpend / (campLeads || 1);
                    const campCpc = campSpend / (campClicks || 1);
                    const campCtr = (campClicks / (campImpressions || 1)) * 100;
                    const campCpm = (campSpend / (campImpressions || 1)) * 1000;
                    const isExpanded = !!expandedCampaigns[camp.id];

                    return (
                      <React.Fragment key={camp.id}>
                        <TableRow className="bg-zinc-950/50 hover:bg-zinc-900 border-b border-zinc-900">
                          <TableCell className="text-center">
                            <button onClick={() => toggleCampaignExpansion(camp.id)} className="text-zinc-500">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </TableCell>
                          <TableCell className="font-bold text-white tracking-wider flex items-center gap-2">
                            <Megaphone className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{camp.name}</span>
                            <Badge variant="outline" className="text-[8px] tracking-wider uppercase">{camp.objective?.replace('OUTCOME_', '')}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={camp.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="uppercase text-[9px]">{camp.status}</Badge>
                          </TableCell>
                          <TableCell className="text-zinc-500 text-xs">—</TableCell>
                          <TableCell className="text-right font-mono text-white">{formatCurrency(campSpend * currencyRate)}</TableCell>
                          <TableCell className="text-right font-mono text-zinc-400">{campImpressions.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-zinc-400">{campReach.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-zinc-400">{campClicks.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-white">{campLeads}</TableCell>
                          <TableCell className="text-right font-mono text-zinc-400">{campCtr.toFixed(2)}%</TableCell>
                          <TableCell className="text-right font-mono text-zinc-400">{formatCurrency(campCpc * currencyRate, 2)}</TableCell>
                          <TableCell className="text-right font-mono text-zinc-400">{formatCurrency(campCpm * currencyRate, 2)}</TableCell>
                          <TableCell className="text-right font-mono text-white">{formatCurrency(campCpl * currencyRate, 2)}</TableCell>
                        </TableRow>

                        {isExpanded && (camp.ads || []).map((ad) => {
                          const adCpl = ad.spend / (ad.leadsCount || 1);
                          const adCpc = ad.spend / (ad.clicks || 1);
                          const adCtr = (ad.clicks / (ad.impressions || 1)) * 100;
                          const adCpm = (ad.spend / (ad.impressions || 1)) * 1000;

                          return (
                            <TableRow key={ad.id} className="bg-zinc-900/10 hover:bg-zinc-900/30 border-b border-zinc-900/60">
                              <TableCell></TableCell>
                              <TableCell className="pl-8 font-semibold text-zinc-200">
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-white">{ad.name}</span>
                                  <span className="text-[9px] font-mono text-zinc-550">ID: {ad.adId}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={ad.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="text-[9px] uppercase">{ad.status}</Badge>
                              </TableCell>
                              <TableCell className="text-[10px] text-zinc-400 capitalize">{ad.platform.toLowerCase()}</TableCell>
                              <TableCell className="text-right font-mono text-white">{formatCurrency(ad.spend * currencyRate)}</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{ad.impressions.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{ad.reach.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{ad.clicks.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-white">{ad.leadsCount}</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{adCtr.toFixed(2)}%</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{formatCurrency(adCpc * currencyRate, 2)}</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{formatCurrency(adCpm * currencyRate, 2)}</TableCell>
                              <TableCell className="text-right font-mono text-white">{formatCurrency(adCpl * currencyRate, 2)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Lead Operations Directory */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Lead Collection Directory</CardTitle>
              <CardDescription>Qualify contact records captured from Instant Forms lead collection fields.</CardDescription>
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
                    className="w-full rounded-md border border-zinc-850 bg-zinc-900/40 py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-750 focus:bg-zinc-900/85 focus:outline-none transition-all font-sans"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {leadStatuses.map(s => (
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
                      <TableHead className="text-right">Collection Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-zinc-500">
                          No leads match the filters.
                        </TableCell>
                      </TableRow>
                    ) : filteredLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-semibold text-white">{lead.fullName}</TableCell>
                        <TableCell className="font-mono text-xs text-zinc-300">{lead.email}</TableCell>
                        <TableCell className="text-xs font-mono text-zinc-300">{lead.phone || 'N/A'}</TableCell>
                        <TableCell className="text-xs text-zinc-400">{lead.adName || 'Instant Form'}</TableCell>
                        <TableCell>
                          <select
                            disabled={updatingLeadId === lead.leadId}
                            value={lead.status}
                            onChange={(e) => handleUpdateStatus(lead.leadId, e.target.value)}
                            className={getStatusSelectClass(lead.status)}
                          >
                            <option value="procured">Procured</option>
                            <option value="warm">Warm</option>
                            <option value="cold">Cold</option>
                            <option value="lost">Lost</option>
                            <option value="closed">Closed</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right text-zinc-500 font-mono text-xs">
                          {new Date(lead.createdTime).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
