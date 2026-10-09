import { normalizePlan, type PlanId } from './plan-entitlements';

export const GST_RATE = 0.18;
export type PricingRegion = 'INDIA' | 'INTERNATIONAL';

export type PlanFeature = {
  label: string;
  value: string;
};

const PLAN_DETAILS: Record<PlanId, {
  name: string;
  description: string;
  features: PlanFeature[];
  indiaMinor: number;
  indiaListMinor: number;
  internationalMinor: number;
  internationalListMinor: number;
}> = {
  BASIC: {
    name: 'Free',
    description: 'Freelancers trying IrisOS',
    features: [
      { label: 'Clients', value: '5' },
      { label: 'Projects', value: '5' },
      { label: 'Active leads', value: '20' },
      { label: 'Team members', value: '0' },
      { label: 'Core team members', value: '—' },
      { label: 'Data Transfer', value: '300 MB' },
      { label: 'Miles AI', value: '✓' },
      { label: 'AI allowance', value: '20k' },
      { label: 'Invoices', value: '3/mo' },
      { label: 'Reports', value: 'Basic' },
      { label: 'Client workspace', value: 'Limited' },
      { label: 'Automations', value: 'Limited' },
      { label: 'Business analytics', value: 'Basic' },
      { label: 'Unlimited onboarding', value: '—' },
      { label: 'Priority support', value: '—' },
    ],
    indiaMinor: 0,
    indiaListMinor: 0,
    internationalMinor: 0,
    internationalListMinor: 0,
  },
  PRO: {
    name: 'Pro',
    description: 'Growing agencies',
    features: [
      { label: 'Clients', value: '25' },
      { label: 'Projects', value: '50' },
      { label: 'Active leads', value: '150' },
      { label: 'Team members', value: '5' },
      { label: 'Core team members', value: '2' },
      { label: 'Data Transfer', value: '5 GB' },
      { label: 'Miles AI', value: '✓✓' },
      { label: 'AI allowance', value: '500k' },
      { label: 'Invoices', value: 'Unlimited' },
      { label: 'Reports', value: 'Advanced' },
      { label: 'Client workspace', value: '✓' },
      { label: 'Automations', value: '✓' },
      { label: 'Business analytics', value: '✓' },
      { label: 'Unlimited onboarding', value: '—' },
      { label: 'Priority support', value: '—' },
    ],
    indiaMinor: 79_900,
    indiaListMinor: 159_900,
    internationalMinor: 1_999,
    internationalListMinor: 3_999,
  },
  ADVANCED: {
    name: 'Advanced',
    description: 'Established agencies',
    features: [
      { label: 'Clients', value: 'Unlimited' },
      { label: 'Projects', value: 'Unlimited' },
      { label: 'Active leads', value: '500' },
      { label: 'Team members', value: '15' },
      { label: 'Core team members', value: '5' },
      { label: 'Data Transfer', value: '25 GB' },
      { label: 'Miles AI', value: '✓✓✓' },
      { label: 'AI allowance', value: '1M' },
      { label: 'Invoices', value: 'Unlimited' },
      { label: 'Reports', value: 'Advanced' },
      { label: 'Client workspace', value: '✓' },
      { label: 'Automations', value: '✓✓' },
      { label: 'Business analytics', value: '✓✓' },
      { label: 'Unlimited onboarding', value: '✓' },
      { label: 'Priority support', value: '✓' },
    ],
    indiaMinor: 159_900,
    indiaListMinor: 319_900,
    internationalMinor: 3_999,
    internationalListMinor: 7_999,
  },
};

export function pricingRegionForCountry(countryCode: string | null | undefined): PricingRegion {
  return countryCode?.trim().toUpperCase() === 'IN' ? 'INDIA' : 'INTERNATIONAL';
}

export function planDisplayName(plan: unknown) {
  return PLAN_DETAILS[normalizePlan(plan)].name;
}

export function planPrice(plan: unknown, region: PricingRegion) {
  const id = normalizePlan(plan);
  const details = PLAN_DETAILS[id];
  const baseAmount = region === 'INDIA' ? details.indiaMinor : details.internationalMinor;
  const listAmount = region === 'INDIA' ? details.indiaListMinor : details.internationalListMinor;
  const taxAmount = Math.round(baseAmount * GST_RATE);
  return {
    id,
    name: details.name,
    description: details.description,
    features: details.features,
    currency: region === 'INDIA' ? 'INR' as const : 'USD' as const,
    listAmount,
    baseAmount,
    taxAmount,
    totalAmount: baseAmount + taxAmount,
  };
}

export function planPriceWithCoupon(plan: unknown, region: PricingRegion, discountPercent: number) {
  const price = planPrice(plan, region);
  const normalizedDiscount = Math.min(100, Math.max(1, Math.round(discountPercent)));
  const baseAmount = Math.round(price.listAmount * (100 - normalizedDiscount) / 100);
  const taxAmount = Math.round(baseAmount * GST_RATE);
  return {
    ...price,
    baseAmount,
    taxAmount,
    totalAmount: baseAmount + taxAmount,
    discountPercent: normalizedDiscount,
    discountAmount: price.listAmount - baseAmount,
  };
}

export function pricingCatalog(region: PricingRegion) {
  return (['BASIC', 'PRO', 'ADVANCED'] as const).map((plan) => planPrice(plan, region));
}

export function formatPlanMoney(amountMinor: number, currency: 'INR' | 'USD') {
  if (amountMinor === 0) return currency === 'INR' ? '₹0' : '$0';
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'INR' && amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}
