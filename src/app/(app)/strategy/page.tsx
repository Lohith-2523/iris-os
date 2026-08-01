'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  Clock3,
  Download,
  FileClock,
  Loader2,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StrategyType = 'UPSELL' | 'MARKETING' | 'FINANCIAL';

type ContextOption = {
  id: string;
  name: string;
  status: string;
  clientId?: string;
  clientName?: string;
};

type StrategyRecord = {
  id: string;
  type: StrategyType;
  title: string;
  goal: string;
  timeline: string;
  content: string;
  model: string;
  createdAt: string;
  createdBy: { name: string };
};

const STRATEGY_SECTIONS: Array<{
  type: StrategyType;
  label: string;
  eyebrow: string;
  description: string;
  goalPlaceholder: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: 'UPSELL',
    label: 'Upsell strategy',
    eyebrow: 'Client expansion',
    description: 'Turn delivery evidence and account context into credible expansion opportunities.',
    goalPlaceholder: 'Example: Identify ₹12L in expansion opportunities without increasing churn risk.',
    icon: ArrowUpRight,
  },
  {
    type: 'MARKETING',
    label: 'Marketing strategy',
    eyebrow: 'Market positioning',
    description: 'Shape positioning and acquisition priorities from your real client and service portfolio.',
    goalPlaceholder: 'Example: Build a focused pipeline plan for the agency’s strongest service line.',
    icon: Megaphone,
  },
  {
    type: 'FINANCIAL',
    label: 'Financial strategy',
    eyebrow: 'Commercial resilience',
    description: 'Plan pricing, portfolio mix, and commercial guardrails without treating invoices as revenue.',
    goalPlaceholder: 'Example: Improve project margin quality over the next two quarters.',
    icon: BarChart3,
  },
];

const EMPTY_FORM = {
  title: '',
  goal: '',
  timeline: 'Next 90 days',
  targetAudience: '',
  constraints: '',
  additionalNotes: '',
  clientIds: [] as string[],
  projectIds: [] as string[],
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function typeLabel(type: StrategyType) {
  return STRATEGY_SECTIONS.find((item) => item.type === type)?.label || 'Strategy';
}

function strategyBody(strategy: StrategyRecord) {
  const lines = strategy.content.split('\n');
  const firstContentIndex = lines.findIndex((line) => line.trim());
  if (firstContentIndex >= 0) {
    const firstHeading = lines[firstContentIndex].trim().match(/^#\s+(.*)$/);
    if (firstHeading?.[1].trim().toLowerCase() === strategy.title.trim().toLowerCase()) {
      lines.splice(firstContentIndex, 1);
    }
  }
  return lines.join('\n').trim();
}

function MultiSelect({
  label,
  description,
  options,
  selected,
  onChange,
}: {
  label: string;
  description: string;
  options: ContextOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
        <p className="mt-1 text-[11px] text-zinc-600">{description}</p>
      </div>
      <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
        {options.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-zinc-600">No records available.</p>
        ) : options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(active ? selected.filter((id) => id !== option.id) : [...selected, option.id])}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
              )}
            >
              <span className="min-w-0 truncate">
                {option.name}
                {option.clientName ? <span className="ml-1.5 text-[10px] text-zinc-600">· {option.clientName}</span> : null}
              </span>
              <span className={cn('workspace-selected-icon ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border', active ? 'border-zinc-500 bg-white text-black' : 'border-zinc-700')}>
                {active && <Check className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StrategyPage() {
  const [activeType, setActiveType] = React.useState<StrategyType>('UPSELL');
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [strategies, setStrategies] = React.useState<StrategyRecord[]>([]);
  const [clients, setClients] = React.useState<ContextOption[]>([]);
  const [projects, setProjects] = React.useState<ContextOption[]>([]);
  const [selectedStrategy, setSelectedStrategy] = React.useState<StrategyRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/strategies');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to load Strategy Studio.');
      setStrategies(result.strategies || []);
      setClients(result.clients || []);
      setProjects(result.projects || []);
      setSelectedStrategy((current) => current || result.strategies?.[0] || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Strategy Studio.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const activeSection = STRATEGY_SECTIONS.find((section) => section.type === activeType)!;
  const filteredProjects = form.clientIds.length
    ? projects.filter((project) => project.clientId && form.clientIds.includes(project.clientId))
    : projects;

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (generating) return;
    setGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, ...form }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Atlas AI could not generate this strategy.');
      setStrategies((current) => [result.strategy, ...current.filter((item) => item.id !== result.strategy.id)]);
      setSelectedStrategy(result.strategy);
      setForm(EMPTY_FORM);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Atlas AI could not generate this strategy.');
    } finally {
      setGenerating(false);
    }
  };

  const download = async (strategy: StrategyRecord) => {
    if (downloadingId) return;
    setDownloadingId(strategy.id);
    setError('');
    try {
      const response = await globalThis.fetch(`/api/strategies/${strategy.id}/pdf`, { cache: 'no-store' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Unable to download this strategy.');
      }
      const blob = await response.blob();
      if (!(response.headers.get('content-type') || '').includes('application/pdf') || blob.size < 500) {
        throw new Error('The server returned an invalid strategy PDF.');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${strategy.title.replace(/[^A-Za-z0-9._-]+/g, '_') || 'strategy'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to download this strategy.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-zinc-800/60 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            <Sparkles className="h-3.5 w-3.5" /> Atlas AI-powered planning
          </div>
          <h1 className="silver-text-gradient text-2xl font-bold tracking-tight text-white">Strategy Studio</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
            Build actionable strategies from manually onboarded Iris OS client and project records—never connected third-party data.
          </p>
        </div>
        <Badge className="w-fit border-zinc-800 bg-zinc-900 text-zinc-300">{strategies.length} saved strategies</Badge>
      </div>

      {error && <div className="rounded-lg border border-amber-900/40 bg-amber-950/15 p-3 text-xs text-amber-300">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        {STRATEGY_SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = section.type === activeType;
          const historyCount = strategies.filter((strategy) => strategy.type === section.type).length;
          return (
            <button key={section.type} type="button" onClick={() => setActiveType(section.type)} className="text-left">
              <Card className={cn('h-full transition-colors', active && 'border-zinc-600 bg-zinc-900/70')}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={cn('workspace-selected-icon flex h-9 w-9 items-center justify-center rounded-lg border', active ? 'border-zinc-600 bg-white text-black' : 'border-zinc-800 bg-zinc-950 text-zinc-400')}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-zinc-600">{historyCount} saved</span>
                  </div>
                  <div className="pt-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">{section.eyebrow}</p>
                    <CardTitle className="mt-1 text-sm text-white">{section.label}</CardTitle>
                    <CardDescription className="mt-1.5 leading-relaxed">{section.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="border-b border-zinc-800/70">
            <CardTitle className="text-sm text-white">Create {activeSection.label.toLowerCase()}</CardTitle>
            <CardDescription>Atlas AI receives the selected first-party records plus this brief. Leaving scope empty includes all clients and projects.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={generate} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-xs text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Strategy name <span className="font-normal normal-case tracking-normal">(optional)</span></span>
                  <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={140} placeholder="Atlas AI can name it for you" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none focus:border-zinc-600" />
                </label>
                <label className="space-y-1.5 text-xs text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Strategy timeline *</span>
                  <input value={form.timeline} onChange={(event) => setForm({ ...form, timeline: event.target.value })} required maxLength={240} placeholder="Next 90 days" className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none focus:border-zinc-600" />
                </label>
              </div>
              <label className="block space-y-1.5 text-xs text-zinc-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">End goal *</span>
                <textarea value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} required maxLength={1500} rows={3} placeholder={activeSection.goalPlaceholder} className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs leading-relaxed text-white outline-none focus:border-zinc-600" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <MultiSelect label="Client scope" description="Select priority accounts, or leave empty for all." options={clients} selected={form.clientIds} onChange={(clientIds) => setForm({ ...form, clientIds, projectIds: form.projectIds.filter((id) => projects.some((project) => project.id === id && (!clientIds.length || clientIds.includes(project.clientId || '')))) })} />
                <MultiSelect label="Project scope" description="Only manually created Iris OS projects are listed." options={filteredProjects} selected={form.projectIds} onChange={(projectIds) => setForm({ ...form, projectIds })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Audience or decision-maker</span>
                  <textarea value={form.targetAudience} onChange={(event) => setForm({ ...form, targetAudience: event.target.value })} maxLength={800} rows={3} placeholder="Who must this strategy influence?" className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none focus:border-zinc-600" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Constraints and guardrails</span>
                  <textarea value={form.constraints} onChange={(event) => setForm({ ...form, constraints: event.target.value })} maxLength={1200} rows={3} placeholder="Budget, capacity, positioning, or risk constraints" className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none focus:border-zinc-600" />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Additional context</span>
                <textarea value={form.additionalNotes} onChange={(event) => setForm({ ...form, additionalNotes: event.target.value })} maxLength={2000} rows={3} placeholder="Prior attempts, non-negotiables, stakeholder concerns, or desired output detail" className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-xs text-white outline-none focus:border-zinc-600" />
              </label>
              <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <BriefcaseBusiness className="h-3.5 w-3.5" /> Integrations, campaign feeds, invoices, and ledger entries are excluded.
                </p>
                <Button type="submit" disabled={generating || !form.goal.trim() || !form.timeline.trim()} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? 'Atlas AI is building…' : 'Generate with Atlas AI'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm text-white"><FileClock className="h-4 w-4 text-zinc-500" /> Strategy creation history</CardTitle>
                <CardDescription className="mt-1">All upsell, marketing, and financial strategies.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[660px] space-y-2 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading history…</div>
            ) : strategies.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-xs text-zinc-600">Your generated strategies will appear here.</div>
            ) : strategies.map((strategy) => (
              <button
                type="button"
                key={strategy.id}
                onClick={() => setSelectedStrategy(strategy)}
                className={cn('w-full rounded-lg border p-3 text-left transition-colors', selectedStrategy?.id === strategy.id ? 'border-zinc-600 bg-zinc-900' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-200">{strategy.title}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{typeLabel(strategy.type)}</p>
                  </div>
                  <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
                </div>
                <p className="mt-2 text-[10px] text-zinc-600">{formatDate(strategy.createdAt)} · {strategy.createdBy.name}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {selectedStrategy && (
        <Card>
          <CardHeader className="border-b border-zinc-800/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">{typeLabel(selectedStrategy.type)} · {selectedStrategy.model}</p>
                <CardTitle className="mt-2 text-lg text-white">{selectedStrategy.title}</CardTitle>
                <CardDescription className="mt-1">{selectedStrategy.timeline} · Created {formatDate(selectedStrategy.createdAt)}</CardDescription>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => download(selectedStrategy)} disabled={downloadingId === selectedStrategy.id}>
                {downloadingId === selectedStrategy.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloadingId === selectedStrategy.id ? 'Preparing PDF…' : 'Download PDF'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-6 md:px-8">
            <div className="mx-auto max-w-4xl">
              <FormattedMarkdown text={strategyBody(selectedStrategy)} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
