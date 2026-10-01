'use client';

import * as React from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isPlanDowngrade, normalizePlan, planIncludes, type PlanId } from '@/lib/plan-entitlements';
import { formatPlanMoney, planDisplayName } from '@/lib/plan-pricing';
import { RazorpayCheckout, type CouponPriceQuote } from './razorpay-checkout';
import { usePlanPricing } from './use-plan-pricing';

export function SubscriptionPlanDialog({ open, currentPlan, feature, requiredPlan, canManage = true, showCouponAdjustedPrice = false, onClose, onPlanChanged }: {
  open: boolean;
  currentPlan: unknown;
  feature: string;
  requiredPlan: PlanId;
  canManage?: boolean;
  showCouponAdjustedPrice?: boolean;
  onClose: () => void;
  onPlanChanged?: (plan: PlanId) => void;
}) {
  const activePlan = normalizePlan(currentPlan);
  const [couponPrices, setCouponPrices] = React.useState<Partial<Record<Exclude<PlanId, 'BASIC'>, CouponPriceQuote>>>({});
  const { region, plans, loading: pricingLoading } = usePlanPricing(open);
  React.useEffect(() => { setCouponPrices({}); }, [open, region]);
  if (!open) return null;

  const finishPlanChange = (plan: PlanId) => {
    window.dispatchEvent(new Event('organization-updated'));
    window.dispatchEvent(new Event('user-updated'));
    onPlanChanged?.(plan);
  };

  const availablePlans = plans.filter((plan) => !isPlanDowngrade(activePlan, plan.id));

  return <div className="fixed inset-0 z-[140] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="relative w-full max-w-5xl rounded-2xl border border-white/15 bg-zinc-950/85 p-6 text-zinc-100 shadow-2xl backdrop-blur-xl sm:p-8">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close subscription plans"><X className="h-4 w-4" /></button>
      <div className="pr-10"><div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" /><span className="font-mono text-xs font-bold uppercase tracking-[0.18em]">IrisOS plans</span></div><h2 id="subscription-dialog-title" className="mt-2 text-2xl font-bold">Choose a plan for {feature}</h2><p className="mt-2 text-sm text-muted-foreground">{pricingLoading ? 'Detecting regional pricing from your public IP country…' : `${region === 'INDIA' ? 'Indian' : 'International'} pricing is selected from your public IP country. Paid prices exclude 18% ${region === 'INDIA' ? 'GST' : 'Tax'}.`}</p></div>
      {!canManage && <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">Only the agency administrator can change the workspace subscription.</div>}
      <div className={`mt-7 grid gap-4 ${availablePlans.length > 2 ? 'lg:grid-cols-3' : availablePlans.length > 1 ? 'lg:grid-cols-2' : ''}`}>{availablePlans.map(plan => {
        const isCurrent = plan.id === activePlan;
        const unlocksFeature = planIncludes(plan.id, requiredPlan);
        const disabled = pricingLoading || !canManage || isCurrent || !unlocksFeature;
        const couponPrice = showCouponAdjustedPrice && plan.id !== 'BASIC' ? couponPrices[plan.id] : null;
        const displayPrice = couponPrice ?? plan;
        const discountPercent = couponPrice?.discountPercent ?? (plan.listAmount > plan.baseAmount ? 50 : null);
        return <section key={plan.id} className={`flex min-h-[350px] flex-col rounded-2xl border p-5 text-zinc-100 backdrop-blur-md ${plan.id === requiredPlan ? 'border-white/30 bg-white/[0.08] shadow-[0_0_28px_rgba(255,255,255,0.08)]' : 'border-white/10 bg-black/30'}`}>
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{plan.name}</h3><p className="mt-1 text-sm text-muted-foreground">{plan.description}</p></div>{isCurrent && <span className="rounded-full border border-border bg-background/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">Current</span>}</div>
          <div className="mt-5" aria-live="polite">{displayPrice.listAmount && displayPrice.listAmount > displayPrice.baseAmount && <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide"><del className="font-mono font-bold tabular-nums text-muted-foreground">{formatPlanMoney(displayPrice.listAmount, displayPrice.currency)}</del>{discountPercent && <strong className="text-foreground">{discountPercent}% off</strong>}</p>}<span className="font-mono text-3xl font-black">{displayPrice.baseAmount === 0 ? 'Free' : formatPlanMoney(displayPrice.baseAmount, displayPrice.currency)}</span>{displayPrice.baseAmount > 0 && <span className="ml-1 text-sm text-muted-foreground">/ month</span>}{displayPrice.baseAmount > 0 && <p className="mt-1 text-xs text-muted-foreground">+ 18% {displayPrice.currency === 'INR' ? 'GST' : 'Tax'}</p>}</div>
          <ul className="mt-6 flex-1 space-y-2 border-t border-white/10 pt-4 text-xs text-foreground">{plan.features.map(feature => <li key={feature.label} className="flex items-start justify-between gap-3"><span className="text-muted-foreground">{feature.label}</span><strong className="shrink-0 text-right font-mono font-medium">{feature.value}</strong></li>)}</ul>
          {plan.id === 'BASIC' ? <Button type="button" variant="outline" disabled className="mt-6 w-full">Current plan</Button>
            : <div className="mt-6"><RazorpayCheckout plan={plan.id} price={plan} disabled={disabled} buttonLabel={isCurrent ? 'Current plan' : !unlocksFeature ? `Requires ${planDisplayName(requiredPlan)}` : `Choose ${plan.name}`} onVerified={finishPlanChange} onPriceChange={showCouponAdjustedPrice ? (quote) => setCouponPrices(current => ({ ...current, [plan.id]: quote ?? undefined })) : undefined} /></div>}
        </section>;
      })}</div>
    </div>
  </div>;
}
