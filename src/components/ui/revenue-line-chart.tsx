import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface RevenueLineChartProps {
  data: Array<{ label: string; value?: number; revenue?: number; expenses?: number; receivables?: number }>;
  title?: string;
  description?: string;
  currencyRate?: number;
  className?: string;
  contentClassName?: string;
  selectableSeries?: boolean;
}

type FinanceSeries = 'revenue' | 'expenses' | 'receivables';

const seriesOptions: Array<{ key: FinanceSeries; label: string }> = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'receivables', label: 'Receivables' },
];

const seriesColors: Record<FinanceSeries, string> = {
  revenue: '#10b981',
  expenses: '#ef4444',
  receivables: '#eab308',
};

export function RevenueLineChart({ 
  data, 
  title = "Revenue Over Time", 
  description = "Tracking revenue trends.", 
  currencyRate = 1,
  className,
  contentClassName,
  selectableSeries = false,
}: RevenueLineChartProps) {
  const [activeSeries, setActiveSeries] = React.useState<FinanceSeries[]>(() => seriesOptions.map((series) => series.key));
  const toggleSeries = React.useCallback((series: FinanceSeries) => {
    setActiveSeries((current) => {
      if (!current.includes(series)) return [...current, series];
      return current.length === 1 ? current : current.filter((item) => item !== series);
    });
  }, []);
  const chartData = React.useMemo(() => {
    const normalized = data.map((point) => ({
      label: point.label,
      revenue: Number(point.revenue ?? point.value ?? 0),
      expenses: Number(point.expenses ?? 0),
      receivables: Number(point.receivables ?? 0),
    }));
    if (normalized.length !== 1) return normalized;
    return [
      { label: 'Start', revenue: 0, expenses: 0, receivables: 0 },
      normalized[0],
    ];
  }, [data]);

  return (
    <Card className={className ?? "w-full"}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-white">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={cn('revenue-line-chart-frame min-h-64 min-w-0 w-full', contentClassName ?? 'h-72')}>
          <AreaChart responsive style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 256 }} data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="expenses-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="receivables-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eab308" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#eab308" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="label" 
              stroke="#52525b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              dy={10} 
            />
            <YAxis 
              stroke="#52525b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              domain={[0, 'auto']}
              tickFormatter={(val) => `${val / 1000}k`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px' }}
              itemStyle={{ color: '#f4f4f5' }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
              formatter={(val: any, name: any) => [
                formatCurrency((Number(val) || 0) * currencyRate),
                name === 'revenue' ? 'Revenue' : name === 'expenses' ? 'Expenses' : 'Pending receivables',
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value) => value === 'revenue' ? 'Revenue' : value === 'expenses' ? 'Expenses' : 'Pending receivables'}
              content={selectableSeries ? () => (
                <div className="revenue-series-legend" role="group" aria-label="Financial graph metrics">
                  {seriesOptions.map((series) => (
                    <button
                      key={series.key}
                      type="button"
                      aria-pressed={activeSeries.includes(series.key)}
                      onClick={() => toggleSeries(series.key)}
                      className="revenue-series-legend-item"
                      data-active={activeSeries.includes(series.key)}
                    >
                      <span className="revenue-series-legend-line" style={{ backgroundColor: seriesColors[series.key] }} aria-hidden="true" />
                      {series.label}
                    </button>
                  ))}
                </div>
              ) : undefined}
            />
            {(!selectableSeries || activeSeries.includes('revenue')) && <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981" 
              strokeWidth={3}
              fill="url(#revenue-area)"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />}
            {(!selectableSeries || activeSeries.includes('expenses')) && <Area
              type="monotone"
              dataKey="expenses"
              stroke="#ef4444"
              strokeWidth={3}
              fill="url(#expenses-area)"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />}
            {(!selectableSeries || activeSeries.includes('receivables')) && <Area
              type="monotone"
              dataKey="receivables"
              stroke="#eab308"
              strokeWidth={3}
              fill="url(#receivables-area)"
              dot={{ fill: '#eab308', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />}
          </AreaChart>
      </CardContent>
    </Card>
  );
}
