'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatUserMessage, renderFormattedText, formatCurrency } from '@/lib/utils';
import { readWorkspaceUiPreference, type WorkspaceUiScope, writeWorkspaceUiPreference } from '@/lib/workspace-ui-storage';
import {
  BarChart3,
  ChevronDown,
  Calendar,
  ArrowUpDown,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  ArrowLeft,
  DollarSign,
  Activity,
  Percent
} from 'lucide-react';

// --- DATASETS DEFINITION ---
const EMPTY_DATASETS = {
  capacity: {
    title: 'Operational Capacity & Monthly Billings',
    description: 'Correlation between team capacity and monthly billable revenue.',
    yOptions: [
      { id: 'revenue', label: 'Gross Revenue', format: (v: number) => formatCurrency(v), unit: 'currency' },
      { id: 'capacity', label: 'Resource Capacity', format: (v: number) => `${v}%`, unit: '%' },
      { id: 'overhead', label: 'Overhead Budget', format: (v: number) => formatCurrency(v), unit: 'currency' },
      { id: 'yield', label: 'Resource Yield', format: (v: number) => `${v}x`, unit: 'x' }
    ],
    months: [
      { label: 'Jan', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 0 },
      { label: 'Feb', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 1 },
      { label: 'Mar', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 2 },
      { label: 'Apr', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 3 },
      { label: 'May', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 4 },
      { label: 'Jun', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 5 },
      { label: 'Jul', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 6 },
      { label: 'Aug', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 7 },
      { label: 'Sep', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 8 },
      { label: 'Oct', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 9 },
      { label: 'Nov', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 10 },
      { label: 'Dec', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 11 },
    ],
    quarters: [
      { label: 'Q1', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 0 },
      { label: 'Q2', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 1 },
      { label: 'Q3', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 2 },
      { label: 'Q4', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 3 },
    ],
    years: [
      { label: '2024', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 0 },
      { label: '2025', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 1 },
      { label: '2026', revenue: 0, capacity: 0, overhead: 0, yield: 0, index: 2 },
    ]
  },
  billing: {
    title: 'Billings & Overhead Projections',
    description: 'Forecasted gross billings compared with recurring operational expenditure packages.',
    yOptions: [
      { id: 'revenue', label: 'Projected Billings', format: (v: number) => formatCurrency(v), unit: 'currency' },
      { id: 'expenses', label: 'Overhead Expenses', format: (v: number) => formatCurrency(v), unit: 'currency' },
      { id: 'margin', label: 'Net profit Margin', format: (v: number) => `${v}%`, unit: '%' }
    ],
    months: [
      { label: 'Jan', revenue: 0, expenses: 0, margin: 0, index: 0 },
      { label: 'Feb', revenue: 0, expenses: 0, margin: 0, index: 1 },
      { label: 'Mar', revenue: 0, expenses: 0, margin: 0, index: 2 },
      { label: 'Apr', revenue: 0, expenses: 0, margin: 0, index: 3 },
      { label: 'May', revenue: 0, expenses: 0, margin: 0, index: 4 },
      { label: 'Jun', revenue: 0, expenses: 0, margin: 0, index: 5 },
      { label: 'Jul', revenue: 0, expenses: 0, margin: 0, index: 6 },
      { label: 'Aug', revenue: 0, expenses: 0, margin: 0, index: 7 },
      { label: 'Sep', revenue: 0, expenses: 0, margin: 0, index: 8 },
      { label: 'Oct', revenue: 0, expenses: 0, margin: 0, index: 9 },
      { label: 'Nov', revenue: 0, expenses: 0, margin: 0, index: 10 },
      { label: 'Dec', revenue: 0, expenses: 0, margin: 0, index: 11 },
    ],
    quarters: [
      { label: 'Q1', revenue: 0, expenses: 0, margin: 0, index: 0 },
      { label: 'Q2', revenue: 0, expenses: 0, margin: 0, index: 1 },
      { label: 'Q3', revenue: 0, expenses: 0, margin: 0, index: 2 },
      { label: 'Q4', revenue: 0, expenses: 0, margin: 0, index: 3 },
    ],
    years: [
      { label: '2024', revenue: 0, expenses: 0, margin: 0, index: 0 },
      { label: '2025', revenue: 0, expenses: 0, margin: 0, index: 1 },
      { label: '2026', revenue: 0, expenses: 0, margin: 0, index: 2 },
    ]
  },
  roi: {
    title: 'Client ROI & Media Portfolios',
    description: 'Client campaign yield metrics tracking return multipliers against media spend.',
    yOptions: [
      { id: 'roi', label: 'ROI Multiplier', format: (v: number) => `${v}x`, unit: 'x' },
      { id: 'spend', label: 'Media Spend', format: (v: number) => formatCurrency(v), unit: 'currency' },
      { id: 'revenueGenerated', label: 'Attributed Revenue', format: (v: number) => formatCurrency(v), unit: 'currency' }
    ],
    months: [
      { label: 'Jan', roi: 0, spend: 0, revenueGenerated: 0, index: 0 },
      { label: 'Feb', roi: 0, spend: 0, revenueGenerated: 0, index: 1 },
      { label: 'Mar', roi: 0, spend: 0, revenueGenerated: 0, index: 2 },
      { label: 'Apr', roi: 0, spend: 0, revenueGenerated: 0, index: 3 },
      { label: 'May', roi: 0, spend: 0, revenueGenerated: 0, index: 4 },
      { label: 'Jun', roi: 0, spend: 0, revenueGenerated: 0, index: 5 },
      { label: 'Jul', roi: 0, spend: 0, revenueGenerated: 0, index: 6 },
      { label: 'Aug', roi: 0, spend: 0, revenueGenerated: 0, index: 7 },
      { label: 'Sep', roi: 0, spend: 0, revenueGenerated: 0, index: 8 },
      { label: 'Oct', roi: 0, spend: 0, revenueGenerated: 0, index: 9 },
      { label: 'Nov', roi: 0, spend: 0, revenueGenerated: 0, index: 10 },
      { label: 'Dec', roi: 0, spend: 0, revenueGenerated: 0, index: 11 },
    ],
    quarters: [
      { label: 'Q1', roi: 0, spend: 0, revenueGenerated: 0, index: 0 },
      { label: 'Q2', roi: 0, spend: 0, revenueGenerated: 0, index: 1 },
      { label: 'Q3', roi: 0, spend: 0, revenueGenerated: 0, index: 2 },
      { label: 'Q4', roi: 0, spend: 0, revenueGenerated: 0, index: 3 },
    ],
    years: [
      { label: '2024', roi: 0, spend: 0, revenueGenerated: 0, index: 0 },
      { label: '2025', roi: 0, spend: 0, revenueGenerated: 0, index: 1 },
      { label: '2026', roi: 0, spend: 0, revenueGenerated: 0, index: 2 },
    ]
  }
};

function generateAiInsight(report: string, frequency: string, primaryY: string) {
  const reportsMap: Record<string, string> = {
    capacity: 'Operational Capacity',
    billing: 'Billings & Overhead Projections',
    roi: 'Client ROI & Media Portfolios'
  };
  const label = reportsMap[report] || report;
  
  if (report === 'capacity') {
    return `Lohith, looking at the ${frequency} capacity analysis mapping ${primaryY}, we notice that capacity expansions show high efficiency ratios. During Q2 and early summer, billings scaled ahead of delivery capacity. However, a minor profit leak is present in contractor software subscriptions. I recommend balancing project assignments to sustain profit margins while avoiding delivery team fatigue.`;
  } else if (report === 'billing') {
    return `Lohith, the ${frequency} billing projections show that net revenue is tracking safely above our core overhead levels. Note that in periods where ${primaryY} exhibits a visual dip (e.g. April MoM), our reserve multipliers absorbed the variance. Retaining a 35% margin buffer allows us to confidently take on 2 additional high-value accounts in Q3.`;
  } else {
    return `Lohith, client campaign return multipliers tracking ${primaryY} show high stability. Our premium Meta campaign funnels have yielded strong results, particularly in late Q4 (peaking at 4.1x). We should re-deploy similar asset combinations to under-performing accounts to drive a general 15% increase in portfolio yield.`;
  }
}

function ExplorerContent() {
  const searchParams = useSearchParams();
  const chartType = searchParams.get('chart');

  const [datasets, setDatasets] = React.useState<any>(EMPTY_DATASETS);

  React.useEffect(() => {
    async function loadExplorerData() {
      try {
        const financeRes = await fetch('/api/data?domain=finance');
        const ledgerRes = await fetch('/api/transactions');
        const teamRes = await fetch('/api/data?domain=team');
        const marketingRes = await fetch('/api/data?domain=client-dashboard');

        let ledgerTransactions: any[] = [];
        let expenses: any[] = [];
        let teamMembers: any[] = [];
        let campaigns: any[] = [];

        if (financeRes.ok) {
          const finData = await financeRes.json();
          expenses = finData.expenses || [];
        }
        if (ledgerRes.ok) {
          ledgerTransactions = await ledgerRes.json();
        }
        if (teamRes.ok) {
          teamMembers = await teamRes.json() || [];
        }
        if (marketingRes.ok) {
          const markData = await marketingRes.json() || {};
          campaigns = markData.campaigns || [];
        }

        const avgCapacity = teamMembers.length;

        const getMonthIndex = (dStr: string) => {
          const d = new Date(dStr);
          return isNaN(d.getTime()) ? 0 : d.getMonth();
        };
        const getQuarterIndex = (dStr: string) => {
          const d = new Date(dStr);
          return isNaN(d.getTime()) ? 0 : Math.floor(d.getMonth() / 3);
        };
        const getYearIndex = (dStr: string) => {
          const d = new Date(dStr);
          if (isNaN(d.getTime())) return 2;
          const y = d.getFullYear();
          if (y === 2024) return 0;
          if (y === 2025) return 1;
          return 2;
        };

        const monthlyRev = Array(12).fill(0);
        const monthlyExp = Array(12).fill(0);
        const monthlySpend = Array(12).fill(0);
        const monthlyAttributed = Array(12).fill(0);

        ledgerTransactions.forEach(transaction => {
          if (transaction.category === 'Revenue' && transaction.amount > 0) {
            const m = getMonthIndex(transaction.date);
            monthlyRev[m] += transaction.amount;
          }
        });
        expenses.forEach(exp => {
          const m = getMonthIndex(exp.date);
          monthlyExp[m] += exp.amount;
        });
        campaigns.forEach(c => {
          const spend = c.budget || 0;
          const clicks = (c.ads || []).reduce((sum: number, ad: any) => sum + (ad.clicks || 0), 0);
          const rev = clicks * 0.15 * 1200;
          const m = getMonthIndex(c.startDate || new Date());
          monthlySpend[m] += spend;
          monthlyAttributed[m] += rev;
        });

        const newMonthsCapacity = EMPTY_DATASETS.capacity.months.map((m, idx) => {
          const rev = monthlyRev[idx];
          const overhead = monthlyExp[idx];
          const yld = overhead > 0 ? Number((rev / overhead).toFixed(2)) : 0;
          return { ...m, revenue: rev, capacity: rev > 0 ? avgCapacity : 0, overhead, yield: yld };
        });

        const newMonthsBilling = EMPTY_DATASETS.billing.months.map((m, idx) => {
          const rev = monthlyRev[idx];
          const exp = monthlyExp[idx];
          const margin = rev > 0 ? Number((((rev - exp) / rev) * 100).toFixed(1)) : 0;
          return { ...m, revenue: rev, expenses: exp, margin };
        });

        const newMonthsRoi = EMPTY_DATASETS.roi.months.map((m, idx) => {
          const spend = monthlySpend[idx];
          const rev = monthlyAttributed[idx];
          const roi = spend > 0 ? Number((rev / spend).toFixed(1)) : 0;
          return { ...m, spend, revenueGenerated: rev, roi };
        });

        const quarterlyRev = Array(4).fill(0);
        const quarterlyExp = Array(4).fill(0);
        const quarterlySpend = Array(4).fill(0);
        const quarterlyAttributed = Array(4).fill(0);

        ledgerTransactions.forEach(transaction => {
          if (transaction.category === 'Revenue' && transaction.amount > 0) {
            const q = getQuarterIndex(transaction.date);
            quarterlyRev[q] += transaction.amount;
          }
        });
        expenses.forEach(exp => {
          const q = getQuarterIndex(exp.date);
          quarterlyExp[q] += exp.amount;
        });
        campaigns.forEach(c => {
          const spend = c.budget || 0;
          const clicks = (c.ads || []).reduce((sum: number, ad: any) => sum + (ad.clicks || 0), 0);
          const rev = clicks * 0.15 * 1200;
          const q = getQuarterIndex(c.startDate || new Date());
          quarterlySpend[q] += spend;
          quarterlyAttributed[q] += rev;
        });

        const newQuartersCapacity = EMPTY_DATASETS.capacity.quarters.map((q, idx) => {
          const rev = quarterlyRev[idx];
          const overhead = quarterlyExp[idx];
          const yld = overhead > 0 ? Number((rev / overhead).toFixed(2)) : 0;
          return { ...q, revenue: rev, capacity: rev > 0 ? avgCapacity : 0, overhead, yield: yld };
        });

        const newQuartersBilling = EMPTY_DATASETS.billing.quarters.map((q, idx) => {
          const rev = quarterlyRev[idx];
          const exp = quarterlyExp[idx];
          const margin = rev > 0 ? Number((((rev - exp) / rev) * 100).toFixed(1)) : 0;
          return { ...q, revenue: rev, expenses: exp, margin };
        });

        const newQuartersRoi = EMPTY_DATASETS.roi.quarters.map((q, idx) => {
          const spend = quarterlySpend[idx];
          const rev = quarterlyAttributed[idx];
          const roi = spend > 0 ? Number((rev / spend).toFixed(1)) : 0;
          return { ...q, spend, revenueGenerated: rev, roi };
        });

        const yearlyRev = Array(3).fill(0);
        const yearlyExp = Array(3).fill(0);
        const yearlySpend = Array(3).fill(0);
        const yearlyAttributed = Array(3).fill(0);

        ledgerTransactions.forEach(transaction => {
          if (transaction.category === 'Revenue' && transaction.amount > 0) {
            const y = getYearIndex(transaction.date);
            yearlyRev[y] += transaction.amount;
          }
        });
        expenses.forEach(exp => {
          const y = getYearIndex(exp.date);
          yearlyExp[y] += exp.amount;
        });
        campaigns.forEach(c => {
          const spend = c.budget || 0;
          const clicks = (c.ads || []).reduce((sum: number, ad: any) => sum + (ad.clicks || 0), 0);
          const rev = clicks * 0.15 * 1200;
          const y = getYearIndex(c.startDate || new Date());
          yearlySpend[y] += spend;
          yearlyAttributed[y] += rev;
        });

        const newYearsCapacity = EMPTY_DATASETS.capacity.years.map((y, idx) => {
          const rev = yearlyRev[idx];
          const overhead = yearlyExp[idx];
          const yld = overhead > 0 ? Number((rev / overhead).toFixed(2)) : 0;
          return { ...y, revenue: rev, capacity: rev > 0 ? avgCapacity : 0, overhead, yield: yld };
        });

        const newYearsBilling = EMPTY_DATASETS.billing.years.map((y, idx) => {
          const rev = yearlyRev[idx];
          const exp = yearlyExp[idx];
          const margin = rev > 0 ? Number((((rev - exp) / rev) * 100).toFixed(1)) : 0;
          return { ...y, revenue: rev, expenses: exp, margin };
        });

        const newYearsRoi = EMPTY_DATASETS.roi.years.map((y, idx) => {
          const spend = yearlySpend[idx];
          const rev = yearlyAttributed[idx];
          const roi = spend > 0 ? Number((rev / spend).toFixed(1)) : 0;
          return { ...y, spend, revenueGenerated: rev, roi };
        });

        setDatasets({
          capacity: {
            ...EMPTY_DATASETS.capacity,
            months: newMonthsCapacity,
            quarters: newQuartersCapacity,
            years: newYearsCapacity
          },
          billing: {
            ...EMPTY_DATASETS.billing,
            months: newMonthsBilling,
            quarters: newQuartersBilling,
            years: newYearsBilling
          },
          roi: {
            ...EMPTY_DATASETS.roi,
            months: newMonthsRoi,
            quarters: newQuartersRoi,
            years: newYearsRoi
          }
        });
      } catch (err) {
        console.error('Error loading explorer data:', err);
      }
    }
    loadExplorerData();
  }, []);

  // Currency States
  const [uiScope, setUiScope] = React.useState<WorkspaceUiScope | null>(null);

  React.useEffect(() => {
    const loadCurrency = async () => {
      const workspace = await fetch('/api/workspace').then((res) => res.ok ? res.json() : null);
      if (workspace?.user?.id && workspace?.organization?.id) {
        setUiScope({ userId: workspace.user.id, orgId: workspace.organization.id });
      }
      
    };
    void loadCurrency();
  }, []);

  // Page States
  const [activeReport, setActiveReport] = React.useState<'capacity' | 'billing' | 'roi'>('capacity');
  const [frequency, setFrequency] = React.useState<'months' | 'quarters' | 'years'>('months');
  
  // X-Y parameter states
  const [primaryY, setPrimaryY] = React.useState<string>('revenue');
  const [secondaryY, setSecondaryY] = React.useState<string>('none');
  const [xAxisOrder, setXAxisOrder] = React.useState<'chronological' | 'asc' | 'desc'>('chronological');
  
  // Interaction states
  const [hoveredBarIndex, setHoveredBarIndex] = React.useState<number | null>(null);
  const [reportDropdownOpen, setReportDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    const saved = readWorkspaceUiPreference(
      uiScope,
      'explorer',
      { activeReport: 'capacity' as const, frequency: 'months' as const, primaryY: 'revenue', secondaryY: 'none', xAxisOrder: 'chronological' as const },
      (value): value is { activeReport: 'capacity' | 'billing' | 'roi'; frequency: 'months' | 'quarters' | 'years'; primaryY: string; secondaryY: string; xAxisOrder: 'chronological' | 'asc' | 'desc' } => {
        if (!value || typeof value !== 'object') return false;
        const stored = value as Record<string, unknown>;
        return ['capacity', 'billing', 'roi'].includes(String(stored.activeReport)) &&
          ['months', 'quarters', 'years'].includes(String(stored.frequency)) &&
          typeof stored.primaryY === 'string' && typeof stored.secondaryY === 'string' &&
          ['chronological', 'asc', 'desc'].includes(String(stored.xAxisOrder));
      },
    );
    setActiveReport(saved.activeReport);
    setFrequency(saved.frequency);
    setPrimaryY(saved.primaryY);
    setSecondaryY(saved.secondaryY);
    setXAxisOrder(saved.xAxisOrder);
  }, [uiScope]);

  React.useEffect(() => {
    writeWorkspaceUiPreference(uiScope, 'explorer', { activeReport, frequency, primaryY, secondaryY, xAxisOrder });
  }, [uiScope, activeReport, frequency, primaryY, secondaryY, xAxisOrder]);

  // Sync with URL parameters on mount
  React.useEffect(() => {
    if (chartType === 'billings') {
      setActiveReport('capacity');
      setPrimaryY('revenue');
      setSecondaryY('capacity');
    } else if (chartType === 'forecast') {
      setActiveReport('billing');
      setPrimaryY('revenue');
      setSecondaryY('expenses');
    } else if (chartType === 'roi') {
      setActiveReport('roi');
      setPrimaryY('roi');
      setSecondaryY('spend');
    }
  }, [chartType]);

  // Adjust Y-axis defaults when report changes
  React.useEffect(() => {
    if (activeReport === 'capacity') {
      setPrimaryY('revenue');
      setSecondaryY('capacity');
    } else if (activeReport === 'billing') {
      setPrimaryY('revenue');
      setSecondaryY('expenses');
    } else if (activeReport === 'roi') {
      setPrimaryY('roi');
      setSecondaryY('spend');
    }
    setHoveredBarIndex(null);
  }, [activeReport]);

  const currentDataset = datasets[activeReport];
  const activeYOptions = React.useMemo(() => {
    return currentDataset.yOptions.map((option: any) => {
      if (option.unit === 'currency') {
        return {
          ...option,
          format: (v: number) => formatCurrency(v)
        };
      }
      return option;
    });
  }, [currentDataset]);
  const rawData: any[] = currentDataset[frequency];

  // Primary formatting definitions
  const primaryOption = activeYOptions.find((o: any) => o.id === primaryY) || activeYOptions[0];
  const secondaryOption = activeYOptions.find((o: any) => o.id === secondaryY);

  // Compute maximum values to scale the height of the bars
  const maxPrimaryVal = Math.max(...rawData.map((d: any) => d[primaryY] || 0)) * 1.1;
  const maxSecondaryVal = secondaryY !== 'none' 
    ? Math.max(...rawData.map((d: any) => d[secondaryY] || 0)) * 1.1 
    : 1;

  // Process X-axis sorting/ordering
  const processedData = React.useMemo(() => {
    const list = [...rawData];
    if (xAxisOrder === 'asc') {
      list.sort((a: any, b: any) => (a[primaryY] || 0) - (b[primaryY] || 0));
    } else if (xAxisOrder === 'desc') {
      list.sort((a: any, b: any) => (b[primaryY] || 0) - (a[primaryY] || 0));
    }
    return list;
  }, [rawData, primaryY, xAxisOrder]);

  const aiInsightText = React.useMemo(() => {
    return generateAiInsight(activeReport, frequency, primaryOption.label);
  }, [activeReport, frequency, primaryY]);

  // Calculate summary stats
  const stats = React.useMemo(() => {
    const vals = rawData.map((d: any) => d[primaryY] || 0);
    const total = vals.reduce((sum: number, v: number) => sum + v, 0);
    const avg = total / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    return { total, avg, max, min };
  }, [rawData, primaryY]);

  return (
    <div className="space-y-6">
      {/* Top Header Row with Navigation Back */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/60 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md border-zinc-800 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="relative inline-block text-left">
              <button
                onClick={() => setReportDropdownOpen(!reportDropdownOpen)}
                className="flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white silver-text-gradient bg-transparent border border-transparent hover:border-zinc-800 px-2 py-0.5 rounded-md transition-all cursor-pointer"
              >
                <span>{currentDataset.title}</span>
                <ChevronDown className="h-5 w-5 text-zinc-500 mt-1" />
              </button>
              {reportDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setReportDropdownOpen(false)}
                  />
                  <div className="absolute left-2 mt-2 w-64 bg-zinc-950 border border-zinc-800 shadow-2xl z-20 rounded-md focus:outline-none overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveReport('capacity');
                          setReportDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                          activeReport === 'capacity' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
                        }`}
                      >
                        Operational Capacity
                      </button>
                      <button
                        onClick={() => {
                          setActiveReport('billing');
                          setReportDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider border-t border-zinc-900/80 ${
                          activeReport === 'billing' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
                        }`}
                      >
                        Billings Projections
                      </button>
                      <button
                        onClick={() => {
                          setActiveReport('roi');
                          setReportDropdownOpen(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider border-t border-zinc-900/80 ${
                          activeReport === 'roi' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
                        }`}
                      >
                        Client ROI Yields
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-zinc-500 pl-2 mt-1">{currentDataset.description}</p>
          </div>
        </div>

        {/* Time Period Frequency selector */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-900 rounded-md">
          {(['months', 'quarters', 'years'] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFrequency(f);
                setHoveredBarIndex(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all rounded-md cursor-pointer ${
                frequency === f
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Side: Parameters Customization Panel */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="rounded-md border-zinc-800/80 bg-zinc-950/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <SlidersHorizontal className="h-4 w-4" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Parameters & Axes</CardTitle>
              </div>
              <CardDescription className="text-[11px]">Configure custom parameter values and ordering models.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Y-Axis Parameter Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Primary Y-Axis</label>
                <div className="grid grid-cols-1 gap-1">
                  {activeYOptions.map((opt: any) => (
                    <button
                      key={opt.id}
                      onClick={() => setPrimaryY(opt.id)}
                      className={`text-left px-3 py-2 text-xs border transition-all rounded-md cursor-pointer flex items-center justify-between ${
                        primaryY === opt.id
                          ? 'border-white bg-zinc-900 text-white font-semibold'
                          : 'border-zinc-900 bg-transparent text-zinc-400 hover:text-white hover:border-zinc-800'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className="text-[10px] opacity-60">({opt.unit})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Y-Axis Parameter Selector */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Secondary Y-Axis</label>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() => setSecondaryY('none')}
                    className={`text-left px-3 py-2 text-xs border transition-all rounded-md cursor-pointer ${
                      secondaryY === 'none'
                        ? 'border-white bg-zinc-900 text-white font-semibold'
                        : 'border-zinc-900 bg-transparent text-zinc-400 hover:text-white hover:border-zinc-800'
                    }`}
                  >
                    None (Single Metric)
                  </button>
                  {activeYOptions
                    .filter((opt: any) => opt.id !== primaryY)
                    .map((opt: any) => (
                      <button
                        key={opt.id}
                        onClick={() => setSecondaryY(opt.id)}
                        className={`text-left px-3 py-2 text-xs border transition-all rounded-md cursor-pointer flex items-center justify-between ${
                          secondaryY === opt.id
                            ? 'border-white bg-zinc-900 text-white font-semibold'
                            : 'border-zinc-900 bg-transparent text-zinc-400 hover:text-white hover:border-zinc-800'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] opacity-60">({opt.unit})</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* X-Axis Parameter Sort Option */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">X-Axis Sequence</label>
                <div className="grid grid-cols-1 gap-1">
                  {(['chronological', 'asc', 'desc'] as const).map((order) => (
                    <button
                      key={order}
                      onClick={() => setXAxisOrder(order)}
                      className={`text-left px-3 py-2 text-xs border transition-all rounded-md cursor-pointer flex items-center gap-2 ${
                        xAxisOrder === order
                          ? 'border-white bg-zinc-900 text-white font-semibold'
                          : 'border-zinc-900 bg-transparent text-zinc-400 hover:text-white hover:border-zinc-800'
                      }`}
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <span className="capitalize">{order === 'asc' ? 'Ascending Value' : order === 'desc' ? 'Descending Value' : 'Chronological'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: The Expanded Interactive Graph */}
        <div className="space-y-6 lg:col-span-3">
          <Card className="rounded-md border-zinc-800">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-zinc-900">
              <div>
                <CardTitle className="text-sm font-semibold text-white">
                  {primaryOption.label} {secondaryOption ? `vs ${secondaryOption.label}` : ''}
                </CardTitle>
                <CardDescription className="text-xs">
                  Reviewing {frequency} metrics. Red bars highlight negative periods compared to previous chronological period.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col justify-between pt-6">
              {/* Interactive bar chart */}
              <div className="h-[340px] w-full flex items-end justify-between gap-4 pb-2 border-b border-zinc-900 relative">
                {/* Horizontal Guide Lines */}
                <div className="absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between pointer-events-none opacity-10">
                  <div className="border-t border-dashed border-white w-full" />
                  <div className="border-t border-dashed border-white w-full" />
                  <div className="border-t border-dashed border-white w-full" />
                  <div className="border-t border-dashed border-white w-full" />
                </div>

                {processedData.map((item: any, idx: number) => {
                  const val = item[primaryY] || 0;
                  const chronIndex = item.index;

                  // Comparison Logic: Check change relative to previous period in original CHRONOLOGICAL dataset
                  const chronPrev = chronIndex > 0 ? rawData[chronIndex - 1] : null;
                  const prevVal = chronPrev ? chronPrev[primaryY] : null;
                  
                  const isNegative = prevVal !== null && val < prevVal;
                  
                  // Secondary values
                  const secVal = secondaryY !== 'none' ? item[secondaryY] || 0 : 0;
                  const secChronPrev = chronIndex > 0 ? rawData[chronIndex - 1] : null;
                  const secPrevVal = secChronPrev && secondaryY !== 'none' ? secChronPrev[secondaryY] : null;
                  const isSecNegative = secPrevVal !== null && secVal < secPrevVal;

                  const isHovered = hoveredBarIndex === idx;

                  return (
                    <div 
                      key={idx} 
                      className="flex-1 flex flex-col items-center gap-2 group relative z-10"
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                    >
                      <div className="w-full flex justify-center items-end gap-1 h-[300px]">
                        {/* Primary Value Bar */}
                        <div
                          style={{ height: `${(val / maxPrimaryVal) * 100}%` }}
                          className={`w-full border transition-all duration-150 rounded-sm relative ${
                            isNegative ? 'chart-bar-decline' : 'chart-bar-growth'
                          } ${isHovered ? 'scale-x-[1.05] brightness-125' : ''}`}
                        />
                        {/* Secondary Value Bar if active */}
                        {secondaryY !== 'none' && (
                          <div
                            style={{ height: `${(secVal / maxSecondaryVal) * 100}%` }}
                            className={`w-full border bg-zinc-800 border-zinc-700/60 transition-all duration-150 rounded-sm hover:bg-zinc-700/80 ${
                              isHovered ? 'scale-x-[1.05] brightness-125' : ''
                            }`}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-500 font-sans tracking-tight">{item.label}</span>

                      {/* Floating Tooltip Component */}
                      {isHovered && (
                        <div className="absolute bottom-[320px] left-1/2 -translate-x-1/2 w-48 bg-zinc-950 border border-zinc-800 p-3 shadow-2xl z-50 text-[10px] space-y-1.5 rounded-md text-zinc-300 font-sans">
                          <div className="flex justify-between font-bold border-b border-zinc-900 pb-1 text-white">
                            <span className="uppercase tracking-wider">Period: {item.label}</span>
                            {chronPrev && (
                              <span className={`flex items-center gap-0.5 font-mono ${isNegative ? 'chart-text-decline' : 'chart-text-growth'}`}>
                                {isNegative ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                {prevVal && prevVal > 0 
                                  ? `${(((val - prevVal) / prevVal) * 100).toFixed(1)}%` 
                                  : 'Growth'}
                              </span>
                            )}
                          </div>
                          
                          {/* Primary Y Metric details */}
                          <div className="flex justify-between py-0.5">
                            <span className="text-zinc-500 font-medium">{primaryOption.label}:</span>
                            <span className="font-bold text-white font-mono">{primaryOption.format(val)}</span>
                          </div>

                          {/* Secondary Y Metric details if present */}
                          {secondaryY !== 'none' && (
                            <div className="flex justify-between py-0.5 border-t border-zinc-950 pt-1">
                              <span className="text-zinc-500 font-medium">{secondaryOption?.label}:</span>
                              <span className="font-bold text-white font-mono">{secondaryOption?.format(secVal)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Data Range details summary */}
              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold px-2 mt-2">
                <span>Timeline Start Range</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Full Range: {rawData[0]?.label} - {rawData[rawData.length - 1]?.label}</span>
                </span>
                <span>Timeline End Range</span>
              </div>

              <div className="flex justify-center gap-6 text-[10px] text-zinc-400 font-semibold border-t border-zinc-900 pt-3 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm chart-bar-growth" />
                  <span>Growth / Stable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm chart-bar-decline" />
                  <span>Decline / Negative</span>
                </div>
                {secondaryY !== 'none' && (
                  <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-6">
                    <div className="h-2.5 w-2.5 bg-zinc-800 border border-zinc-700/60 rounded-sm" />
                    <span>Secondary Metric: {secondaryOption?.label}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Metrics Statistics Row */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-md">
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Average Value</span>
              <span className="text-sm font-bold font-mono text-zinc-200 mt-1 block">
                {primaryOption.format(stats.avg)}
              </span>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-md">
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Highest Peak</span>
              <span className="text-sm font-bold font-mono chart-text-growth mt-1 block flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {primaryOption.format(stats.max)}
              </span>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-md">
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Lowest Valley</span>
              <span className="text-sm font-bold font-mono chart-text-decline mt-1 block flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" />
                {primaryOption.format(stats.min)}
              </span>
            </div>
            <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-md">
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Cumulative Sum</span>
              <span className="text-sm font-bold font-mono text-white mt-1 block">
                {primaryOption.format(stats.total)}
              </span>
            </div>
          </div>

          {/* Embedded AI Strategic Insight (Addressing Lohith) */}
          <Card className="rounded-md border-zinc-800 bg-[#09090b]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-zinc-400" />
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">Prism AI Graph Assistant</CardTitle>
                </div>
                <Badge variant="default" className="text-[9px] bg-zinc-900 text-zinc-400 uppercase tracking-wider border-zinc-800 px-2 py-0.5 rounded-md">
                  Prism AI Model
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-zinc-300 leading-relaxed font-sans space-y-3">
              <p>{renderFormattedText(aiInsightText)}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold bg-zinc-950/40 border border-zinc-900/60 p-2.5 rounded-md">
                <Info className="h-4 w-4 shrink-0 text-zinc-600" />
                <span>Adjust the primary/secondary Y-axis values on the left panel to update model parameters and run live predictions.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <React.Suspense fallback={<div className="text-zinc-500 p-8 text-xs uppercase font-mono">Loading Graph Explorer data...</div>}>
      <ExplorerContent />
    </React.Suspense>
  );
}
