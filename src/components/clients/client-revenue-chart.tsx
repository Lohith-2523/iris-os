'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ClientRevenueChartProps {
  clients?: any[];
}

export function ClientRevenueChart({ clients }: ClientRevenueChartProps) {
  const data = clients || [];

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-950/40 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white">Client Revenue Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-xs text-zinc-500 italic text-center py-12">No active client revenue records.</div>
          ) : (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 10 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#0d0e12] border border-zinc-800 rounded-md p-2 shadow-xl">
                            <p className="text-xs font-semibold text-white">{payload[0].payload.name}</p>
                            <p className="text-sm font-mono font-bold text-emerald-400 mt-1">
                              {formatCurrency(payload[0].value as number)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#34d399' : '#059669'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-950/40 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-white">Revenue Report</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-500">Client</TableHead>
                <TableHead className="text-right text-zinc-500">Revenue</TableHead>
                <TableHead className="text-right text-zinc-500">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-zinc-500">
                    No active clients.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((client) => (
                  <TableRow key={client.id} className="border-zinc-800 hover:bg-zinc-900/30">
                    <TableCell className="font-medium text-zinc-300">{client.name}</TableCell>
                    <TableCell className="text-right font-mono text-white">{formatCurrency(client.revenue)}</TableCell>
                    <TableCell className="text-right font-mono text-zinc-400">{client.percentage}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
