import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface RevenueLineChartProps {
  data: { label: string; value: number }[];
  title?: string;
  description?: string;
  currencyRate?: number;
  className?: string;
  contentClassName?: string;
}

export function RevenueLineChart({ 
  data, 
  title = "Revenue Over Time", 
  description = "Tracking revenue trends.", 
  currencyRate = 1,
  className,
  contentClassName,
}: RevenueLineChartProps) {
  return (
    <Card className={className ?? "w-full"}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-white">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={contentClassName ?? "h-72"}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              tickFormatter={(val) => `${val / 1000}k`}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px' }}
              itemStyle={{ color: '#10b981' }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
              formatter={(val: any) => [formatCurrency((val as number || 0) * currencyRate), 'Revenue']}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
