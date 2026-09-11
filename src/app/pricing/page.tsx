import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { IrisPricing } from '@/components/landing/iris-pricing';
import { pricingLocation } from '@/lib/request-country';

export const metadata: Metadata = {
  title: 'Pricing | Iris OS',
  description: 'Compare Iris OS Free, Pro and Advanced workspace plans.',
};

export default async function PricingPage() {
  const location = pricingLocation(await headers());
  return <IrisPricing region={location.region} />;
}
