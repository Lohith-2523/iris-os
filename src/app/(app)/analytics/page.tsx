'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { formatUserMessage, renderFormattedText } from '@/lib/utils';

export default function AnalyticsPage() {
  const roiData = [
    { client: 'Pulse Media', roi: 5.2, status: 'EXCELLENT' },
    { client: 'Aether Technologies', roi: 4.8, status: 'EXCELLENT' },
    { client: 'Vertex Retail', roi: 3.5, status: 'GOOD' },
    { client: 'Nebula Creative', roi: 3.1, status: 'GOOD' },
    { client: 'Nova BioLabs', roi: 2.1, status: 'FAIR' },
    { client: 'Quantum Capital', roi: 1.8, status: 'FAIR' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Business Intelligence & Analytics</h1>
          <p className="text-xs text-zinc-500">Cross-module campaign attribution, creative engagement metrics, and Client ROI statistics.</p>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Creative Conversion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">4.82%</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+1.2% click-through growth</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Aggregated Impressions</CardTitle>
            <BarChart3 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">1.8M views</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Across linked Canva campaigns</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Client ROI</CardTitle>
            <BarChart3 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">3.1x multiplier</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <span>Stable yield portfolio metrics</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Analytics Sync Status</CardTitle>
            <BarChart3 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">ACTIVE</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Linked webhooks connected</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Visual Client ROI Performance */}
        <div className="md:col-span-2">
          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold text-white">Client ROI Yield Chart</CardTitle>
                <CardDescription>Generated marketing conversion return multiplier per client account.</CardDescription>
              </div>
              <Link href="/explorer?chart=roi">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] border-zinc-800 text-zinc-300 font-semibold px-2 hover:text-white rounded-none"
                >
                  Expand Graph
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {roiData.map((item, idx, arr) => {
                const isNegative = idx > 0 && item.roi < arr[idx - 1].roi;
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-white">{item.client}</span>
                      <span className="font-mono text-zinc-300 font-semibold">{item.roi}x yield</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-900 border border-zinc-800/60 rounded-none overflow-hidden">
                      <div
                        style={{ width: `${(item.roi / 6) * 100}%` }}
                        className={`h-full border-r transition-all rounded-none ${
                          isNegative ? 'chart-bar-decline' : 'chart-bar-growth'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-center gap-6 text-[10px] text-zinc-400 font-semibold border-t border-zinc-900 pt-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-none chart-bar-growth" />
                  <span>Growth / Stable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-none chart-bar-decline" />
                  <span>Decline / Negative</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <InsightPanel
            type="health"
            title="Prisma Business Intelligence"
            score="3.1x Average"
            scoreLabel="PORTFOLIO PERFORMANCE MULTIPLIER"
            riskLevel="LOW"
          >
            {renderFormattedText("Lohith, our high-performing creative deliverables for **Pulse Media** are yielding **5.2x** ROI. Replicating the design structure and content calendars to our **Nova BioLabs** account could improve their yield by up to 45%.")}
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
