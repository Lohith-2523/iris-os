import { LegalPolicyPage, type LegalSection } from '@/components/legal/legal-policy-page';

const sections: LegalSection[] = [
  {
    id: 'scope-roles', title: 'Scope, entity, and privacy roles',
    paragraphs: [
      'This Privacy Policy explains how IrisOS (“IrisOS”, “we”, “us”, or “our”) collects, uses, discloses, stores, and protects personal data when people visit our websites, create or use an IrisOS account, receive documents or communications through IrisOS, or interact with Miles AI.',
      'For account, billing, product-usage, security, and direct marketing data, IrisOS generally acts as controller, business, responsible party, organization, or data fiduciary under applicable law. For leads, clients, team members, project records, documents, messages, and other content an agency customer submits or connects, the agency customer generally determines the purposes and means of processing and IrisOS acts as its processor, service provider, operator, data intermediary, or equivalent. Individuals should direct requests concerning customer-controlled workspace data to the relevant agency; we will assist that agency as required.',
    ],
  },
  {
    id: 'data-collected', title: 'Personal data we collect',
    bullets: [
      'Account and identity data: name, username, business email, phone number with country calling code, role, profile image, authentication identifiers, organization, and permissions.',
      'Agency, lead, and client data: business and contact details, addresses, lead source and stage, follow-up activity, project information, tasks, deliverables, approvals, messages, and meeting details.',
      'Commercial and document data: proposals, contracts, statements of work, invoices, payment terms, transaction and ledger entries, subscription information, document delivery status, electronic-signature names, timestamps, content hashes, and privacy-preserving request audit data.',
      'Integration data: authorization grants, account identifiers, configuration, sync status, advertising campaign and lead-form data, calendar data, and other information selected by the customer from connected services. Authentication secrets and tokens are handled as credentials and are not displayed publicly.',
      'Miles AI data: prompts, instructions, selected workspace records, retrieved context, uploaded or generated documents, model inputs and outputs, summaries, recommendations, classifications, risk indicators, and feedback about responses.',
      'Voice data: microphone audio transmitted when a user starts Miles voice or transcription, English transcripts accepted as user input, spoken Miles responses, and voice-session diagnostics. IrisOS does not retain realtime microphone audio as a recording; accepted transcripts and responses may be retained in workspace chat history.',
      'Creative and customization data: Canva project and design references, campaign assets, brand kits, approval records, publishing schedules, profile pictures, invoice logos, and workspace background images and positioning.',
      'Operational intelligence data: daily briefing inputs and outputs, notifications, forecasts, strategies, capacity indicators, profitability and health scores, churn and risk indicators, and automation history.',
      'Technical and usage data: IP address, device and browser information, timestamps, routes used, diagnostics, security events, cookies or similar identifiers, and product interaction data.',
      'Support and communications data: requests, correspondence, attachments, survey responses, and records needed to resolve an issue or enforce our terms.',
    ],
  },
  {
    id: 'sources', title: 'Sources of personal data',
    bullets: [
      'Directly from account holders, document recipients, website visitors, and people who communicate with us.',
      'From an agency customer that enters or imports information about its leads, clients, personnel, vendors, or other contacts.',
      'From connected services only after an authorized user enables the integration and grants the relevant permissions.',
      'From service providers supporting authentication, hosting, security, communications, analytics, document generation, and AI processing.',
      'From public or business sources where collection and use are permitted by applicable law.',
    ],
  },
  {
    id: 'purposes-bases', title: 'Purposes and legal bases',
    paragraphs: ['We process personal data only for stated, specific purposes and rely on the legal basis required in the applicable jurisdiction. Depending on context, this may be performance of a contract, steps requested before entering a contract, consent, legitimate interests that are not overridden by individual rights, compliance with law, protection of vital interests, or another permitted basis.'],
    bullets: [
      'Provide, authenticate, personalize, maintain, and support the IrisOS workspace and customer-requested workflows.',
      'Manage leads, clients, projects, tasks, communications, approvals, documents, e-signatures, billing, reporting, and integrations.',
      'Provide client and team onboarding, stage-based project planning, encrypted file attachments, Design Hub workflows, content publishing, daily briefings, notifications, workspace personalization, and account-deletion workflows.',
      'Operate Miles AI when enabled, retrieve selected workspace context, generate requested outputs, and automate actions expressly initiated or configured by an authorized user.',
      'Secure the service, detect fraud and abuse, investigate incidents, preserve audit trails, debug failures, and enforce agreements.',
      'Process subscriptions, send transactional communications, respond to requests, and satisfy accounting, tax, regulatory, and legal obligations.',
      'Improve reliability and usability using aggregated, de-identified, or appropriately protected data and product feedback.',
    ],
  },
  {
    id: 'atlas-ai', title: 'Miles AI data access and safeguards',
    paragraphs: [
      'Miles AI is an assisted intelligence layer that can draft documents, summarize workspace information, identify risks, recommend actions, and perform customer-authorized automations. Miles may process personal data contained in a prompt, uploaded file, selected lead or client, connected dataset, or other workspace context necessary to answer the request.',
      'Access to live financial, lead, campaign, client, project, or similar workspace data is controlled by organization settings and applicable consent or authorization. When that access is disabled, Miles must operate without retrieving those live records. Revoking consent stops new optional AI access but does not require deletion of information that must be retained for security, transaction completion, legal compliance, or the establishment or defense of claims.',
    ],
    bullets: [
      'Data minimization: only context reasonably relevant to the requested feature should be submitted for AI processing.',
      'Model providers: inputs and outputs may be processed by contracted AI infrastructure providers acting under applicable data-protection and security terms. Provider identity may vary by enabled feature, availability, and customer configuration.',
      'Training: IrisOS does not use customer workspace content to train a generalized IrisOS model unless the customer gives separate, specific permission. Service operation, abuse prevention, and permitted provider processing are distinct from model training.',
      'Sensitive data: customers must not intentionally submit special-category, biometric, health, government identifier, payment-card, children’s, or similarly sensitive data to Miles unless the feature expressly supports it and a lawful basis and required safeguards are in place.',
      'Accuracy: AI output may be incomplete or incorrect and must be reviewed by an authorized person before it is relied on, sent externally, or used to take consequential action.',
    ],
  },
  {
    id: 'voice-messaging', title: 'Miles voice, transcription, and secure messaging',
    paragraphs: [
      'Miles voice features transmit microphone audio to contracted speech and AI infrastructure only after the user starts a voice or transcription session. The service is configured to treat input as English, reject silence and non-speech turns, and return audio or text responses. Realtime microphone audio is not stored by IrisOS as a recording. Accepted transcripts and Miles responses may be saved to workspace chat history for continuity and auditability.',
      'Secure messaging uses participant and device identifiers, delivery receipts, public device keys, encrypted message envelopes, encrypted attachment metadata, and encrypted attachment ciphertext. Message plaintext, private keys, attachment keys, and plaintext attachment names are intended to remain on participant devices. Recipients may download and decrypt attachments they are authorized to access.',
    ],
  },
  {
    id: 'workspace-features', title: 'Documents, onboarding, design, and operational features',
    paragraphs: ['IrisOS may process data used for client and team onboarding, project stages and tasks, proposals, contracts, statements of work, reports, invoices, electronic signatures, notifications, daily briefings, strategies, forecasts, Canva-powered design workflows, approvals, campaign assets, content scheduling, profile images, invoice branding, and workspace backgrounds. The information processed depends on the feature selected, the user’s role, workspace permissions, connected providers, and organization settings.'],
  },
  {
    id: 'automated-decisions', title: 'Automated decisions, profiling, and human review',
    paragraphs: [
      'Miles scores, forecasts, classifications, and recommendations are decision-support tools. IrisOS does not intend Miles output by itself to make a solely automated decision that produces legal or similarly significant effects on an individual. Customers must maintain meaningful human oversight for hiring, credit, eligibility, pricing, termination, legal, health, or other consequential decisions.',
      'Where applicable law grants rights concerning automated decisions or profiling, an affected person may request information about the data and principal factors involved, correct inaccurate source data, object or request restriction, express a point of view, contest the outcome, and obtain human review. Requests may be submitted to the customer controlling the workspace data or to our privacy contact.',
    ],
  },
  {
    id: 'disclosures', title: 'Disclosures, subprocessors, and sale or sharing',
    paragraphs: ['We disclose personal data only as necessary for the purposes described here, at a customer’s direction, with consent, or as permitted by law. Recipients may include hosting and database providers, authentication services, email and communications providers, AI infrastructure providers, payment processors, analytics and security vendors, professional advisers, integration providers selected by the customer, and authorities where legally required.'],
    bullets: [
      'Service providers are expected to process data under contractual confidentiality, security, purpose-limitation, and deletion or return obligations appropriate to their role.',
      'IrisOS does not sell personal data for monetary consideration. We do not share personal data for cross-context behavioral advertising as those terms are defined by applicable US state privacy laws. If our practices change, we will provide required notice and opt-out mechanisms before the change applies.',
      'We may disclose data in a merger, financing, reorganization, acquisition, or sale of assets, subject to applicable notice and protection requirements.',
    ],
  },
  {
    id: 'transfers', title: 'International data transfers',
    paragraphs: ['IrisOS and its providers may process data in countries other than the country where it was collected. Where required, we use recognized transfer mechanisms and supplementary safeguards, which may include adequacy decisions, standard contractual clauses, the UK International Data Transfer Agreement or Addendum, contractual clauses or certifications recognized by local authorities, transfer-impact assessments, access controls, encryption, and data-minimization measures. Customers are responsible for configuring integrations and workspace use consistently with transfer restrictions that apply to their data.'],
  },
  {
    id: 'retention', title: 'Retention and deletion',
    paragraphs: ['We retain personal data only for as long as reasonably necessary for the stated purpose, customer instructions, service delivery, account administration, security, dispute resolution, and legal, tax, accounting, or regulatory obligations. Retention varies by data type and contract. Workspace data is deleted or returned following account termination in accordance with the customer agreement and backup lifecycle, unless continued retention is required or permitted by law. Signed-document audit records and transaction records may be retained for the applicable limitation and statutory periods. Data that cannot yet be deleted from backups is isolated from ordinary use until overwritten.'],
  },
  {
    id: 'security', title: 'Security and incident response',
    paragraphs: ['We use administrative, technical, and organizational safeguards designed for the nature and risk of the data, including role-based access, authentication controls, encrypted transport, credential protection, logging, tenant scoping, secure development practices, backups, and incident response. No system is completely secure. Where a personal-data breach triggers a legal notification duty, we will notify affected customers, individuals, and regulators within the applicable time and with the information required by law.'],
  },
  {
    id: 'rights', title: 'Privacy rights worldwide',
    paragraphs: ['Subject to jurisdiction, role, verification, and lawful exceptions, individuals may exercise the rights below. We will not discriminate or retaliate for exercising a privacy right. Authorized agents may submit requests where permitted; we may require proof of authority and identity.'],
    bullets: [
      'Know whether and how personal data is processed, and receive information about categories, sources, purposes, recipients, retention, international transfers, and AI or automated processing.',
      'Access personal data and receive a portable copy where required.',
      'Correct inaccurate or incomplete personal data.',
      'Delete, erase, anonymize, block, or de-index personal data where applicable and not subject to a lawful exception.',
      'Restrict or suspend processing, withdraw consent, and object to processing based on legitimate interests, direct marketing, profiling, or certain AI uses.',
      'Opt out of sale, sharing, targeted advertising, or qualifying profiling; limit use and disclosure of sensitive personal information where such processing occurs.',
      'Request human intervention, an explanation, or review of qualifying automated decisions and contest an outcome.',
      'Complain to the relevant privacy, data-protection, or consumer-protection authority and appeal a denied request where applicable.',
    ],
    note: 'These rights reflect, where applicable, frameworks including the EU GDPR; UK GDPR and Data Protection Act 2018 as amended by the Data (Use and Access) Act 2025; India’s DPDP Act; California’s CCPA as amended by the CPRA and other applicable US state privacy laws; Brazil’s LGPD; Canada’s PIPEDA and applicable provincial laws; Australia’s Privacy Act and APPs; Singapore’s PDPA; Japan’s APPI; South Korea’s PIPA; China’s PIPL; Switzerland’s FADP; South Africa’s POPIA; and comparable laws in other jurisdictions where IrisOS operates.',
  },
  {
    id: 'regional', title: 'Regional notices',
    bullets: [
      'EEA, Switzerland, and United Kingdom: individuals may contact the competent supervisory authority. Where required, we will identify an appropriate representative and transfer mechanism. Legitimate-interest processing is subject to balancing and objection rights.',
      'United States: state-specific rights apply only when statutory thresholds and definitions are met. We do not offer financial incentives for personal data and do not use sensitive personal information to infer characteristics beyond providing requested services.',
      'India: data principals may seek access information, correction, completion, updating, erasure, grievance redressal, and nomination as provided by applicable DPDP law and rules.',
      'Brazil, Canada, Australia, Singapore, Japan, South Korea, China, South Africa, and other regions: we apply the applicable notice, consent or lawful-basis, access, correction, security, retention, transfer, objection, deletion, and regulator-cooperation requirements according to the law governing the processing.',
    ],
  },
  {
    id: 'children', title: 'Children and sensitive information',
    paragraphs: ['IrisOS is a business service and is not directed to children. We do not knowingly collect personal data directly from children below the minimum age applicable in their jurisdiction. Customers must not place children’s data in IrisOS unless legally authorized, necessary for a supported business purpose, and protected by all required notices, consent, and safeguards. Contact us if you believe a child’s data was submitted improperly.'],
  },
  {
    id: 'requests-contact', title: 'Requests, complaints, and contact',
    paragraphs: ['To exercise a right, raise a complaint in the Get Help section or reach out to cto.admin@irisos.app. Describe the data, account, agency workspace, right, and jurisdiction involved. We may verify identity and authority proportionately before responding. If IrisOS processes the information only for an agency customer, we may refer the request to that customer and assist it. We will respond within the period required by applicable law and explain any lawful denial or appeal route.'],
  },
  {
    id: 'changes', title: 'Policy changes',
    paragraphs: ['We may update this policy to reflect product, provider, legal, or operational changes. We will post the revised date and provide additional notice or obtain renewed consent where required. Material changes do not retroactively authorize a new use of personal data where applicable law requires a different legal basis or fresh consent.'],
  },
];

const sources = [
  { label: 'EU General Data Protection Regulation', href: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' },
  { label: 'UK ICO: AI and data protection', href: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/' },
  { label: 'India Digital Personal Data Protection Act', href: 'https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf' },
  { label: 'California Attorney General: CCPA', href: 'https://oag.ca.gov/privacy/ccpa' },
  { label: 'Brazil Government: LGPD rights', href: 'https://www.gov.br/governodigital/pt-br/lgpd-pagina-do-cidadao' },
  { label: 'Canada OPC: PIPEDA', href: 'https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/' },
  { label: 'Australia OAIC: Australian Privacy Principles', href: 'https://www.oaic.gov.au/privacy/australian-privacy-principles/read-the-australian-privacy-principles' },
  { label: 'Singapore PDPC: Data protection obligations', href: 'https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act/data-protection-obligations' },
  { label: 'Japan PPC: APPI', href: 'https://www.ppc.go.jp/en/legal/' },
  { label: 'South Korea PIPC: Data-subject requests', href: 'https://www.pipc.go.kr/eng/user/lgp/ntp/requestAccess.do' },
  { label: 'China National People’s Congress: PIPL', href: 'https://www.npc.gov.cn/npc/c2597/c5854/bfflywwb/202311/t20231117_433007.html' },
  { label: 'Switzerland FDPIC', href: 'https://www.edoeb.admin.ch/en' },
  { label: 'South Africa POPIA', href: 'https://www.gov.za/documents/protection-personal-information-act' },
];

export default function PrivacyPolicyPage() {
  return <LegalPolicyPage title="Global Privacy & AI Data Policy" badge="Privacy, security, and responsible AI" updated="September 17, 2026" introduction="This policy describes IrisOS data practices across the website, agency workspaces, integrations, document workflows, electronic signatures, secure messaging, Design Hub, and Miles AI." sections={sections} sources={sources} />;
}
