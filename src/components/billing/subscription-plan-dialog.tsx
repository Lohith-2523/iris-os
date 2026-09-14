'use client';

import * as React from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizePlan, planIncludes, type PlanId } from '@/lib/plan-entitlements';
import { formatPlanMoney, planDisplayName } from '@/lib/plan-pricing';
import { formatUserMessage } from '@/lib/utils';
import { RazorpayCheckout } from './razorpay-checkout';
import { usePlanPricing } from './use-plan-pricing';

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
  const { region, plans, loading: pricingLoading } = usePlanPricing(open);
  if (!open) return null;

  const finishPlanChange = (plan: PlanId) => {
    window.dispatchEvent(new Event('organization-updated'));
    window.dispatchEvent(new Event('user-updated'));
    onPlanChanged?.(plan);
  };

  const chooseFree = async () => {
    if (!canManage || activePlan === 'BASIC' || !planIncludes('BASIC', requiredPlan)) return;
    setBusyPlan('BASIC'); setError('');
    try {
      const response = await fetch('/api/organization', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'BASIC' }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to change the plan.');
      finishPlanChange('BASIC');
    } catch (reason) { setError(formatUserMessage(reason instanceof Error ? reason.message : 'Unable to change the plan.')); }
    finally { setBusyPlan(null); }
  };

  return <div className="fixed inset-0 z-[140] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title" onMouseDown={event => { if (event.target === event.currentTarget && !busyPlan) onClose(); }}>
    <div className="relative w-full max-w-5xl rounded-2xl border border-white/15 bg-zinc-950/85 p-6 text-zinc-100 shadow-2xl backdrop-blur-xl sm:p-8">
      <button type="button" onClick={onClose} disabled={Boolean(busyPlan)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50" aria-label="Close subscription plans"><X className="h-4 w-4" /></button>
      <div className="pr-10"><div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" /><span className="font-mono text-xs font-bold uppercase tracking-[0.18em]">Iris OS plans</span></div><h2 id="subscription-dialog-title" className="mt-2 text-2xl font-bold">Choose a plan for {feature}</h2><p className="mt-2 text-sm text-muted-foreground">{pricingLoading ? 'Detecting regional pricing from your public IP country…' : `${region === 'INDIA' ? 'Indian' : 'International'} pricing is selected from your public IP country. Paid prices exclude 18% ${region === 'INDIA' ? 'GST' : 'Tax'}.`}</p></div>
      {error && <div role="alert" className="mt-5 rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</div>}
      {!canManage && <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">Only the agency administrator can change the workspace subscription.</div>}
      <div className="mt-7 grid gap-4 lg:grid-cols-3">{plans.map(plan => {
        const isCurrent = plan.id === activePlan;
        const unlocksFeature = planIncludes(plan.id, requiredPlan);
        const disabled = pricingLoading || !canManage || isCurrent || !unlocksFeature || Boolean(busyPlan);
        return <section key={plan.id} className={`flex min-h-[350px] flex-col rounded-2xl border p-5 text-zinc-100 backdrop-blur-md ${plan.id === requiredPlan ? 'border-white/30 bg-white/[0.08] shadow-[0_0_28px_rgba(255,255,255,0.08)]' : 'border-white/10 bg-black/30'}`}>
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{plan.name}</h3><p className="mt-1 text-sm text-muted-foreground">{plan.description}</p></div>{isCurrent && <span className="rounded-full border border-border bg-background/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">Current</span>}</div>
          <div className="mt-5">{plan.baseAmount > 0 && <p className="mb-1 flex items-center gap-2 text-xs"><del className="text-muted-foreground">{formatPlanMoney(plan.listAmount, plan.currency)}</del><span className="font-bold uppercase tracking-wide text-emerald-400">Early bird · 50% off</span></p>}<span className="font-mono text-3xl font-black">{plan.baseAmount === 0 ? 'Free' : formatPlanMoney(plan.baseAmount, plan.currency)}</span><span className="ml-1 text-sm text-muted-foreground">/ month</span>{plan.baseAmount > 0 && <p className="mt-1 text-xs text-muted-foreground">+ 18% {plan.currency === 'INR' ? 'GST' : 'Tax'} · {formatPlanMoney(plan.totalAmount, plan.currency)} today</p>}</div>
          <ul className="mt-6 flex-1 space-y-3 text-sm text-foreground">{plan.features.map(featureName => <li key={featureName} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{featureName}</li>)}</ul>
          {plan.id === 'BASIC' ? <Button type="button" variant={plan.id === requiredPlan ? 'default' : 'outline'} disabled={disabled} onClick={() => void chooseFree()} className="mt-6 w-full">{busyPlan === 'BASIC' && <Loader2 className="h-4 w-4 animate-spin" />}{isCurrent ? 'Current plan' : !unlocksFeature ? `Requires ${planDisplayName(requiredPlan)}` : 'Choose Free'}</Button>
            : <div className="mt-6"><RazorpayCheckout plan={plan.id} price={plan} disabled={disabled} buttonLabel={isCurrent ? 'Current plan' : !unlocksFeature ? `Requires ${planDisplayName(requiredPlan)}` : `Choose ${plan.name}`} onVerified={finishPlanChange} /></div>}
        </section>;
      })}</div>
    </div>
  </div>;
}
