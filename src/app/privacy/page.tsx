import type { Metadata } from 'next';
import { LegalPolicyPage } from '@/components/legal/legal-policy-page';
import { privacyPolicy as policy, LEGAL_UPDATED } from '@/lib/legal/policies';

export const metadata: Metadata = {
  title: policy.title,
  description: policy.description,
  alternates: { canonical: '/privacy' },
  openGraph: { url: '/privacy', title: `IrisOS ${policy.title}`, description: policy.description },
};

export default function PrivacyPage() {
  return <LegalPolicyPage
    {...policy}
    badge="IrisOS Legal"
    updated={LEGAL_UPDATED}
  />;
}
