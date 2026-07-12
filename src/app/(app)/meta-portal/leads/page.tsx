'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Search,
  RefreshCw,
  Lock,
  ShieldCheck,
  Eye,
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { formatCurrency, formatUserMessage, obfuscateEmail } from '@/lib/utils';

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
  approachMethod?: string | null;
  funnelName?: string | null;
}

export default function LeadsKanbanPage() {
  const [leads, setLeads] = React.useState<MetaLead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [userRole, setUserRole] = React.useState<'admin' | 'client'>('admin');
  const [clientName, setClientName] = React.useState<string | null>(null);

  // Selected lead for detail modal
  const [selectedLead, setSelectedLead] = React.useState<MetaLead | null>(null);

  // Spend value for calculating CAC/ROAS on this page
  const [totalSpend, setTotalSpend] = React.useState(4950.0);
  const [currencyState, setCurrencyState] = React.useState('USD');
  const [currencyRate, setCurrencyRate] = React.useState(1.0);

  // Fetch currency settings
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
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('currentUserEmail') || sessionStorage.getItem('currentUserEmail') || 'lohith@apex.co';
      const res = await fetch(`/api/meta-portal?email=${encodeURIComponent(obfuscateEmail(email))}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setUserRole(data.role || 'admin');
        setClientName(data.clientName || null);

        // Compute total spend from campaigns to match
        const campaigns = data.campaigns || [];
        let spendSum = 0;
        campaigns.forEach((c: any) => {
          if (c.ads) {
            c.ads.forEach((ad: any) => {
              spendSum += ad.spend;
            });
          }
        });
        if (spendSum > 0) {
          setTotalSpend(spendSum);
        }
      }
    } catch (e) {
      console.error('Failed to load leads data:', e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  // Update lead status
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    // Optimistic Update
    const previousLeads = [...leads];
    setLeads((prev) =>
      prev.map((l) => (l.leadId === leadId ? { ...l, status: newStatus } : l))
    );
    if (selectedLead && selectedLead.leadId === leadId) {
      setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      const res = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status on server');
      }
    } catch (e) {
      console.error(e);
      // Rollback on error
      setLeads(previousLeads);
      if (selectedLead && selectedLead.leadId === leadId) {
        const original = previousLeads.find((l) => l.leadId === leadId);
        setSelectedLead(original || null);
      }
      alert(formatUserMessage('Failed to save status update.'));
    }
  };

  // Kanban Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    if (userRole !== 'client') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (userRole !== 'client') return;
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      await handleUpdateStatus(leadId, targetStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Filtered Leads
  const filteredLeads = React.useMemo(() => {
    return leads.filter((l) => {
      const query = searchQuery.toLowerCase();
      return (
        l.fullName.toLowerCase().includes(query) ||
        l.email.toLowerCase().includes(query) ||
        (l.phone && l.phone.includes(searchQuery)) ||
        (l.adName && l.adName.toLowerCase().includes(query))
      );
    });
  }, [leads, searchQuery]);

  // Lead stages computations
  const totalLeads = leads.length;
  const closedLeads = leads.filter((l) => l.status?.toLowerCase() === 'closed').length;
  const lostLeads = leads.filter((l) => l.status?.toLowerCase() === 'lost').length;
  const procuredLeads = leads.filter((l) => l.status?.toLowerCase() === 'procured' || l.status?.toLowerCase() === 'new').length;
  const warmLeads = leads.filter((l) => l.status?.toLowerCase() === 'warm' || l.status?.toLowerCase() === 'cold-call in progress').length;
  const coldLeads = leads.filter((l) => l.status?.toLowerCase() === 'cold' || l.status?.toLowerCase() === 'call back required').length;

  // Efficiency indicators
  const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;
  const cac = closedLeads > 0 ? totalSpend / closedLeads : 0;
  
  // ROAS uses total leads minus lost leads
  const targetLeadValue = 150;
  const activeLeadValue = (totalLeads - lostLeads) * targetLeadValue;
  const roas = totalSpend > 0 ? activeLeadValue / totalSpend : 0;

  // Kanban Columns
  const columns = [
    { id: 'procured', label: 'Procured', count: procuredLeads, bg: 'border-zinc-800 bg-zinc-950/20' },
    { id: 'warm', label: 'Warm', count: warmLeads, bg: 'border-amber-900/30 bg-amber-950/10' },
    { id: 'cold', label: 'Cold', count: coldLeads, bg: 'border-blue-900/30 bg-blue-950/10' },
    { id: 'lost', label: 'Lost', count: lostLeads, bg: 'border-rose-900/30 bg-rose-950/10' },
    { id: 'closed', label: 'Closed', count: closedLeads, bg: 'border-emerald-900/30 bg-emerald-950/10' },
  ];

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Loading Leads Kanban board...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Leads Management</span>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient font-sans mt-0.5">
            Meta Ads Lead Pipeline
          </h1>
          <p className="text-xs text-zinc-500">
            {userRole === 'client' 
              ? 'Manage lead contact parameters, review customer data, and track status values.' 
              : 'Audit and track live leads captured from Instant Forms in the Kanban board.'}
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
            <span>Sync Leads</span>
          </Button>
          <Badge variant="risk-low" className="h-8 border-emerald-900/40 bg-emerald-950/20 text-emerald-400 gap-1.5 px-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Meta API Sync Online</span>
          </Badge>
        </div>
      </div>

      {/* Leads metrics header banner */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 bg-zinc-950/30 p-4 border border-zinc-900 rounded-lg">
        <div className="border-r border-zinc-900/60 last:border-0 pr-4">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Procured Leads</span>
          <span className="text-lg font-bold font-mono text-white block mt-1">{procuredLeads}</span>
        </div>
        <div className="border-r border-zinc-900/60 last:border-0 pr-4 pl-0 lg:pl-4">
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Warm & Cold</span>
          <span className="text-lg font-bold font-mono text-zinc-300 block mt-1">{warmLeads + coldLeads}</span>
        </div>
        <div className="border-r border-zinc-900/60 last:border-0 pr-4 pl-0 lg:pl-4">
          <span className="text-[9px] font-bold text-rose-455 uppercase tracking-wider block">Lost Leads</span>
          <span className="text-lg font-bold font-mono text-rose-400 block mt-1">{lostLeads}</span>
        </div>
        <div className="border-r border-zinc-900/60 last:border-0 pr-4 pl-0 lg:pl-4">
          <span className="text-[9px] font-bold text-emerald-455 uppercase tracking-wider block">Closed Deals</span>
          <span className="text-lg font-bold font-mono text-emerald-400 block mt-1">{closedLeads}</span>
        </div>
        <div className="pl-0 lg:pl-4">
          <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider block">Pipeline Total</span>
          <span className="text-lg font-bold font-mono text-white block mt-1">{totalLeads}</span>
        </div>
      </div>

      {/* Conversions & Efficiency reports */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card hoverEffect>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Lead Conversion Rate</span>
              <span className="text-xl font-bold font-mono text-white block mt-1">{conversionRate.toFixed(2)}%</span>
              <span className="text-[9px] text-zinc-550 block mt-0.5">{closedLeads} Closed out of {totalLeads}</span>
            </div>
            <Award className="h-8 w-8 text-zinc-700" />
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Return on Ad Spend (ROAS)</span>
              <span className="text-xl font-bold font-mono text-white block mt-1">{roas.toFixed(2)}x</span>
              <span className="text-[9px] text-zinc-550 block mt-0.5">{totalLeads - lostLeads} Non-Lost Leads / Spend</span>
            </div>
            <TrendingUp className="h-8 w-8 text-zinc-700" />
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Overall CAC</span>
              <span className="text-xl font-bold font-mono text-white block mt-1">{formatCurrency(cac * currencyRate, 2)}</span>
              <span className="text-[9px] text-zinc-555 block mt-0.5">Calculated per Closed Lead</span>
            </div>
            <Users className="h-8 w-8 text-zinc-700" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between pb-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone or ad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-900/80 focus:outline-none transition-all font-sans"
          />
        </div>
        {userRole === 'admin' && (
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-mono">
            <Lock className="h-3 w-3" />
            <span>Admin view-only mode</span>
          </div>
        )}
      </div>

      {/* KANBAN BOARD */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-5 items-stretch overflow-x-auto min-h-[500px]">
        {columns.map((col) => {
          const colLeads = filteredLeads.filter(
            (l) =>
              l.status?.toLowerCase() === col.id ||
              (col.id === 'procured' && l.status?.toLowerCase() === 'new') ||
              (col.id === 'warm' && l.status?.toLowerCase() === 'cold-call in progress') ||
              (col.id === 'cold' && l.status?.toLowerCase() === 'call back required') ||
              (col.id === 'lost' && l.status?.toLowerCase() === 'unqualified')
          );

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-lg border p-3 ${col.bg} transition-all duration-150 min-h-[450px]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  {col.label}
                </span>
                <Badge variant="outline" className="text-[9px] font-mono border-zinc-800 text-zinc-400">
                  {colLeads.length}
                </Badge>
              </div>

              {/* Column Cards */}
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[600px] scrollbar-none">
                {colLeads.length === 0 ? (
                  <div className="h-full flex items-center justify-center border border-dashed border-zinc-900 p-6 text-center text-[10px] text-zinc-650 italic rounded-md">
                    Drop leads here
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={userRole === 'client'}
                      onDragStart={(e) => handleDragStart(e, lead.leadId)}
                      className={`p-3 border border-zinc-900 bg-zinc-950/40 hover:bg-zinc-900/40 transition-all select-none text-[11px] relative group rounded-md ${
                        userRole === 'client' ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-white truncate max-w-[110px]">
                          {lead.fullName}
                        </span>
                        {userRole === 'client' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="text-zinc-500 hover:text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View Lead Information"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="text-zinc-500 hover:text-white cursor-pointer"
                            title="Inspect Lead Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5 truncate">
                        {lead.email}
                      </span>
                      {lead.adName && (
                        <span className="text-[9px] text-zinc-600 font-sans block mt-2 border-t border-zinc-900 pt-1.5 truncate">
                          Ad: {lead.adName}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LEAD DETAILS DIALOG MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
          <Card className="relative z-10 w-full max-w-md bg-[#0d0e12] border-zinc-800 shadow-2xl p-2 font-sans text-xs">
            <CardHeader className="border-b border-zinc-900 pb-3 flex flex-row items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest font-mono">Lead Identity Card</span>
                <CardTitle className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
                  {selectedLead.fullName}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLead(null)}
                className="h-6 w-6 p-0 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Contact parameters */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Email Address</span>
                  <span className="text-white font-mono mt-0.5 block break-all">{selectedLead.email}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Phone Number</span>
                  <span className="text-white font-mono mt-0.5 block">{selectedLead.phone || 'N/A'}</span>
                </div>
              </div>

              {/* API and collection parameters */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Meta Ad Campaign</span>
                  <span className="text-zinc-300 mt-0.5 block font-semibold">{selectedLead.adName || 'Instant Lead Form'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Collection Method</span>
                  <span className="text-zinc-350 mt-0.5 block">{selectedLead.collectionMethod || 'Meta Ads API'}</span>
                </div>
              </div>

              {/* Approach and funnel info */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Funnel Source</span>
                  <span className="text-zinc-350 mt-0.5 block">{selectedLead.funnelName || 'General Funnel Intake'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">Acquisition Date</span>
                  <span className="text-zinc-400 font-mono mt-0.5 block">{new Date(selectedLead.createdTime).toLocaleString()}</span>
                </div>
              </div>

              {/* Status Select action (only client can change status) */}
              <div className="pt-3 border-t border-zinc-900">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Lead Status Indicator</span>
                {userRole === 'client' ? (
                  <select
                    value={selectedLead.status}
                    onChange={(e) => handleUpdateStatus(selectedLead.leadId, e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 capitalize font-semibold text-xs cursor-pointer"
                  >
                    <option value="procured">Procured</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                    <option value="lost">Lost</option>
                    <option value="closed">Closed</option>
                  </select>
                ) : (
                  <div className="flex items-center justify-between p-2.5 border border-zinc-900 bg-zinc-950/20 rounded-md">
                    <span className="font-semibold text-white capitalize">{selectedLead.status}</span>
                    <span className="text-[9px] text-zinc-550 flex items-center gap-1 font-mono">
                      <Lock className="h-3 w-3" />
                      <span>Admin view-only</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedLead(null)}
                  className="h-8 px-4 font-semibold text-xs"
                >
                  Close Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
