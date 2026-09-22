import { redirect } from 'next/navigation';
import { getRequestUser } from '@/lib/org';
import { RazorpayCheckout } from '@/components/billing/razorpay-checkout';
import { headers } from 'next/headers';
import { formatPlanMoney, pricingCatalog } from '@/lib/plan-pricing';
import { pricingLocation } from '@/lib/request-country';

export default async function CheckoutPage() {
  if (!await getRequestUser()) redirect('/login');
  const location = pricingLocation(await headers());
  const plans = pricingCatalog(location.region).filter((plan) => plan.id !== 'BASIC');
  return <main className="mx-auto w-full max-w-xl space-y-6 p-6">
    <div><h1 className="text-2xl font-bold">Choose your plan</h1><p className="mt-2 text-sm text-muted-foreground">{location.region === 'INDIA' ? 'Indian' : 'International'} pricing was selected from your public IP country.</p></div>
    {plans.map((plan) => <section key={plan.id} className="space-y-4 rounded-xl border border-border bg-card p-6">
      <div><h2 className="text-lg font-bold">{plan.name}</h2><p className="text-sm text-muted-foreground">{plan.description}</p></div>
      <div>{plan.listAmount > plan.baseAmount && <p className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide"><del className="font-mono font-bold tabular-nums text-muted-foreground">{formatPlanMoney(plan.listAmount, plan.currency)}</del><strong>50% off</strong></p>}<p><span className="font-mono text-3xl font-black">{formatPlanMoney(plan.baseAmount, plan.currency)}</span><span className="text-sm text-muted-foreground"> / month + 18% {plan.currency === 'INR' ? 'GST' : 'Tax'}</span></p></div>
      <ul className="space-y-2 border-t border-border pt-4 text-sm">{plan.features.map((feature) => <li key={feature.label} className="flex items-start justify-between gap-4"><span className="text-muted-foreground">{feature.label}</span><strong className="shrink-0 text-right font-mono text-xs">{feature.value}</strong></li>)}</ul>
      <p className="text-xs text-muted-foreground">Charged today: {formatPlanMoney(plan.totalAmount, plan.currency)}</p>
      <RazorpayCheckout plan={plan.id as 'PRO' | 'ADVANCED'} price={plan} buttonLabel={`Pay for ${plan.name}`} />
    </section>)}
  </main>;
}
