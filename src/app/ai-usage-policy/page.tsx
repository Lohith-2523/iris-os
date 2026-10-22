import type { Metadata } from 'next';
import { LegalPolicyPage } from '@/components/legal/legal-policy-page';
import { aiUsagePolicy as policy, LEGAL_UPDATED } from '@/lib/legal/policies';

export const metadata: Metadata = {
  title: policy.title,
  description: policy.description,
  alternates: { canonical: '/ai-usage-policy' },
  openGraph: { url: '/ai-usage-policy', title: `IrisOS ${policy.title}`, description: policy.description },
};

export default function AIUsagePolicyPage() {
  return <LegalPolicyPage
    {...policy}
    badge="IrisOS Legal"
    updated={LEGAL_UPDATED}
  />;
}
