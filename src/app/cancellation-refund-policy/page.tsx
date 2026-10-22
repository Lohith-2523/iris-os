import type { Metadata } from 'next';
import { LegalPolicyPage } from '@/components/legal/legal-policy-page';
import { cancellationPolicy as policy, LEGAL_UPDATED } from '@/lib/legal/policies';

export const metadata: Metadata = {
  title: policy.title,
  description: policy.description,
  alternates: { canonical: '/cancellation-refund-policy' },
  openGraph: { url: '/cancellation-refund-policy', title: `IrisOS ${policy.title}`, description: policy.description },
};

export default function CancellationRefundPolicyPage() {
  return <LegalPolicyPage
    {...policy}
    badge="IrisOS Legal"
    updated={LEGAL_UPDATED}
  />;
}
