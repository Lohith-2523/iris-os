import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { IrisPricing } from '@/components/landing/iris-pricing';
import { pricingLocation } from '@/lib/request-country';

export const metadata: Metadata = {
  title: 'Agency Management Software Pricing',
  description: 'Compare IrisOS Free, Pro, and Advanced plans for agency operations, client and project management, reporting, collaboration, and Miles AI.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    url: '/pricing',
    title: 'IrisOS Agency Management Software Pricing',
    description: 'Compare IrisOS plans for freelancers, agencies, consulting firms, and creative teams.',
  },
};

export default async function PricingPage() {
  const location = pricingLocation(await headers());
  return <IrisPricing region={location.region} />;
}
