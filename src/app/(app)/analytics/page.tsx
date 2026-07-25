'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { formatUserMessage, renderFormattedText } from '@/lib/utils';
import { PrismAIService } from '@/lib/prism-ai/service';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';

export default function AnalyticsPage() {
  const [dbClients, setDbClients] = React.useState<any[]>([]);
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Strategy Builder State
  const [strategyCategory, setStrategyCategory] = React.useState<'financial' | 'marketing' | 'leads' | 'retention'>('financial');
  const [strategyInput, setStrategyInput] = React.useState('');
  const [strategyOutput, setStrategyOutput] = React.useState('');
  const [isGeneratingStrategy, setIsGeneratingStrategy] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        const clientRes = await fetch('/api/data?domain=clients');
        if (clientRes.ok) {
          const clientJson = await clientRes.json();
          setDbClients(clientJson || []);
        }
        
        const campaignRes = await fetch('/api/data?domain=client-dashboard');
        if (campaignRes.ok) {
          const campJson = await campaignRes.json();
          setCampaigns(campJson.campaigns || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleFormulateStrategy = async () => {
    setIsGeneratingStrategy(true);
    setStrategyOutput('');
    try {
      let query = '';
      if (strategyCategory === 'financial') {
        query = `Generate a comprehensive financial optimization strategy for the agency. Objectives: minimize overhead, audit SaaS seat leaks, and project margins. Custom notes: ${strategyInput}`;
      } else if (strategyCategory === 'marketing') {
        query = `Formulate a high-performing marketing and campaign strategy. Focus on cost-per-lead optimization, placement adjustments, and creative asset pipelines. Custom notes: ${strategyInput}`;
      } else if (strategyCategory === 'leads') {
        query = `Design a lead acquisition and conversion strategy. Detail form optimization techniques, response workflows, and audience targeting. Custom notes: ${strategyInput}`;
      } else {
        query = `Build a customer retention and health recovery strategy. Focus on mitigating risk, scheduling check-ins, and offering flexible retainer models. Custom notes: ${strategyInput}`;
      }
      
      const res = await PrismAIService.askPrism(query);
      setStrategyOutput(res.result || 'No strategy generated.');
    } catch (e) {
      console.error(e);
      setStrategyOutput('⚠️ Failed to communicate with Prism AI. Please try again.');
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  // Computations
  const totalImpressions = campaigns.reduce((sum, camp) => sum + (camp.ads || []).reduce((s: number, a: any) => s + (a.reach || 0) * 1.5, 0), 0);
  const totalClicks = campaigns.reduce((sum, camp) => sum + (camp.ads || []).reduce((s: number, a: any) => s + (a.clicks || 0), 0), 0);
  const conversionRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgRoi = dbClients.length > 0 ? (dbClients.reduce((sum, c) => sum + (c.healthScore / 25), 0) / dbClients.length) : 0;

  const roiData = dbClients.map(c => ({
    client: c.name,
    roi: Number((c.healthScore / 20).toFixed(1)),
    status: c.healthStatus
  })).sort((a, b) => b.roi - a.roi);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Business Intelligence & Analytics</h1>
          <p className="text-xs text-zinc-500">Cross-module campaign attribution, creative engagement metrics, and Client ROI statistics.</p>
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
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {conversionRate > 0 ? `${conversionRate.toFixed(2)}%` : '—'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{conversionRate > 0 ? 'Click-through growth' : 'No ad data synced'}</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Aggregated Impressions</CardTitle>
            <BarChart3 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {totalImpressions > 0 ? `${(totalImpressions / 1000).toFixed(0)}K views` : '0 views'}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
              <span>Across linked Meta campaigns</span>
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Average Client ROI</CardTitle>
            <BarChart3 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {avgRoi > 0 ? `${avgRoi.toFixed(1)}x multiplier` : '—'}
            </div>
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
            <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
              {campaigns.length > 0 ? 'ACTIVE' : 'INACTIVE'}
            </div>
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
              {roiData.length === 0 ? (
                <div className="text-xs text-zinc-500 italic text-center py-6">No clients registered.</div>
              ) : (
                roiData.map((item, idx, arr) => {
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
                })
              )}
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
            score={avgRoi > 0 ? `${avgRoi.toFixed(1)}x Average` : '—'}
            scoreLabel="PORTFOLIO PERFORMANCE MULTIPLIER"
            riskLevel="LOW"
          >
            {renderFormattedText(dbClients.length > 0 
              ? `Lohith, our client portfolio averages **${avgRoi.toFixed(1)}x** ROI. Replicating strategy maps across similar verticals will improve lower-performing clients.`
              : 'Lohith, register clients and connect marketing accounts to view portfolio intelligence.'
            )}
          </InsightPanel>
        </div>
      </div>

      {/* Strategy Builder Section */}
      <Card className="border-zinc-800 bg-[#0d0e12]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-450 animate-pulse" />
            <CardTitle className="text-sm font-semibold text-white">Strategy Building with Prism AI</CardTitle>
          </div>
          <CardDescription>
            Formulate targeted business playbook strategies across financials, marketing delivery, and lead channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Strategy Focus Category</label>
              <select
                value={strategyCategory}
                onChange={(e) => setStrategyCategory(e.target.value as any)}
                className="w-full text-xs bg-zinc-950 border border-zinc-850 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md"
              >
                <option value="financial">Financial Optimization</option>
                <option value="marketing">Marketing & Campaign Placement</option>
                <option value="leads">Agency Lead Acquisition</option>
                <option value="retention">Client Churn Prevention</option>
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Custom Constraints or Goals (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Reduce cost per lead by 20%, target high-ticket contractors"
                value={strategyInput}
                onChange={(e) => setStrategyInput(e.target.value)}
                className="w-full text-xs bg-zinc-950 border border-zinc-850 focus:border-zinc-700 px-3 py-2 text-white outline-none rounded-md"
              />
            </div>
          </div>
          <Button
            onClick={handleFormulateStrategy}
            disabled={isGeneratingStrategy}
            className="w-full h-9 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGeneratingStrategy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Formulating Strategic Playbook...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Formulate Dynamic Strategy</span>
              </>
            )}
          </Button>

          {strategyOutput && (
            <div className="mt-4 border border-zinc-805 bg-zinc-950/40 p-4 rounded-md animate-fadeIn">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900 mb-3 text-xs">
                <span className="font-bold text-zinc-400 uppercase tracking-widest">Generated Playbook</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([strategyOutput], { type: 'text/markdown;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `prism_strategy_${strategyCategory}.md`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="h-6 text-[10px] px-2 text-zinc-450 hover:text-white rounded cursor-pointer"
                >
                  Download .md
                </Button>
              </div>
              <div className="text-zinc-300 leading-relaxed font-sans text-xs max-h-[300px] overflow-y-auto pr-1">
                <FormattedMarkdown text={strategyOutput} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
