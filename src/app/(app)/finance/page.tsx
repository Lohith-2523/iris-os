'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ArrowUpRight, ArrowDownRight, DollarSign, Download, Plus, Filter } from 'lucide-react';
import { PrismAIService } from '@/lib/prism-ai/service';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { formatCurrency, formatUserMessage } from '@/lib/utils';

export default function FinancePage() {
  const [dbData, setDbData] = React.useState<any>(null);
  const [leakData, setLeakData] = React.useState<any>(null);
  const [currencyState, setCurrencyState] = React.useState('USD');

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
    load();
  }, []);

  const aiLeakText = React.useMemo(() => {
    if (!leakData) return formatUserMessage('Lohith, running profit leak audit calculations via ChatGPT...');
    return formatUserMessage(`Lohith, ChatGPT has detected a budget overage: ${leakData.description} Reassigning tasks to David Kim would recover ${formatCurrency(leakData.impactValue)}/mo in direct margins.`);
  }, [leakData, currencyState]);

  const invoices = dbData?.recentInvoices ?? [
    { id: '1', number: 'INV-2026-001', client: 'Aether Technologies', amount: 25000, date: 'June 15, 2026', status: 'PAID' },
    { id: '2', number: 'INV-2026-002', client: 'Vertex Retail', amount: 18500, date: 'June 12, 2026', status: 'PAID' },
    { id: '3', number: 'INV-2026-003', client: 'Pulse Media', amount: 32000, date: 'June 10, 2026', status: 'PAID' },
    { id: '4', number: 'INV-2026-004', client: 'Solaria Energy', amount: 12000, date: 'May 28, 2026', status: 'OVERDUE' },
    { id: '5', number: 'INV-2026-005', client: 'Nova BioLabs', amount: 15000, date: 'June 01, 2026', status: 'UNPAID' },
    { id: '6', number: 'INV-2026-006', client: 'Quantum Capital', amount: 22000, date: 'June 04, 2026', status: 'PAID' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Financial Ledger</h1>
          <p className="text-xs text-zinc-500">Track agency revenue, project invoicing, operational expenses, and profit leakages.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-300 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button variant="default" size="sm" className="h-8 gap-1.5 font-semibold">
            <Plus className="h-3.5 w-3.5" />
            <span>Issue Invoice</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Gross Billings</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbData ? formatCurrency(dbData.grossBillings) : formatCurrency(124500)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+4.8% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Outstanding Invoices</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbData ? formatCurrency(dbData.outstandingAmount) : formatCurrency(27000)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Outstanding balance across accounts</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Operational Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbData ? formatCurrency(dbData.totalExpenses) : formatCurrency(42300)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-400 font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+1.2% cloud usage increase</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Net Profit Margin</CardTitle>
            <DollarSign className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">66.1%</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>+1.5% overhead reductions</span>
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
                <CardTitle className="text-sm font-semibold text-white">Ledger Billings</CardTitle>
                <CardDescription>Recent invoices issued to active accounts.</CardDescription>
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
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                      <TableCell className="font-semibold text-white">{inv.client}</TableCell>
                      <TableCell>{inv.date}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(inv.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            inv.status === 'PAID' ? 'risk-low' : inv.status === 'OVERDUE' ? 'risk-high' : 'risk-medium'
                          }
                        >
                          {inv.status}
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
                  <span className="block font-semibold text-white">QuickBooks Online Suite</span>
                  <span className="text-[10px] text-zinc-500">Connected integration</span>
                </div>
                <span className="font-mono text-zinc-300 font-semibold">{formatCurrency(85)}/mo</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
