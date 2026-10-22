import type { Metadata } from 'next';
import { LegalPolicyPage } from '@/components/legal/legal-policy-page';
import { dpaPolicy as policy, LEGAL_UPDATED } from '@/lib/legal/policies';

export const metadata: Metadata = {
  title: policy.title,
  description: policy.description,
  alternates: { canonical: '/data-processing-agreement' },
  openGraph: { url: '/data-processing-agreement', title: `IrisOS ${policy.title}`, description: policy.description },
};

export default function DataProcessingAgreementPage() {
  return <LegalPolicyPage
    {...policy}
    badge="IrisOS Legal"
    updated={LEGAL_UPDATED}
  />;
}
