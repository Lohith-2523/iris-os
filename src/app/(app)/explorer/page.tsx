'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatUserMessage, renderFormattedText } from '@/lib/utils';
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
const DATASETS = {
  capacity: {
    title: 'Operational Capacity & Monthly Billings',
    description: 'Correlation between resource utilization and monthly billable revenue.',
    yOptions: [
      { id: 'revenue', label: 'Gross Revenue', format: (v: number) => `$${v.toLocaleString()}`, unit: '$' },
      { id: 'capacity', label: 'Resource Capacity', format: (v: number) => `${v}%`, unit: '%' },
      { id: 'overhead', label: 'Overhead Budget', format: (v: number) => `$${v.toLocaleString()}`, unit: '$' },
      { id: 'yield', label: 'Resource Yield', format: (v: number) => `${v}x`, unit: 'x' }
    ],
    months: [
      { label: 'Jan', revenue: 150000, capacity: 62, overhead: 90000, yield: 1.66, index: 0 },
      { label: 'Feb', revenue: 162000, capacity: 70, overhead: 95000, yield: 1.70, index: 1 },
      { label: 'Mar', revenue: 175000, capacity: 78, overhead: 100000, yield: 1.75, index: 2 },
      { label: 'Apr', revenue: 168000, capacity: 74, overhead: 98000, yield: 1.71, index: 3 },
      { label: 'May', revenue: 185000, capacity: 82, overhead: 105000, yield: 1.76, index: 4 },
      { label: 'Jun', revenue: 198000, capacity: 88, overhead: 110000, yield: 1.80, index: 5 },
      { label: 'Jul', revenue: 205000, capacity: 85, overhead: 112000, yield: 1.83, index: 6 },
      { label: 'Aug', revenue: 210000, capacity: 87, overhead: 115000, yield: 1.82, index: 7 },
      { label: 'Sep', revenue: 200000, capacity: 80, overhead: 110000, yield: 1.81, index: 8 },
      { label: 'Oct', revenue: 220000, capacity: 89, overhead: 118000, yield: 1.86, index: 9 },
      { label: 'Nov', revenue: 225000, capacity: 90, overhead: 120000, yield: 1.87, index: 10 },
      { label: 'Dec', revenue: 240000, capacity: 95, overhead: 125000, yield: 1.92, index: 11 },
    ],
    quarters: [
      { label: 'Q1', revenue: 487000, capacity: 70, overhead: 285000, yield: 1.71, index: 0 },
      { label: 'Q2', revenue: 551000, capacity: 81, overhead: 313000, yield: 1.76, index: 1 },
      { label: 'Q3', revenue: 615000, capacity: 84, overhead: 337000, yield: 1.82, index: 2 },
      { label: 'Q4', revenue: 685000, capacity: 91, overhead: 363000, yield: 1.89, index: 3 },
    ],
    years: [
      { label: '2024', revenue: 1850000, capacity: 68, overhead: 1150000, yield: 1.61, index: 0 },
      { label: '2025', revenue: 2340000, capacity: 82, overhead: 1300000, yield: 1.80, index: 1 },
      { label: '2026', revenue: 2750000, capacity: 89, overhead: 1450000, yield: 1.90, index: 2 },
    ]
  },
  billing: {
    title: 'Billings & Overhead Projections',
    description: 'Forecasted gross billings compared with recurring operational expenditure packages.',
    yOptions: [
      { id: 'revenue', label: 'Projected Billings', format: (v: number) => `$${v.toLocaleString()}`, unit: '$' },
      { id: 'expenses', label: 'Overhead Expenses', format: (v: number) => `$${v.toLocaleString()}`, unit: '$' },
      { id: 'margin', label: 'Net profit Margin', format: (v: number) => `${v}%`, unit: '%' }
    ],
    months: [
      { label: 'Jan', revenue: 190000, expenses: 128000, margin: 32.6, index: 0 },
      { label: 'Feb', revenue: 195000, expenses: 130000, margin: 33.3, index: 1 },
      { label: 'Mar', revenue: 200000, expenses: 132000, margin: 34.0, index: 2 },
      { label: 'Apr', revenue: 198000, expenses: 131000, margin: 33.8, index: 3 },
      { label: 'May', revenue: 205000, expenses: 133000, margin: 35.1, index: 4 },
      { label: 'Jun', revenue: 210000, expenses: 135000, margin: 35.7, index: 5 },
      { label: 'Jul', revenue: 205000, expenses: 132000, margin: 35.6, index: 6 },
      { label: 'Aug', revenue: 210000, expenses: 134000, margin: 36.2, index: 7 },
      { label: 'Sep', revenue: 215000, expenses: 136000, margin: 36.7, index: 8 },
      { label: 'Oct', revenue: 220000, expenses: 138000, margin: 37.3, index: 9 },
      { label: 'Nov', revenue: 225000, expenses: 140000, margin: 37.8, index: 10 },
      { label: 'Dec', revenue: 230000, expenses: 142000, margin: 38.3, index: 11 },
    ],
    quarters: [
      { label: 'Q1', revenue: 585000, expenses: 390000, margin: 33.3, index: 0 },
      { label: 'Q2', revenue: 613000, expenses: 399000, margin: 34.9, index: 1 },
      { label: 'Q3', revenue: 630000, expenses: 402000, margin: 36.2, index: 2 },
      { label: 'Q4', revenue: 675000, expenses: 420000, margin: 37.8, index: 3 },
    ],
    years: [
      { label: '2024', revenue: 2100000, expenses: 1420000, margin: 32.4, index: 0 },
      { label: '2025', revenue: 2500000, expenses: 1600000, margin: 36.0, index: 1 },
      { label: '2026', revenue: 2900000, expenses: 1800000, margin: 37.9, index: 2 },
    ]
  },
  roi: {
    title: 'Client ROI & Media Portfolios',
    description: 'Client campaign yield metrics tracking return multipliers against media spend.',
    yOptions: [
      { id: 'roi', label: 'ROI Multiplier', format: (v: number) => `${v}x`, unit: 'x' },
      { id: 'spend', label: 'Media Spend', format: (v: number) => `$${v.toLocaleString()}`, unit: '$' },
      { id: 'revenueGenerated', label: 'Attributed Revenue', format: (v: number) => `$${v.toLocaleString()}`, unit: '$' }
    ],
    months: [
      { label: 'Jan', roi: 2.8, spend: 40000, revenueGenerated: 112000, index: 0 },
      { label: 'Feb', roi: 3.0, spend: 42000, revenueGenerated: 126000, index: 1 },
      { label: 'Mar', roi: 3.2, spend: 45000, revenueGenerated: 144000, index: 2 },
      { label: 'Apr', roi: 2.9, spend: 43000, revenueGenerated: 124700, index: 3 },
      { label: 'May', roi: 3.3, spend: 48000, revenueGenerated: 158400, index: 4 },
      { label: 'Jun', roi: 3.5, spend: 50000, revenueGenerated: 175000, index: 5 },
      { label: 'Jul', roi: 3.4, spend: 52000, revenueGenerated: 176800, index: 6 },
      { label: 'Aug', roi: 3.6, spend: 55000, revenueGenerated: 198000, index: 7 },
      { label: 'Sep', roi: 3.2, spend: 53000, revenueGenerated: 169600, index: 8 },
      { label: 'Oct', roi: 3.8, spend: 58000, revenueGenerated: 220400, index: 9 },
      { label: 'Nov', roi: 3.9, spend: 60000, revenueGenerated: 234000, index: 10 },
      { label: 'Dec', roi: 4.1, spend: 65000, revenueGenerated: 266500, index: 11 },
    ],
    quarters: [
      { label: 'Q1', roi: 3.00, spend: 127000, revenueGenerated: 381000, index: 0 },
      { label: 'Q2', roi: 3.24, spend: 138000, revenueGenerated: 447000, index: 1 },
      { label: 'Q3', roi: 3.40, spend: 160000, revenueGenerated: 544000, index: 2 },
      { label: 'Q4', roi: 3.93, spend: 183000, revenueGenerated: 720900, index: 3 },
    ],
    years: [
      { label: '2024', roi: 2.90, spend: 480000, revenueGenerated: 1392000, index: 0 },
      { label: '2025', roi: 3.40, spend: 550000, revenueGenerated: 1870000, index: 1 },
      { label: '2026', roi: 3.80, spend: 620000, revenueGenerated: 2356000, index: 2 },
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
    return `Lohith, looking at the ${frequency} capacity analysis mapping ${primaryY}, we notice that capacity expansions show high efficiency ratios. During Q2 and early summer, billings scaled ahead of personnel utilization. However, a minor profit leak is present in contractor software subscriptions. I recommend stabilizing allocations near 82% to sustain profit margins while avoiding delivery team fatigue.`;
  } else if (report === 'billing') {
    return `Lohith, the ${frequency} billing projections show that net revenue is tracking safely above our core overhead levels. Note that in periods where ${primaryY} exhibits a visual dip (e.g. April MoM), our reserve multipliers absorbed the variance. Retaining a 35% margin buffer allows us to confidently take on 2 additional high-value accounts in Q3.`;
  } else {
    return `Lohith, client campaign return multipliers tracking ${primaryY} show high stability. Our premium Meta campaign funnels have yielded strong results, particularly in late Q4 (peaking at 4.1x). We should re-deploy similar asset combinations to under-performing accounts to drive a general 15% increase in portfolio yield.`;
  }
}

function ExplorerContent() {
  const searchParams = useSearchParams();
  const chartType = searchParams.get('chart');

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

  const currentDataset = DATASETS[activeReport];
  const activeYOptions = currentDataset.yOptions;
  const rawData: any[] = currentDataset[frequency];

  // Primary formatting definitions
  const primaryOption = activeYOptions.find(o => o.id === primaryY) || activeYOptions[0];
  const secondaryOption = activeYOptions.find(o => o.id === secondaryY);

  // Compute maximum values to scale the height of the bars
  const maxPrimaryVal = Math.max(...rawData.map(d => d[primaryY] || 0)) * 1.1;
  const maxSecondaryVal = secondaryY !== 'none' 
    ? Math.max(...rawData.map(d => d[secondaryY] || 0)) * 1.1 
    : 1;

  // Process X-axis sorting/ordering
  const processedData = React.useMemo(() => {
    const list = [...rawData];
    if (xAxisOrder === 'asc') {
      list.sort((a, b) => (a[primaryY] || 0) - (b[primaryY] || 0));
    } else if (xAxisOrder === 'desc') {
      list.sort((a, b) => (b[primaryY] || 0) - (a[primaryY] || 0));
    }
    return list;
  }, [rawData, primaryY, xAxisOrder]);

  const aiInsightText = React.useMemo(() => {
    return generateAiInsight(activeReport, frequency, primaryOption.label);
  }, [activeReport, frequency, primaryY]);

  // Calculate summary stats
  const stats = React.useMemo(() => {
    const vals = rawData.map(d => d[primaryY] || 0);
    const total = vals.reduce((sum, v) => sum + v, 0);
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
                  {activeYOptions.map((opt) => (
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
                    .filter(opt => opt.id !== primaryY)
                    .map((opt) => (
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

                {processedData.map((item, idx) => {
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
