import { LegalPolicyPage, type LegalSection } from '@/components/legal/legal-policy-page';

const sections: LegalSection[] = [
  {
    id: 'acceptance', title: 'Agreement and eligibility',
    paragraphs: [
      'These Terms of Service (“Terms”) form a binding agreement between Shards Media, operating Iris OS (“Iris OS”, “we”, “us”, or “our”), and the person or organization accessing Iris OS (“Customer”, “you”, or “your”). By creating an account, accepting an invitation, purchasing a subscription, signing a document through Iris OS, or using the services, you accept these Terms and the Privacy Policy.',
      'You represent that you are legally capable of entering this agreement and, when acting for an organization, have authority to bind it. If you do not agree, do not use Iris OS. Additional order forms, data-processing terms, or enterprise terms control to the extent they expressly conflict with these Terms.',
    ],
  },
  {
    id: 'service', title: 'Iris OS services',
    paragraphs: ['Iris OS provides agency operations, lead and client management, projects, tasks, financial records, reporting, messaging, document generation and electronic signatures, integrations, and Atlas AI features. Features, limits, and availability vary by plan, configuration, geography, and third-party service availability. We may improve or replace functionality while preserving the material value of a paid service. Preview, beta, or experimental features may change or be withdrawn.'],
  },
  {
    id: 'accounts', title: 'Accounts, roles, and customer administration',
    bullets: [
      'You must provide accurate account information, protect credentials, use multi-factor authentication when available, and promptly report suspected compromise.',
      'The agency administrator controls workspace membership, roles, sub-admin permissions, client access, integrations, AI settings, and customer data. Actions by authorized users are treated as Customer actions.',
      'You are responsible for obtaining appropriate authority, notices, consent, and lawful bases before entering, importing, connecting, or instructing Iris OS to process information about leads, clients, personnel, document recipients, or other individuals.',
      'You must promptly revoke access for people who no longer require it and are responsible for reviewing access logs, permissions, generated documents, and automation settings.',
    ],
  },
  {
    id: 'plans', title: 'Subscriptions, billing, and plan changes',
    paragraphs: ['Paid subscriptions renew at the frequency shown at purchase until cancelled. Fees, taxes, plan limits, and payment timing are displayed in the applicable checkout or order. Upgrades may take effect immediately with applicable prorating; downgrades and cancellations normally take effect at the end of the current paid period. Except where law or an order form requires otherwise, fees are non-refundable and unused time is not credited. We may suspend paid functionality after notice when payment is overdue.'],
  },
  {
    id: 'customer-data', title: 'Customer data and processing instructions',
    paragraphs: [
      'Customer retains its rights in data, files, prompts, documents, brand assets, and other content submitted to Iris OS (“Customer Data”). Customer grants Iris OS and its contracted providers a limited right to host, copy, transmit, transform, display, and otherwise process Customer Data only to provide, secure, support, and improve the services as described in these Terms, the Privacy Policy, the Customer’s configuration, and lawful instructions.',
      'Customer is responsible for Customer Data legality, accuracy, quality, notices, retention instructions, and rights of third parties. Customer must not upload data it is prohibited from disclosing or direct Iris OS to process data unlawfully. Iris OS may remove or restrict content where reasonably necessary to address illegality, security risk, infringement, or a violation of these Terms.',
    ],
  },
  {
    id: 'atlas-ai', title: 'Atlas AI access, outputs, and customer control',
    paragraphs: [
      'Atlas AI can generate drafts, reports, strategies, proposals, contracts, statements of work, summaries, classifications, forecasts, recommendations, and customer-authorized workflow actions. Atlas may access a prompt and the workspace context selected by the user or permitted by organization settings. Optional access to live financial, lead, campaign, client, project, or other workspace data requires the applicable organization authorization or consent and can be disabled in settings.',
      'When AI workspace access is disabled, Atlas must not retrieve the disabled live datasets for new requests. Customer understands that a direct prompt, file upload, or explicit document-generation instruction may itself contain Customer Data and constitutes an instruction to process that submitted content for the requested output.',
    ],
    bullets: [
      'Outputs are probabilistic and may be inaccurate, incomplete, outdated, non-unique, or unsuitable. Customer must independently review outputs before relying on them, publishing them, sending them, signing them, or using them for financial, legal, employment, eligibility, safety, or other consequential purposes.',
      'Atlas provides operational assistance and does not replace qualified legal, tax, accounting, financial, medical, employment, or other professional advice.',
      'Customer must maintain meaningful human oversight. Customer may not configure Atlas to make a solely automated decision with legal or similarly significant effects unless the processing is lawful and all required notices, safeguards, explanations, intervention, objection, and review rights are implemented.',
      'Customer may not use Atlas to unlawfully discriminate, infer highly sensitive characteristics, manipulate vulnerable people, create deceptive impersonations, violate privacy or intellectual-property rights, or generate unlawful content.',
      'Iris OS does not use Customer workspace content to train a generalized Iris OS model without separate, specific permission. Contracted AI providers may process inputs and outputs under their applicable enterprise or API terms and Iris OS data-protection requirements.',
    ],
  },
  {
    id: 'automations', title: 'Automations and generated actions',
    paragraphs: ['An automation may create or update records, draft or send communications, generate documents, schedule events, convert a signed lead into a client, or create projects and tasks. Customer authorizes actions it explicitly initiates or enables. Customer must review automation configuration and resulting records. Iris OS may pause an automation that is ambiguous, unsafe, unauthorized, technically invalid, or likely to cause material harm. Automated onboarding depends on sufficient, accurate signed-document details; incomplete records may be flagged for human review.'],
  },
  {
    id: 'esign', title: 'Documents and electronic signatures',
    paragraphs: [
      'Iris OS may provide native or third-party document delivery and electronic-signature workflows. A signer who types a legal name, confirms consent, and submits a signature intends that act to constitute an electronic signature to the extent permitted by applicable law. Iris OS may record signer name, timestamp, document hash, authentication or link context, and privacy-preserving technical audit data.',
      'Customer is responsible for determining whether electronic signatures are appropriate for a document, identifying signers, obtaining authority and consent, satisfying disclosure and record-retention duties, and providing any legally required alternative. Iris OS does not verify capacity, authority, identity beyond the implemented workflow, or enforceability in every jurisdiction. Once a signature is recorded, Iris OS may make the document non-editable and preserve the executed copy and audit trail.',
    ],
  },
  {
    id: 'integrations', title: 'Third-party services and integrations',
    paragraphs: ['Customer may connect services such as advertising platforms, calendars, design tools, email, payment services, AI infrastructure, or electronic-signature providers. Enabling an integration authorizes Iris OS to exchange the data and permissions needed for the selected function. Third-party services are governed by their own terms and privacy practices. Customer is responsible for its accounts, licenses, permissions, and lawful use. Iris OS is not responsible for third-party outages, policy changes, data supplied by those services, or actions taken outside Iris OS. Disconnecting an integration stops new access but may not delete data already imported or records retained under law or Customer instructions.'],
  },
  {
    id: 'privacy-security', title: 'Privacy, confidentiality, and security',
    paragraphs: ['Our processing of personal data is described in the Privacy Policy and any applicable data-processing agreement. Each party will protect the other party’s confidential information using reasonable care and use it only for the agreement, except for information lawfully public, independently developed, rightfully received without restriction, or required to be disclosed by law. We maintain safeguards designed for the service, but no internet service is completely secure. Customer is responsible for endpoint security, access management, lawful exports, and backups it requires outside Iris OS.'],
  },
  {
    id: 'acceptable-use', title: 'Acceptable use',
    bullets: [
      'Do not access Iris OS unlawfully, probe or bypass security, interfere with availability, introduce malware, scrape beyond documented interfaces, or attempt unauthorized tenant or account access.',
      'Do not upload unlawful, infringing, defamatory, fraudulent, abusive, exploitative, or malicious content, or use Iris OS to spam, deceive, stalk, discriminate, or violate another person’s rights.',
      'Do not reverse engineer or copy protected service components except to the limited extent a restriction is prohibited by law.',
      'Do not resell, sublicense, benchmark publicly, or use Iris OS to build a competing service without written permission.',
      'Do not submit regulated secrets, payment-card data, health data, biometric identifiers, children’s data, or other highly sensitive information unless the relevant Iris OS feature expressly supports it and Customer has implemented all legal and contractual safeguards.',
    ],
  },
  {
    id: 'ownership', title: 'Intellectual property and feedback',
    paragraphs: ['Iris OS and its software, interfaces, designs, documentation, trademarks, models, workflows, and underlying technology are owned by Shards Media or its licensors. Subject to payment and compliance, Customer receives a limited, non-exclusive, non-transferable right to use the service during the subscription. Customer owns Customer Data and, as between the parties and to the extent permitted by law, its generated outputs, excluding Iris OS technology, third-party material, and pre-existing content. Feedback may be used without restriction or identification, but does not authorize use of Customer Data for generalized model training.'],
  },
  {
    id: 'suspension-termination', title: 'Suspension, termination, and data export',
    paragraphs: ['Either party may terminate as allowed by the applicable plan or order. We may suspend access where reasonably necessary for security, non-payment, legal compliance, material breach, or risk to the service or others, and will provide notice when practicable. Upon termination, Customer’s access ends and Customer should export required data before the effective date. We will delete or return Customer Data according to the Privacy Policy, applicable agreement, backup lifecycle, and legal retention duties. Provisions concerning payment, ownership, confidentiality, disclaimers, liability, disputes, and lawful retention survive.'],
  },
  {
    id: 'warranties', title: 'Disclaimers',
    paragraphs: ['TO THE MAXIMUM EXTENT PERMITTED BY LAW, IRIS OS, ATLAS AI, OUTPUTS, INTEGRATIONS, AND BETA FEATURES ARE PROVIDED “AS IS” AND “AS AVAILABLE”. WE DISCLAIM IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, AND UNINTERRUPTED OPERATION. WE DO NOT GUARANTEE BUSINESS RESULTS, LEAD CONVERSION, CAMPAIGN PERFORMANCE, REVENUE, LEGAL ENFORCEABILITY, MODEL ACCURACY, OR THIRD-PARTY AVAILABILITY. NOTHING IN THESE TERMS EXCLUDES A WARRANTY OR CONSUMER RIGHT THAT CANNOT LAWFULLY BE EXCLUDED.'],
  },
  {
    id: 'liability', title: 'Limitation of liability',
    paragraphs: ['TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL LOSS, OR LOSS OF PROFITS, REVENUE, GOODWILL, BUSINESS, OR DATA, ARISING FROM THESE TERMS. EXCEPT FOR PAYMENT OBLIGATIONS, FRAUD, WILLFUL MISCONDUCT, INFRINGEMENT, BREACH OF CONFIDENTIALITY, OR LIABILITY THAT CANNOT BE LIMITED, EACH PARTY’S AGGREGATE LIABILITY WILL NOT EXCEED THE FEES PAID OR PAYABLE FOR THE SERVICE GIVING RISE TO THE CLAIM DURING THE TWELVE MONTHS BEFORE THE EVENT. Local law may require different limitations, which will apply to that extent.'],
  },
  {
    id: 'indemnity', title: 'Indemnity',
    paragraphs: ['Customer will defend and indemnify Shards Media and its affiliates against third-party claims arising from Customer Data, unlawful Customer instructions, Customer’s breach of these Terms, or Customer’s use of outputs, integrations, automations, or documents in violation of law or third-party rights. We will provide reasonable notice and cooperation and permit Customer to control the defense, provided no settlement admits fault or imposes obligations on us without consent. This obligation does not apply to the extent a claim was caused by our breach or willful misconduct.'],
  },
  {
    id: 'law-disputes', title: 'Governing law and disputes',
    paragraphs: ['Unless an order form states otherwise, these Terms are governed by the laws applicable to Shards Media’s principal place of business, without regard to conflict-of-law rules. The parties will first attempt good-faith informal resolution. Any mandatory consumer forum, privacy complaint right, small-claims right, or statutory jurisdiction remains available where it cannot lawfully be waived. Any arbitration or exclusive forum provision applies only to the extent enforceable and after any legally required notice or opt-out opportunity.'],
  },
  {
    id: 'changes-contact', title: 'Changes and contact',
    paragraphs: ['We may update these Terms for legal, security, provider, or product changes. Material changes will receive notice appropriate to the change and applicable law. Continued use after the effective date constitutes acceptance where permitted; if consent is legally required, we will request it. For legal questions, email studio@shardsmedia.com with the subject “LEGAL: IRIS OS TERMS”. Privacy requests should be sent to cto.admin@irisos.app.'],
  },
];

export default function TermsPage() {
  return <LegalPolicyPage title="Terms of Service" badge="Iris OS service agreement" updated="August 6, 2026" introduction="These terms govern use of Iris OS, Atlas AI, document and e-signature workflows, integrations, automations, and agency workspaces." sections={sections} />;
}
