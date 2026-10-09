'use client';

import * as React from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IrisPricingTable } from '@/components/landing/iris-pricing-comparison';
import { isPlanDowngrade, normalizePlan, planIncludes, type PlanId } from '@/lib/plan-entitlements';
import { planDisplayName } from '@/lib/plan-pricing';
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

  const displayPlans = plans.map((plan) => {
    const quote = plan.id === 'BASIC' || !showCouponAdjustedPrice ? null : couponPrices[plan.id];
    return quote ? { ...plan, ...quote } : plan;
  });

  return <div className="fixed inset-0 z-[140] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="relative my-6 w-full max-w-[82rem] rounded-2xl border border-white/15 bg-zinc-950/95 p-6 text-zinc-100 shadow-2xl backdrop-blur-xl sm:p-8">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close subscription plans"><X className="h-4 w-4" /></button>
      <div className="pr-10"><div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" /><span className="font-mono text-xs font-bold uppercase tracking-[0.18em]">IrisOS plans</span></div><h2 id="subscription-dialog-title" className="mt-2 text-2xl font-bold">Choose a plan for {feature}</h2><p className="mt-2 text-sm text-muted-foreground">{pricingLoading ? 'Detecting regional pricing from your public IP country…' : `${region === 'INDIA' ? 'Indian' : 'International'} pricing is selected from your public IP country. Paid prices exclude 18% ${region === 'INDIA' ? 'GST' : 'Tax'}.`}</p></div>
      {!canManage && <div className="mt-5 rounded-xl border border-amber-900/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">Only the business administrator can change the workspace subscription.</div>}
      <div className="mt-5">
        <IrisPricingTable
          plans={displayPlans}
          selectedPlanId={activePlan}
          renderPlanAction={(displayPlan) => {
            const plan = plans.find((candidate) => candidate.id === displayPlan.id)!;
            const isCurrent = plan.id === activePlan;
            const unlocksFeature = planIncludes(plan.id, requiredPlan);
            const unavailable = isPlanDowngrade(activePlan, plan.id);
            const disabled = pricingLoading || !canManage || isCurrent || !unlocksFeature || unavailable;
            if (plan.id === 'BASIC') return <Button type="button" variant="outline" disabled className="w-full">{isCurrent ? 'Current plan' : 'Unavailable'}</Button>;
            return <RazorpayCheckout
              plan={plan.id}
              price={plan}
              disabled={disabled}
              buttonLabel={isCurrent ? 'Current plan' : unavailable ? 'Unavailable' : !unlocksFeature ? `Requires ${planDisplayName(requiredPlan)}` : `Choose ${plan.name}`}
              onVerified={finishPlanChange}
              onPriceChange={showCouponAdjustedPrice ? (quote) => setCouponPrices(current => ({ ...current, [plan.id]: quote ?? undefined })) : undefined}
            />;
          }}
        />
      </div>
    </div>
  </div>;
}
