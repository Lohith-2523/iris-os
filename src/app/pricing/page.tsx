import type { Metadata } from 'next';
import { IrisPricing } from '@/components/landing/iris-pricing';

export const metadata: Metadata = {
  title: 'Pricing | Iris OS',
  description: 'Compare Iris OS Basic, Pro and Advanced workspace plans.',
};

export default function PricingPage() {
  return <IrisPricing />;
}
