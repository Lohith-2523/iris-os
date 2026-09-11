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
      <p><span className="font-mono text-3xl font-black">{formatPlanMoney(plan.baseAmount, plan.currency)}</span><span className="text-sm text-muted-foreground"> / month + 18% GST</span></p>
      <p className="text-xs text-muted-foreground">Charged today: {formatPlanMoney(plan.totalAmount, plan.currency)}</p>
      <RazorpayCheckout plan={plan.id as 'PRO' | 'ADVANCED'} price={plan} buttonLabel={`Pay for ${plan.name}`} />
    </section>)}
  </main>;
}
