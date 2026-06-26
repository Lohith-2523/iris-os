'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { PrismAIService } from '@/lib/prism-ai/service';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { TrendingUp, Sparkles, Filter, ChevronRight } from 'lucide-react';
import { formatUserMessage } from '@/lib/utils';

export default function ForecastingPage() {
  const [dbFinance, setDbFinance] = React.useState<any>(null);
  const [aiText, setAiText] = React.useState<string>(formatUserMessage('Lohith, compiling rolling revenue forecast analysis via ChatGPT...'));

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/data?domain=finance');
        if (res.ok) {
          const json = await res.json();
          setDbFinance(json);
          
          // Request forecasting text from secure Prism AI API
          const aiRes = await fetch('/api/prism-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'forecasting', context: json })
          });
          if (aiRes.ok) {
            const aiJson = await aiRes.json();
            setAiText(formatUserMessage(aiJson.result));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Financial & Pipeline Forecasting</h1>
          <p className="text-xs text-zinc-500">Run predictive models on recurring client contracts, projected resource needs, and overhead expenses.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-300 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            <span>Adjust Variables</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Projected Q3 Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {dbFinance ? `$${(dbFinance.grossBillings * 1.5).toLocaleString()}` : '$645,000'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+8.4% increase expected</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Projected Q3 Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">34.2%</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Includes overhead buffers</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Model Confidence Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">92%</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <span>High confidence criteria met</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Forecast Horizon</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">6 Months</div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Rolling model updates daily</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Forecast visual representation */}
        <div className="md:col-span-2">
          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold text-white">6-Month Billings Projection</CardTitle>
                <CardDescription>Visual comparison of base projected billing vs overhead expenditures.</CardDescription>
              </div>
              <Link href="/explorer?chart=forecast">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] border-zinc-800 text-zinc-300 font-semibold px-2 hover:text-white rounded-none"
                >
                  Expand Graph
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col justify-between pt-4">
              <div className="h-[240px] w-full flex items-end justify-between gap-6 pb-2">
                {[
                  { month: 'Jul', revenue: 205000, expenses: 132000 },
                  { month: 'Aug', revenue: 210000, expenses: 134000 },
                  { month: 'Sep', revenue: 215000, expenses: 136000 },
                  { month: 'Oct', revenue: 220000, expenses: 138000 },
                  { month: 'Nov', revenue: 225000, expenses: 140000 },
                  { month: 'Dec', revenue: 230000, expenses: 142000 },
                ].map((item, idx, arr) => {
                  const isRevNegative = idx > 0 && item.revenue < arr[idx - 1].revenue;
                  const isExpNegative = idx > 0 && item.expenses < arr[idx - 1].expenses;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex justify-center items-end gap-1.5 h-[200px]">
                        {/* Projected Revenue */}
                        <div
                          style={{ height: `${(item.revenue / 250000) * 100}%` }}
                          className={`w-1/2 border transition-all rounded-none ${
                            isRevNegative ? 'chart-bar-decline' : 'chart-bar-growth'
                          }`}
                          title={`Revenue: $${item.revenue.toLocaleString()} (${isRevNegative ? 'Negative Growth' : 'Positive/Stable'})`}
                        />
                        {/* Projected Expenses */}
                        <div
                          style={{ height: `${(item.expenses / 250000) * 100}%` }}
                          className={`w-1/2 border transition-all rounded-none ${
                            isExpNegative ? 'chart-bar-decline' : 'chart-bar-growth'
                          }`}
                          title={`Expenses: $${item.expenses.toLocaleString()} (${isExpNegative ? 'Decrease' : 'Increase/Stable'})`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-500 font-sans">{item.month}</span>
                    </div>
                  );
                })}
              </div>
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
            type="general"
            title="Prism Strategic Forecast"
            score="92%"
            scoreLabel="MODEL CONFIDENCE VALUE"
            riskLevel="LOW"
          >
            <FormattedMarkdown text={aiText} />
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
