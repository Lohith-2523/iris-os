import { normalizePlan, type PlanId } from './plan-entitlements';

export const GST_RATE = 0.18;
export type PricingRegion = 'INDIA' | 'INTERNATIONAL';

const PLAN_DETAILS: Record<PlanId, {
  name: string;
  description: string;
  features: string[];
  indiaMinor: number;
  internationalMinor: number;
}> = {
  BASIC: {
    name: 'Free',
    description: 'Core agency operations',
    features: ['Up to 5 clients', '2 team members', 'Core finance and delivery'],
    indiaMinor: 0,
    internationalMinor: 0,
  },
  PRO: {
    name: 'Pro',
    description: 'AI-enabled collaboration',
    features: ['Up to 15 clients', 'Unlimited team members', 'Atlas AI and secure messages'],
    indiaMinor: 79_900,
    internationalMinor: 1_599,
  },
  ADVANCED: {
    name: 'Advanced',
    description: 'Complete enterprise workspace',
    features: ['Up to 30 clients', 'Unlimited team members', 'Full Atlas, Strategy and Briefing'],
    indiaMinor: 159_900,
    internationalMinor: 3_199,
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
  const taxAmount = Math.round(baseAmount * GST_RATE);
  return {
    id,
    name: details.name,
    description: details.description,
    features: details.features,
    currency: region === 'INDIA' ? 'INR' as const : 'USD' as const,
    baseAmount,
    taxAmount,
    totalAmount: baseAmount + taxAmount,
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
