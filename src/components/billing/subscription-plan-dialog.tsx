'use client';

import * as React from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizePlan, planIncludes, type PlanId } from '@/lib/plan-entitlements';
import { formatUserMessage } from '@/lib/utils';

const plans: Array<{ id: PlanId; name: string; price: string; description: string; features: string[] }> = [
  { id: 'BASIC', name: 'Basic', price: '$99', description: 'Core agency operations', features: ['Up to 5 clients', '2 team members', 'Core finance and delivery'] },
  { id: 'PRO', name: 'Pro', price: '$299', description: 'AI-enabled collaboration', features: ['Up to 15 clients', '4 team members', 'Atlas AI and Messages'] },
  { id: 'ADVANCED', name: 'Advanced', price: '$599', description: 'Complete enterprise workspace', features: ['Up to 30 clients', '15 team members', 'Strategy and Daily Briefing'] },
];

export function SubscriptionPlanDialog({ open, currentPlan, feature, requiredPlan, canManage = true, onClose, onPlanChanged }: {
  open: boolean;
  currentPlan: unknown;
  feature: string;
  requiredPlan: PlanId;
  canManage?: boolean;
  onClose: () => void;
  onPlanChanged?: (plan: PlanId) => void;
}) {
  const activePlan = normalizePlan(currentPlan);
  const [busyPlan, setBusyPlan] = React.useState<PlanId | null>(null);
  const [error, setError] = React.useState('');
  if (!open) return null;

  const changePlan = async (plan: PlanId) => {
    if (!canManage || plan === activePlan || !planIncludes(plan, requiredPlan)) return;
    setBusyPlan(plan); setError('');
    try {
      const response = await fetch('/api/organization', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to update the subscription plan.');
      window.dispatchEvent(new Event('organization-updated'));
      window.dispatchEvent(new Event('user-updated'));
      onPlanChanged?.(plan);
    } catch (reason) { setError(formatUserMessage(reason instanceof Error ? reason.message : 'Unable to update the subscription plan.')); }
    finally { setBusyPlan(null); }
  };

  return <div className="fixed inset-0 z-[140] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title" onMouseDown={event => { if (event.target === event.currentTarget && !busyPlan) onClose(); }}>
    <div className="relative w-full max-w-5xl rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl sm:p-8">
      <button type="button" onClick={onClose} disabled={Boolean(busyPlan)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" aria-label="Close subscription plans"><X className="h-4 w-4" /></button>
      <div className="pr-10"><div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" /><span className="font-mono text-xs font-bold uppercase tracking-[0.18em]">Iris OS plans</span></div><h2 id="subscription-dialog-title" className="mt-2 text-2xl font-bold">Choose a plan for {feature}</h2><p className="mt-2 text-sm text-muted-foreground">Compare every workspace tier and switch without leaving this page.</p></div>
      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</div>}
      {!canManage && <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">Only the agency administrator can change the workspace subscription.</div>}
      <div className="mt-7 grid gap-4 lg:grid-cols-3">{plans.map(plan => {
        const isCurrent = plan.id === activePlan;
        const unlocksFeature = planIncludes(plan.id, requiredPlan);
        return <section key={plan.id} className={`flex min-h-[350px] flex-col rounded-2xl border p-5 text-card-foreground ${plan.id === requiredPlan ? 'border-foreground/35 bg-muted shadow-[0_0_28px_hsl(var(--foreground)/.08)]' : 'border-border bg-card'}`}>
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{plan.name}</h3><p className="mt-1 text-sm text-muted-foreground">{plan.description}</p></div>{isCurrent && <span className="rounded-full border border-border bg-background/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">Current</span>}</div>
          <div className="mt-5"><span className="font-mono text-3xl font-black">{plan.price}</span><span className="ml-1 text-sm text-muted-foreground">/ month</span></div>
          <ul className="mt-6 flex-1 space-y-3 text-sm text-foreground">{plan.features.map(featureName => <li key={featureName} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{featureName}</li>)}</ul>
          <Button type="button" variant={plan.id === requiredPlan ? 'default' : 'outline'} disabled={!canManage || isCurrent || !unlocksFeature || Boolean(busyPlan)} onClick={() => void changePlan(plan.id)} className="mt-6 w-full">
            {busyPlan === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCurrent ? 'Current plan' : !unlocksFeature ? `Requires ${requiredPlan}` : busyPlan === plan.id ? 'Changing plan...' : `Choose ${plan.name}`}
          </Button>
        </section>;
      })}</div>
    </div>
  </div>;
}
