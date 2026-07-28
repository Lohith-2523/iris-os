'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface ClientPortfolioValueChartProps {
  clients?: Array<{
    id: string;
    name: string;
    portfolioValue: number;
  }>;
}

function ClientValueChart({
  data,
  title,
  emptyLabel,
}: {
  data: Array<{ id: string; name: string; portfolioValue: number }>;
  title: string;
  emptyLabel: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-950/40">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-12 text-center text-xs italic text-zinc-500">{emptyLabel}</div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 42 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-24}
                  textAnchor="end"
                  height={64}
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={58}
                  tick={{ fill: '#71717a', fontSize: 9 }}
                  tickFormatter={(value) => new Intl.NumberFormat('en-IN', {
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(Number(value))}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border border-zinc-800 bg-[#0d0e12] p-2 shadow-xl">
                        <p className="text-xs font-semibold text-white">{payload[0].payload.name}</p>
                        <p className="mt-1 font-mono text-sm font-bold text-zinc-200">
                          {formatCurrency(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="portfolioValue" radius={[5, 5, 0, 0]} maxBarSize={64}>
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.id}
                      fill={index === 0 ? '#e4e4e7' : index === 1 ? '#a1a1aa' : '#71717a'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ClientPortfolioValueChart({ clients }: ClientPortfolioValueChartProps) {
  return (
    <ClientValueChart
      data={clients || []}
      title="Portfolio Value Distribution"
      emptyLabel="No contracted portfolio value recorded."
    />
  );
}

export function ClientRevenueChart({
  clients,
}: {
  clients?: Array<{ id: string; name: string; revenue: number }>;
}) {
  return (
    <ClientValueChart
      data={(clients || []).map((client) => ({
        id: client.id,
        name: client.name,
        portfolioValue: client.revenue,
      }))}
      title="Client Revenue Distribution"
      emptyLabel="No client revenue recorded."
    />
  );
}
