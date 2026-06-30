'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Download,
  Plus,
  Filter,
  Wallet,
  TrendingUp,
  Activity,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  CreditCard,
  Blocks,
  Key
} from 'lucide-react';
import { PrismAIService } from '@/lib/prism-ai/service';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { formatCurrency, formatUserMessage } from '@/lib/utils';

const PAYPAL_CHARGES = [
  { id: 'pp_txn_101', email: 'payer1@aether.com', method: 'express_checkout', amount: 250, status: 'completed', createdAt: 'June 26, 2026' },
  { id: 'pp_txn_102', email: 'payer2@vertex.co', method: 'express_checkout', amount: 80, status: 'completed', createdAt: 'June 25, 2026' },
  { id: 'pp_txn_103', email: 'payer3@pulse.io', method: 'express_checkout', amount: 1500, status: 'completed', createdAt: 'June 24, 2026' },
  { id: 'pp_txn_104', email: 'payer4@solaria.net', method: 'express_checkout', amount: 110, status: 'completed', createdAt: 'June 21, 2026' },
  { id: 'pp_txn_105', email: 'payer5@novabiolabs.com', method: 'express_checkout', amount: 300, status: 'refunded', createdAt: 'June 19, 2026' },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'stripe' | 'paypal' | 'razorpay'>('overview');
  const [integrations, setIntegrations] = React.useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = React.useState(true);

  const [stripeData, setStripeData] = React.useState<any>(null);
  const [loadingStripe, setLoadingStripe] = React.useState(false);

  const [paypalData, setPaypalData] = React.useState<any>(null);
  const [loadingPaypal, setLoadingPaypal] = React.useState(false);

  const [razorpayData, setRazorpayData] = React.useState<any>(null);
  const [loadingRazorpay, setLoadingRazorpay] = React.useState(false);

  const [dbData, setDbData] = React.useState<any>(null);
  const [leakData, setLeakData] = React.useState<any>(null);
  const [currencyState, setCurrencyState] = React.useState('USD');

  const fetchIntegrations = React.useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (e) {
      console.error('Error fetching integrations:', e);
    } finally {
      setLoadingIntegrations(false);
    }
  }, []);

  const fetchStripeData = React.useCallback(async () => {
    setLoadingStripe(true);
    try {
      const res = await fetch('/api/stripe?demo=true');
      if (res.ok) {
        const data = await res.json();
        setStripeData(data);
      }
    } catch (e) {
      console.error('Error loading Stripe data:', e);
    } finally {
      setLoadingStripe(false);
    }
  }, []);

  const fetchPaypalData = React.useCallback(async () => {
    setLoadingPaypal(true);
    try {
      const res = await fetch('/api/paypal?demo=true');
      if (res.ok) {
        const data = await res.json();
        setPaypalData(data);
      }
    } catch (e) {
      console.error('Error loading PayPal data:', e);
    } finally {
      setLoadingPaypal(false);
    }
  }, []);

  const fetchRazorpayData = React.useCallback(async () => {
    setLoadingRazorpay(true);
    try {
      const res = await fetch('/api/razorpay?demo=true');
      if (res.ok) {
        const data = await res.json();
        setRazorpayData(data);
      }
    } catch (e) {
      console.error('Error loading Razorpay data:', e);
    } finally {
      setLoadingRazorpay(false);
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
    async function loadBase() {
      try {
        const res = await fetch('/api/data?domain=finance');
        if (res.ok) {
          const json = await res.json();
          setDbData(json);
        }
        const leaks = await PrismAIService.getProfitLeaks();
        if (leaks.length > 0) {
          setLeakData(leaks[0]);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadBase();
    fetchIntegrations();
  }, [fetchIntegrations]);

  const isStripeConnected = React.useMemo(() => {
    return integrations.some((i) => i.provider === 'STRIPE' && i.status === 'CONNECTED');
  }, [integrations]);

  const isRazorpayConnected = React.useMemo(() => {
    return integrations.some((i) => i.provider === 'RAZORPAY' && i.status === 'CONNECTED');
  }, [integrations]);

  const isPaypalConnected = React.useMemo(() => {
    return integrations.some((i) => i.provider === 'PAYPAL' && i.status === 'CONNECTED');
  }, [integrations]);

  React.useEffect(() => {
    if (isStripeConnected) {
      fetchStripeData();
    }
  }, [isStripeConnected, fetchStripeData]);

  React.useEffect(() => {
    if (isPaypalConnected) {
      fetchPaypalData();
    }
  }, [isPaypalConnected, fetchPaypalData]);

  React.useEffect(() => {
    if (isRazorpayConnected) {
      fetchRazorpayData();
    }
  }, [isRazorpayConnected, fetchRazorpayData]);

  const aiLeakText = React.useMemo(() => {
    if (!leakData) return formatUserMessage('Lohith, running profit leak audit calculations via ChatGPT...');
    return formatUserMessage(`Lohith, ChatGPT has detected a budget overage: ${leakData.description} Reassigning tasks to David Kim would recover ${formatCurrency(leakData.impactValue)}/mo in direct margins.`);
  }, [leakData, currencyState]);

  const combinedMetrics = React.useMemo(() => {
    const baseGross = dbData?.grossBillings ?? 124500;
    const baseOutstanding = dbData?.outstandingAmount ?? 27000;
    const baseExpenses = dbData?.totalExpenses ?? 42300;

    let stripeGross = 0;
    let stripeExpenses = 0;
    let stripeOutstanding = 0;
    if (isStripeConnected && stripeData?.stats) {
      stripeGross = stripeData.stats.totalVolume || 0;
      stripeExpenses = stripeGross * 0.029; // 2.9% stripe fee
      stripeOutstanding = (stripeData.stats.failedCount || 0) * 220; // estimate failure amount
    }

    let paypalGross = 0;
    let paypalExpenses = 0;
    let paypalOutstanding = 0;
    if (isPaypalConnected && paypalData?.stats) {
      paypalGross = paypalData.stats.totalVolume || 0;
      paypalExpenses = paypalGross * 0.033; // 3.3% paypal fee
      paypalOutstanding = (paypalData.stats.failedCount || 0) * 300; // refunded/failed paypal transaction
    }

    let razorpayGross = 0;
    let razorpayExpenses = 0;
    let razorpayOutstanding = 0;
    if (isRazorpayConnected && razorpayData?.stats) {
      const rzpGrossINR = razorpayData.stats.totalVolume || 0;
      const rzpFailedCount = razorpayData.stats.failedCount || 0;
      const rzpAovINR = razorpayData.stats.aov || 0;

      // Convert to base USD (1 USD = 83.5 INR)
      razorpayGross = rzpGrossINR / 83.5;
      razorpayExpenses = (rzpGrossINR * 0.02) / 83.5; // 2% fee
      razorpayOutstanding = (rzpFailedCount * rzpAovINR) / 83.5;
    }

    const totalGross = baseGross + stripeGross + paypalGross + razorpayGross;
    const totalExpenses = baseExpenses + stripeExpenses + paypalExpenses + razorpayExpenses;
    const totalOutstanding = baseOutstanding + stripeOutstanding + paypalOutstanding + razorpayOutstanding;
    const profitMargin = totalGross > 0 ? ((totalGross - totalExpenses) / totalGross) * 100 : 0;

    return {
      grossBillings: totalGross,
      outstandingAmount: totalOutstanding,
      totalExpenses: totalExpenses,
      netProfitMargin: profitMargin
    };
  }, [dbData, isStripeConnected, stripeData, isPaypalConnected, paypalData, isRazorpayConnected, razorpayData]);

  const combinedTransactions = React.useMemo(() => {
    const list: any[] = [];

    // Add standard invoices
    const baseInvoices = dbData?.recentInvoices ?? [
      { id: '1', number: 'INV-2026-001', client: 'Aether Technologies', amount: 25000, date: 'June 15, 2026', status: 'PAID' },
      { id: '2', number: 'INV-2026-002', client: 'Vertex Retail', amount: 18500, date: 'June 12, 2026', status: 'PAID' },
      { id: '3', number: 'INV-2026-003', client: 'Pulse Media', amount: 32000, date: 'June 10, 2026', status: 'PAID' },
      { id: '4', number: 'INV-2026-004', client: 'Solaria Energy', amount: 12000, date: 'May 28, 2026', status: 'OVERDUE' },
      { id: '5', number: 'INV-2026-005', client: 'Nova BioLabs', amount: 15000, date: 'June 01, 2026', status: 'UNPAID' },
      { id: '6', number: 'INV-2026-006', client: 'Quantum Capital', amount: 22000, date: 'June 04, 2026', status: 'PAID' },
    ];

    baseInvoices.forEach((inv: any) => {
      list.push({
        id: inv.number,
        source: 'General Ledger',
        customer: inv.client,
        date: inv.date,
        amountUSD: inv.amount,
        status: inv.status === 'PAID' ? 'succeeded' : inv.status === 'UNPAID' ? 'pending' : 'failed',
        rawStatus: inv.status
      });
    });

    // Add Stripe charges
    if (isStripeConnected && stripeData?.payments) {
      stripeData.payments.forEach((ch: any) => {
        list.push({
          id: ch.id,
          source: 'Stripe',
          customer: ch.email,
          date: ch.createdAt,
          amountUSD: ch.amount,
          status: ch.status,
          rawStatus: ch.status.toUpperCase()
        });
      });
    }

    // Add Paypal charges
    if (isPaypalConnected && paypalData?.payments) {
      paypalData.payments.forEach((pp: any) => {
        list.push({
          id: pp.id,
          source: 'PayPal',
          customer: pp.email,
          date: pp.createdAt,
          amountUSD: pp.amount,
          status: pp.status === 'completed' ? 'succeeded' : pp.status === 'refunded' ? 'refunded' : 'failed',
          rawStatus: pp.status.toUpperCase()
        });
      });
    }

    // Add Razorpay payments
    if (isRazorpayConnected && razorpayData?.payments) {
      razorpayData.payments.forEach((p: any) => {
        list.push({
          id: p.id,
          source: 'Razorpay',
          customer: p.email,
          date: p.createdAt,
          amountUSD: p.amount / 83.5, // Convert base USD for uniform table formatting
          status: p.status === 'captured' ? 'succeeded' : p.status === 'refunded' ? 'refunded' : 'failed',
          rawStatus: p.status.toUpperCase()
        });
      });
    }

    // Sort newest first
    return list.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [dbData, isStripeConnected, stripeData, isPaypalConnected, paypalData, isRazorpayConnected, razorpayData]);

  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Source / Ledger', 'Customer / Client', 'Date', 'Amount (USD)', 'Status'];
    const rows = combinedTransactions.map((tx: any) => [
      tx.id,
      tx.source,
      tx.customer,
      tx.date,
      tx.amountUSD.toFixed(2),
      tx.rawStatus
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Financial Ledger</h1>
          <p className="text-xs text-zinc-500">Track combined agency revenue, invoice statuses, and integrated gateway payouts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="h-8 border-zinc-800 text-zinc-300 gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-850 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-350'
          }`}
        >
          Overview
        </button>
        {isStripeConnected && (
          <button
            type="button"
            onClick={() => setActiveTab('stripe')}
            className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === 'stripe'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-350'
            }`}
          >
            Stripe Ledger
          </button>
        )}
        {isPaypalConnected && (
          <button
            type="button"
            onClick={() => setActiveTab('paypal')}
            className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === 'paypal'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-350'
            }`}
          >
            PayPal Ledger
          </button>
        )}
        {isRazorpayConnected && (
          <button
            type="button"
            onClick={() => setActiveTab('razorpay')}
            className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === 'razorpay'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-350'
            }`}
          >
            Razorpay Ledger
          </button>
        )}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metric Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Gross Billings</CardTitle>
                <DollarSign className="h-4 w-4 text-zinc-505" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {formatCurrency(combinedMetrics.grossBillings)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Combined ledger + processor total</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Outstanding Invoices</CardTitle>
                <DollarSign className="h-4 w-4 text-zinc-505" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {formatCurrency(combinedMetrics.outstandingAmount)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
                  <span>Across all accounts & gateways</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Operational Expenses</CardTitle>
                <DollarSign className="h-4 w-4 text-zinc-505" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {formatCurrency(combinedMetrics.totalExpenses)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-400 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Includes dynamic API txn processing fees</span>
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Net Profit Margin</CardTitle>
                <DollarSign className="h-4 w-4 text-zinc-505" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
                  {combinedMetrics.netProfitMargin.toFixed(1)}%
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Aggregated overhead reductions</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Split */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Invoice Table */}
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-sm font-semibold text-white">Combined Financial Ledger</CardTitle>
                    <CardDescription>Consolidated real-time transaction event logs across all channels.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-400 gap-1">
                    <Filter className="h-3 w-3" />
                    <span>Filters</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID / #</TableHead>
                        <TableHead>Channel Source</TableHead>
                        <TableHead>Account Client</TableHead>
                        <TableHead>Date Logged</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combinedTransactions.map((txn: any) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-mono text-xs text-white">{txn.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] bg-zinc-950 font-bold tracking-wide text-zinc-300">
                              {txn.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-zinc-300">{txn.customer}</TableCell>
                          <TableCell>{txn.date}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-white">
                            {formatCurrency(txn.amountUSD)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                txn.status === 'succeeded' || txn.status === 'captured'
                                  ? 'risk-low'
                                  : txn.status === 'pending'
                                  ? 'risk-medium'
                                  : 'risk-high'
                              }
                            >
                              {txn.rawStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar - Financial Insights */}
            <div className="space-y-6">
              <InsightPanel
                type="leak"
                title="Contractor Spend Leak Alert"
                score={formatCurrency(2800)}
                scoreLabel="MONTHLY LEAK ESTIMATE"
                riskLevel="MEDIUM"
              >
                <FormattedMarkdown text={aiLeakText} />
              </InsightPanel>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Subscription Management</CardTitle>
                  <CardDescription>Consolidated agency SaaS tools seat licenses.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="block font-semibold text-white">Canva Seats (Apex Brand)</span>
                      <span className="text-[10px] text-zinc-500">12 Seats active</span>
                    </div>
                    <span className="font-mono text-zinc-300 font-semibold">{formatCurrency(360)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="block font-semibold text-white">Vercel Pro Tier</span>
                      <span className="text-[10px] text-zinc-500">6 Projects active</span>
                    </div>
                    <span className="font-mono text-zinc-300 font-semibold">{formatCurrency(120)}/mo</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="block font-semibold text-white">PayPal Business Suite</span>
                      <span className="text-[10px] text-zinc-500">Connected integration</span>
                    </div>
                    <span className="font-mono text-zinc-300 font-semibold">{formatCurrency(15)}/mo</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* STRIPE TAB */}
      {activeTab === 'stripe' && isStripeConnected && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <div />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingStripe}
              onClick={fetchStripeData}
              className="h-8 border-zinc-850 text-zinc-300 font-semibold gap-1 hover:bg-zinc-900"
            >
              <RefreshCw className={`h-3 w-3 ${loadingStripe ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </Button>
          </div>

          {loadingStripe && !stripeData ? (
            <div className="flex h-[30vh] items-center justify-center">
              <div className="text-zinc-500 text-xs flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
                <span>Loading ledger records from Stripe API...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Stripe Volume (Gross)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-zinc-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {formatCurrency(stripeData?.stats?.totalVolume || 0)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-450 font-semibold">
                      <span>Verified successful volume</span>
                    </div>
                  </CardContent>
                </Card>

                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Account Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-zinc-550" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {formatCurrency(stripeData?.stats?.balance || 0)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-450 shrink-0" />
                      <span>Available for payout</span>
                    </div>
                  </CardContent>
                </Card>

                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Stripe Success Rate</CardTitle>
                    <Activity className="h-4 w-4 text-zinc-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {stripeData?.stats?.successCount > 0 
                        ? Math.round((stripeData.stats.successCount / (stripeData.stats.successCount + stripeData.stats.failedCount)) * 100)
                        : 0}%
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
                      <span>Across recent client charges</span>
                    </div>
                  </CardContent>
                </Card>

                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Stripe Fees Paid</CardTitle>
                    <CreditCard className="h-4 w-4 text-zinc-550" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {formatCurrency((stripeData?.stats?.totalVolume || 0) * 0.029)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
                      <span>Average processing rate: 2.9%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table & Chart Split */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Stripe Charges List */}
                <div className="md:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Stripe Charges Ledger</CardTitle>
                      <CardDescription>Audited log of payment captures directly synced from Stripe Gateway API.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Charge ID</TableHead>
                            <TableHead>Customer Email</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                            <TableHead className="text-right">Created Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stripeData?.payments?.map((ch: any) => (
                            <TableRow key={ch.id}>
                              <TableCell className="font-mono text-xs text-white">{ch.id}</TableCell>
                              <TableCell>{ch.email}</TableCell>
                              <TableCell className="uppercase font-mono text-[10px] text-zinc-505">{ch.method}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-white">
                                {formatCurrency(ch.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={ch.status === 'succeeded' ? 'risk-low' : 'risk-high'}>
                                  {ch.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-[10px] text-zinc-505 font-mono">{ch.createdAt}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar Stripe Chart */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Daily Volume Trend</CardTitle>
                      <CardDescription>Aggregated Stripe capture analysis.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pt-2">
                      <div className="w-full h-36 flex items-end justify-center select-none relative mb-4">
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 120">
                          <defs>
                            <linearGradient id="stripeChartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="20" x2="300" y2="20" stroke="#1f1f23" strokeDasharray="3" />
                          <line x1="0" y1="60" x2="300" y2="60" stroke="#1f1f23" strokeDasharray="3" />
                          <line x1="0" y1="100" x2="300" y2="100" stroke="#1f1f23" strokeDasharray="3" />
                          <path
                            d="M 0 110 L 40 70 L 90 85 L 140 50 L 190 65 L 240 30 L 300 10 L 300 120 L 0 120 Z"
                            fill="url(#stripeChartGrad)"
                          />
                          <path
                            d="M 0 110 L 40 70 L 90 85 L 140 50 L 190 65 L 240 30 L 300 10"
                            fill="none"
                            stroke="#818cf8"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <circle cx="40" cy="70" r="4.5" fill="#09090b" stroke="#818cf8" strokeWidth="2" />
                          <circle cx="90" cy="85" r="4.5" fill="#09090b" stroke="#818cf8" strokeWidth="2" />
                          <circle cx="140" cy="50" r="4.5" fill="#09090b" stroke="#818cf8" strokeWidth="2" />
                          <circle cx="190" cy="65" r="4.5" fill="#09090b" stroke="#818cf8" strokeWidth="2" />
                          <circle cx="240" cy="30" r="4.5" fill="#09090b" stroke="#818cf8" strokeWidth="2" />
                          <circle cx="300" cy="10" r="4.5" fill="#09090b" stroke="#818cf8" strokeWidth="2" />
                        </svg>
                        <div className="absolute bottom-0 w-full flex justify-between px-2 text-[9px] text-zinc-550 font-semibold font-mono">
                          <span>Mon</span>
                          <span>Tue</span>
                          <span>Wed</span>
                          <span>Thu</span>
                          <span>Fri</span>
                          <span>Sat</span>
                          <span>Sun</span>
                        </div>
                      </div>

                      <div className="w-full space-y-2.5 text-xs">
                        <div className="flex justify-between items-center text-[10px] text-zinc-550 font-bold border-b border-zinc-900 pb-1.5">
                          <span>PAYMENT METHOD</span>
                          <span>DISTRIBUTION</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 font-sans">Credit Card (Visa / MC)</span>
                          <span className="font-mono text-white font-semibold">85%</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                          <div className="bg-indigo-400 h-full" style={{ width: '85%' }} />
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 font-sans">Other (ApplePay / Link)</span>
                          <span className="font-mono text-white font-semibold">15%</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                          <div className="bg-zinc-650 h-full" style={{ width: '15%' }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYPAL TAB */}
      {activeTab === 'paypal' && isPaypalConnected && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <div />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingPaypal}
              onClick={fetchPaypalData}
              className="h-8 border-zinc-850 text-zinc-300 font-semibold gap-1 hover:bg-zinc-900"
            >
              <RefreshCw className={`h-3 w-3 ${loadingPaypal ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </Button>
          </div>

          {loadingPaypal && !paypalData ? (
            <div className="flex h-[30vh] items-center justify-center">
              <div className="text-zinc-500 text-xs flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
                <span>Loading ledger records from PayPal API...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-555">PayPal Volume (Gross)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-zinc-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {formatCurrency(paypalData?.stats?.totalVolume || 0)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-450 font-semibold">
                      <span>Verified successful volume</span>
                    </div>
                  </CardContent>
                </Card>

                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Account Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-zinc-555" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {formatCurrency(paypalData?.stats?.balance || 0)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-450 shrink-0" />
                      <span>Available for transfer</span>
                    </div>
                  </CardContent>
                </Card>

                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">PayPal Success Rate</CardTitle>
                    <Activity className="h-4 w-4 text-zinc-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {paypalData?.stats?.successCount > 0
                        ? Math.round((paypalData.stats.successCount / (paypalData.stats.successCount + paypalData.stats.failedCount + paypalData.stats.refundedCount)) * 100)
                        : 0}%
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
                      <span>Across express checkouts</span>
                    </div>
                  </CardContent>
                </Card>

                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-555">PayPal Fees Paid</CardTitle>
                    <CreditCard className="h-4 w-4 text-zinc-555" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {formatCurrency((paypalData?.stats?.totalVolume || 0) * 0.033)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
                      <span>Average processing rate: 3.3%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Table & Chart Split */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* PayPal Charges List */}
                <div className="md:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">PayPal Charges Ledger</CardTitle>
                      <CardDescription>Audited log of payment captures directly synced from PayPal Gateway API.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Payer Email</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                            <TableHead className="text-right">Created Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paypalData?.payments?.map((ch: any) => (
                            <TableRow key={ch.id}>
                              <TableCell className="font-mono text-xs text-white">{ch.id}</TableCell>
                              <TableCell>{ch.email}</TableCell>
                              <TableCell className="uppercase font-mono text-[10px] text-zinc-505">{ch.method}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-white">
                                {formatCurrency(ch.amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={ch.status === 'completed' || ch.status === 'succeeded' ? 'risk-low' : 'risk-high'}>
                                  {ch.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-[10px] text-zinc-505 font-mono">{ch.createdAt}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

            {/* Sidebar PayPal Chart */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Daily Volume Trend</CardTitle>
                  <CardDescription>Aggregated PayPal capture analysis.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center pt-2">
                  <div className="w-full h-36 flex items-end justify-center select-none relative mb-4">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 120">
                      <defs>
                        <linearGradient id="paypalChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <line x1="0" y1="20" x2="300" y2="20" stroke="#1f1f23" strokeDasharray="3" />
                      <line x1="0" y1="60" x2="300" y2="60" stroke="#1f1f23" strokeDasharray="3" />
                      <line x1="0" y1="100" x2="300" y2="100" stroke="#1f1f23" strokeDasharray="3" />
                      <path
                        d="M 0 110 L 40 80 L 90 75 L 140 60 L 190 70 L 240 40 L 300 20 L 300 120 L 0 120 Z"
                        fill="url(#paypalChartGrad)"
                      />
                      <path
                        d="M 0 110 L 40 80 L 90 75 L 140 60 L 190 70 L 240 40 L 300 20"
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="40" cy="80" r="4.5" fill="#09090b" stroke="#0284c7" strokeWidth="2" />
                      <circle cx="90" cy="75" r="4.5" fill="#09090b" stroke="#0284c7" strokeWidth="2" />
                      <circle cx="140" cy="60" r="4.5" fill="#09090b" stroke="#0284c7" strokeWidth="2" />
                      <circle cx="190" cy="70" r="4.5" fill="#09090b" stroke="#0284c7" strokeWidth="2" />
                      <circle cx="240" cy="40" r="4.5" fill="#09090b" stroke="#0284c7" strokeWidth="2" />
                      <circle cx="300" cy="20" r="4.5" fill="#09090b" stroke="#0284c7" strokeWidth="2" />
                    </svg>
                    <div className="absolute bottom-0 w-full flex justify-between px-2 text-[9px] text-zinc-550 font-semibold font-mono">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>

                  <div className="w-full space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-zinc-555 font-bold border-b border-zinc-900 pb-1.5">
                      <span>PAYMENT TYPE</span>
                      <span>DISTRIBUTION</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-sans">PayPal Express Checkout</span>
                      <span className="font-mono text-white font-semibold">90%</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                      <div className="bg-sky-500 h-full" style={{ width: '90%' }} />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-sans">Venmo / Credit Card</span>
                      <span className="font-mono text-white font-semibold">10%</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                      <div className="bg-zinc-650 h-full" style={{ width: '10%' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* RAZORPAY TAB */}
      {activeTab === 'razorpay' && isRazorpayConnected && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <div />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingRazorpay}
              onClick={fetchRazorpayData}
              className="h-8 border-zinc-850 text-zinc-300 font-semibold gap-1 hover:bg-zinc-900"
            >
              <RefreshCw className={`h-3 w-3 ${loadingRazorpay ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </Button>
          </div>

          {loadingRazorpay && !razorpayData ? (
            <div className="flex h-[30vh] items-center justify-center">
              <div className="text-zinc-500 text-xs flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
                <span>Loading ledger records from Razorpay API...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Ledger Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-zinc-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      ₹{(razorpayData?.stats?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-455 shrink-0" />
                      <span>Active test ledger node</span>
                    </div>
                  </CardContent>
                </Card>

                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-555">Sync Volume (Gross)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-zinc-555" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      ₹{(razorpayData?.stats?.totalVolume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-405 font-semibold">
                      <span>Verified successful volume</span>
                    </div>
                  </CardContent>
                </Card>

                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-555">Avg. Order Value (AOV)</CardTitle>
                    <CreditCard className="h-4 w-4 text-zinc-555" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      ₹{(razorpayData?.stats?.aov || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-550">
                      <span>Across connected transactions</span>
                    </div>
                  </CardContent>
                </Card>

                <Card hoverEffect>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-555">Transaction Success Rate</CardTitle>
                    <Activity className="h-4 w-4 text-zinc-555" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono tracking-tight text-white">
                      {razorpayData?.stats?.successCount > 0 
                        ? Math.round((razorpayData?.stats?.successCount / (razorpayData?.stats?.successCount + razorpayData?.stats?.failedCount + razorpayData?.stats?.refundedCount)) * 100)
                        : 0}%
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
                      <span>
                        {razorpayData?.stats?.successCount || 0} Successful / {razorpayData?.stats?.failedCount || 0} Failed
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {razorpayData?.usingDemoData && (
                <div className="flex gap-2.5 rounded border border-amber-905/30 bg-amber-950/10 p-3.5 text-xs text-amber-400">
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Showing demo transactions because the connected Razorpay test account does not have payments yet.
                  </span>
                </div>
              )}

              {/* Main Split */}
              <div className="grid gap-6 md:grid-cols-3">
                {/* Transactions Table */}
                <div className="md:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Live Transactions Ledger</CardTitle>
                      <CardDescription>Real-time audit log of payment captures directly from Razorpay endpoints.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Payment ID</TableHead>
                            <TableHead>Customer Email</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Created Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {razorpayData?.payments?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="p-8 text-center text-zinc-650">
                                No transaction ledger events found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            razorpayData?.payments?.map((payment: any) => (
                              <TableRow key={payment.id} className="hover:bg-zinc-900/10">
                                <TableCell className="font-mono font-semibold text-white">{payment.id}</TableCell>
                                <TableCell className="max-w-[120px] truncate">{payment.email}</TableCell>
                                <TableCell className="uppercase font-mono text-[10px] text-zinc-550">{payment.method}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-white">
                                  ₹{payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant={
                                      payment.status === 'captured'
                                        ? 'risk-low'
                                        : payment.status === 'refunded'
                                        ? 'outline'
                                        : 'risk-high'
                                    }
                                  >
                                    {payment.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-[10px] text-zinc-550 font-mono">{payment.createdAt}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar Analytics */}
                <div className="space-y-6">
                  {/* Weekly Volume Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Weekly Volume Trend</CardTitle>
                      <CardDescription>Aggregated payment capture analysis.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pt-2">
                      <div className="w-full h-36 flex items-end justify-center select-none relative mb-4">
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 120">
                          <defs>
                            <linearGradient id="razorpayChartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="20" x2="300" y2="20" stroke="#1f1f23" strokeDasharray="3" />
                          <line x1="0" y1="60" x2="300" y2="60" stroke="#1f1f23" strokeDasharray="3" />
                          <line x1="0" y1="100" x2="300" y2="100" stroke="#1f1f23" strokeDasharray="3" />
                          <path
                            d="M 0 110 L 40 85 L 90 92 L 140 60 L 190 75 L 240 40 L 300 15 L 300 120 L 0 120 Z"
                            fill="url(#razorpayChartGrad)"
                          />
                          <path
                            d="M 0 110 L 40 85 L 90 92 L 140 60 L 190 75 L 240 40 L 300 15"
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <circle cx="40" cy="85" r="4.5" fill="#09090b" stroke="#ffffff" strokeWidth="2" />
                          <circle cx="90" cy="92" r="4.5" fill="#09090b" stroke="#ffffff" strokeWidth="2" />
                          <circle cx="140" cy="60" r="4.5" fill="#09090b" stroke="#ffffff" strokeWidth="2" />
                          <circle cx="190" cy="75" r="4.5" fill="#09090b" stroke="#ffffff" strokeWidth="2" />
                          <circle cx="240" cy="40" r="4.5" fill="#09090b" stroke="#ffffff" strokeWidth="2" />
                          <circle cx="300" cy="15" r="4.5" fill="#09090b" stroke="#ffffff" strokeWidth="2" />
                        </svg>
                        <div className="absolute bottom-0 w-full flex justify-between px-2 text-[9px] text-zinc-550 font-semibold font-mono">
                          <span>Mon</span>
                          <span>Tue</span>
                          <span>Wed</span>
                          <span>Thu</span>
                          <span>Fri</span>
                          <span>Sat</span>
                          <span>Sun</span>
                        </div>
                      </div>

                      <div className="w-full space-y-2.5 text-xs">
                        <div className="flex justify-between items-center text-[10px] text-zinc-555 font-bold border-b border-zinc-900 pb-1.5">
                          <span>METRIC DETAILS</span>
                          <span>PERCENTAGE</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 font-sans">UPI Payments (GPay/PhonePe)</span>
                          <span className="font-mono text-white font-semibold">60%</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                          <div className="bg-white h-full" style={{ width: '60%' }} />
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 font-sans">Credit / Debit Cards</span>
                          <span className="font-mono text-white font-semibold">30%</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                          <div className="bg-zinc-450 h-full" style={{ width: '30%' }} />
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 font-sans">Other (NetBanking / Wallet)</span>
                          <span className="font-mono text-white font-semibold">10%</span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                          <div className="bg-zinc-650 h-full" style={{ width: '10%' }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
