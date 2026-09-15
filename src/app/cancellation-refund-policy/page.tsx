import { LegalPolicyPage, type LegalSection } from '@/components/legal/legal-policy-page';

const sections: LegalSection[] = [
  {
    id: 'subscription-billing', title: 'Subscription and Billing',
    paragraphs: [
      'Iris OS provides certain services through paid subscription plans. The applicable subscription fees, billing cycle, features, and other commercial terms are those displayed at the time of purchase or otherwise agreed between you and Iris OS.',
      'By purchasing a recurring subscription, you authorize Iris OS and/or its authorized payment service providers to charge the applicable subscription fee using your selected payment method for each billing cycle until the subscription is cancelled in accordance with this Policy.',
      'You are responsible for maintaining a valid payment method and ensuring that all subscription fees and other applicable charges are paid when due.',
    ],
  },
  {
    id: 'failed-payments', title: 'Failed or Missed Payments',
    paragraphs: [
      'Subscription fees must be paid when due to maintain uninterrupted access to Iris OS.',
      'If payment for any billing period, including a single monthly billing period, is declined, reversed, unsuccessful, overdue, or otherwise not received by Iris OS, we reserve the right to suspend access to the applicable Iris OS account, workspace, subscription, features, and services.',
      'Suspension may occur following an unsuccessful payment and may continue until the outstanding amount has been successfully paid or the subscription has otherwise been terminated.',
      'Where reasonably practicable, Iris OS may provide notice of a failed payment or suspension. Failure to receive such notice does not relieve you of your responsibility to make payments when due.',
      'Suspension for non-payment does not waive or extinguish any outstanding payment obligation owed to Iris OS.',
    ],
  },
  {
    id: 'cancellation', title: 'Cancellation of Subscription',
    paragraphs: [
      'You may cancel your Iris OS subscription at any time using the cancellation functionality made available through the Iris OS platform or through another cancellation method expressly provided by Iris OS.',
      'Unless otherwise stated at the time of cancellation, cancellation will take effect at the end of the billing period for which payment has already been successfully made.',
    ],
    bullets: [
      'The subscription will not renew for the next billing period;',
      'No subscription fee will be charged for subsequent billing periods unless the subscription is reactivated or another subscription is purchased;',
      'Access to the features included in the existing paid subscription may continue until the end of the current paid billing period, subject to this Policy and the applicable Terms of Service; and',
      'Amounts already paid for the current billing period will not be refunded or prorated.',
    ],
    note: 'Cancellation does not retroactively cancel, reverse, or refund a payment that has already been successfully processed.',
  },
  {
    id: 'no-refund', title: 'No-Refund Policy',
    paragraphs: [
      'All fees and payments made to Iris OS are final and non-refundable, except where a refund or other remedy is mandatorily required under applicable law.',
      'Once a subscription payment has been successfully processed, Iris OS will not ordinarily provide a full, partial, or prorated refund for that billing period.',
      'This includes, without limitation, requests arising from:',
    ],
    bullets: [
      'Cancellation during an active billing period;',
      'Partial use or non-use of Iris OS;',
      'Failure to use available subscription features;',
      'A change of mind after purchasing or renewing a subscription;',
      'Voluntary discontinuation of the service;',
      'Downgrading or changing a subscription;',
      'Failure to cancel a subscription before its renewal date;',
      'Account or service suspension resulting from an unsuccessful or outstanding payment; or',
      'Remaining unused time within a paid subscription period.',
    ],
    note: 'Iris OS does not provide cash refunds, prorated reimbursements, account credits, service credits, or other forms of compensation for unused subscription time unless Iris OS expressly agrees otherwise or such remedy is required under applicable law.',
  },
  {
    id: 'paid-period-cancellation', title: 'Cancellation During a Paid Billing Period',
    paragraphs: [
      'If you cancel your subscription after payment for a billing period has already been successfully processed, the payment for that billing period will not be refunded.',
      'For example, where a monthly subscription has been purchased or renewed and subsequently cancelled during the same billing month, the subscription fee already paid for that billing period remains non-refundable.',
      'Cancellation will instead prevent the subscription from automatically renewing for the following billing period.',
    ],
  },
  {
    id: 'non-payment-suspension', title: 'Suspension for Non-Payment',
    paragraphs: [
      'Failure to successfully complete payment for any single billing period, including one month of a monthly subscription, may result in suspension of Iris OS services associated with the affected account or subscription.',
      'During suspension, you may lose access to some or all paid functionality, workspaces, services, integrations, data-access functionality, or other subscription-dependent features.',
      'Where technically and commercially practicable, access may be restored after successful settlement of outstanding amounts.',
      'Iris OS shall not be liable for losses arising solely from a suspension properly implemented due to non-payment in accordance with this Policy, except to the extent that such liability cannot lawfully be excluded or limited under applicable law.',
    ],
  },
  {
    id: 'chargebacks', title: 'Chargebacks and Payment Disputes',
    paragraphs: [
      'If you believe that a payment has been charged incorrectly or without proper authorization, you should contact Iris OS through its designated billing or support channel so that the matter can be investigated.',
      'Initiating a chargeback or other payment dispute does not automatically entitle you to a refund and does not, by itself, override this Policy.',
      'Iris OS reserves the right to suspend or restrict an account associated with a disputed, reversed, or charged-back payment while the matter is being investigated, subject to applicable law.',
      'Nothing in this section limits any rights or remedies available to you under applicable Indian banking, payment-services, or consumer-protection laws.',
    ],
  },
  {
    id: 'taxes-fees', title: 'Taxes, Fees and Third-Party Charges',
    paragraphs: [
      'Subscription prices may be subject to applicable taxes, including Goods and Services Tax (GST), duties, levies, payment-processing charges, or other amounts as required under applicable law.',
      'Unless otherwise required by law, taxes, processing fees, currency-conversion charges, bank charges, or other third-party charges associated with a transaction are not refundable by Iris OS.',
    ],
  },
  {
    id: 'statutory-rights', title: 'Consumer and Statutory Rights',
    paragraphs: [
      'Nothing contained in this Policy is intended to exclude, restrict, waive, or modify any right or remedy that cannot lawfully be excluded, restricted, waived, or modified under the laws applicable in India, including applicable consumer-protection legislation.',
      'Where applicable law requires Iris OS to provide a refund, replacement, credit, cancellation right, compensation, or other remedy notwithstanding any provision of this Policy, the applicable statutory requirement shall prevail to the extent of the inconsistency.',
      'The no-refund provisions contained in this Policy therefore apply to the maximum extent permitted by applicable law.',
    ],
  },
  {
    id: 'governing-law', title: 'Governing Law and Jurisdiction',
    paragraphs: [
      'This Policy, and any dispute, claim, controversy, or proceeding arising out of or relating to this Policy, an Iris OS subscription, cancellation, payment, refund, or suspension of services, shall be governed by and construed in accordance with the laws of India.',
      'Subject to any mandatory jurisdiction or forum rights provided under applicable law, including applicable consumer-protection laws, the courts and competent judicial authorities situated in Bengaluru, Karnataka, India shall have jurisdiction over disputes arising out of or relating to this Policy.',
      'The parties agree to submit to the jurisdiction of such courts, subject always to any statutory rights or remedies that cannot lawfully be restricted by agreement.',
    ],
  },
  {
    id: 'changes', title: 'Changes to this Policy',
    paragraphs: [
      'Iris OS may amend this Policy from time to time to reflect changes to its services, billing practices, business operations, legal obligations, or regulatory requirements.',
      'Any revised Policy will be published through the Iris OS website or platform and will identify its effective or last-updated date.',
      'Where required by applicable law, appropriate notice will be provided before material changes become effective.',
    ],
  },
  {
    id: 'contact-grievances', title: 'Contact and Grievances',
    paragraphs: [
      'Questions, billing concerns, cancellation requests, payment disputes, or grievances relating to this Policy may be submitted through the official support or contact channels provided by Iris OS.',
      'Customers are encouraged to contact Iris OS promptly if they believe a payment has been processed incorrectly.',
      "Any statutory grievance-redressal information required under applicable Indian law shall be made available through Iris OS's official website or Terms of Service, as applicable.",
    ],
  },
  {
    id: 'acceptance', title: 'Acceptance',
    paragraphs: ['By purchasing, renewing, or maintaining a paid Iris OS subscription, you acknowledge that you have had an opportunity to review this Policy and agree to the cancellation, billing, suspension, and refund conditions described herein.'],
    note: 'Subscriptions may be cancelled at any time, but payments already processed for the current billing period are non-refundable. Failure to successfully make payment for a single billing period may result in suspension of Iris OS services. No full, partial, or prorated refunds will be provided except where mandatorily required by applicable law.',
  },
];

export default function CancellationRefundPolicyPage() {
  return <LegalPolicyPage
    title="Cancellation, Suspension and Refund Policy"
    badge="Subscriptions, cancellations and refunds"
    effectiveDate="September 14, 2026"
    updated="September 14, 2026"
    jurisdiction="Bengaluru, Karnataka, India"
    introduction={[
      'This Cancellation, Suspension and Refund Policy (“Policy”) governs the cancellation of subscriptions, failed or missed payments, suspension of services, and refunds relating to subscriptions and services provided by Iris OS (“Iris OS”, “we”, “us”, or “our”).',
      'This Policy forms part of the terms governing your use of Iris OS. By purchasing, subscribing to, renewing, or continuing to use a paid Iris OS plan, you (“Customer”, “you”, or “your”) acknowledge that you have read, understood, and agreed to this Policy.',
    ]}
    sections={sections}
  />;
}
