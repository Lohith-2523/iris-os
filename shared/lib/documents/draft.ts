import 'server-only';

import type { Organization } from '@prisma/client';
import type { ProposalInput } from '@/lib/proposals/types';
import type { ContractInput, LegalDocumentInput, SowInput } from '@/lib/legal-documents/types';

export type DocumentKind = 'PROPOSAL' | 'CONTRACT' | 'SOW';
export type DocumentRecipient = {
  id: string;
  type: 'LEAD' | 'CLIENT';
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  address?: string;
};

export type SimpleDocumentDetails = {
  workProvided: string;
  timeline: string;
  paymentTerms: string;
  termsAndConditions?: string;
};

const iso = (date = new Date()) => date.toISOString().slice(0, 10);
const plusDays = (days: number) => iso(new Date(Date.now() + days * 86_400_000));

export function governingLawFor(organization: Pick<Organization, 'billingCountry' | 'billingState' | 'billingCity'>) {
  const country = organization.billingCountry?.trim() || 'the agency’s country of registration';
  const region = organization.billingState?.trim() || organization.billingCity?.trim();
  return region
    ? `The laws of ${region}, ${country} govern this document, and the courts with jurisdiction in ${region} will have exclusive jurisdiction.`
    : `The laws of ${country} govern this document, and its courts of competent jurisdiction will have exclusive jurisdiction.`;
}

function agency(organization: Organization, fallbackEmail: string) {
  return {
    agencyName: organization.name,
    agencyLegalName: organization.legalEntityName || organization.name,
    agencyEmail: organization.billingEmail || fallbackEmail,
    agencyPhone: '',
    agencyAddress: [organization.billingAddressLine1, organization.billingAddressLine2, organization.billingCity, organization.billingState, organization.billingPostalCode, organization.billingCountry].filter(Boolean).join(', '),
    brandColor: organization.invoiceBrandColor || '#09090B',
    logoDataUrl: organization.invoiceLogoDataUrl || '',
  };
}

export function createDocumentDraft(kind: DocumentKind, prompt: string, recipient: DocumentRecipient, organization: Organization, userEmail: string): ProposalInput | LegalDocumentInput {
  const request = prompt.trim();
  const org = agency(organization, userEmail);
  const governingLaw = governingLawFor(organization);
  const number = `${kind === 'PROPOSAL' ? 'PROP' : kind === 'CONTRACT' ? 'CTR' : 'SOW'}-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const clientAddress = recipient.address || 'Address to be confirmed';

  if (kind === 'PROPOSAL') {
    return {
      proposalNumber: number, title: `Proposal for ${recipient.company}`, issueDate: iso(), validUntil: plusDays(30),
      agencyName: org.agencyName, agencyEmail: org.agencyEmail, agencyPhone: org.agencyPhone, agencyAddress: org.agencyAddress || 'Agency address on file', brandColor: org.brandColor, logoDataUrl: org.logoDataUrl,
      clientName: recipient.name, clientCompany: recipient.company, clientEmail: recipient.email, clientPhone: recipient.phone || '', clientAddress, projectName: `Engagement for ${recipient.company}`,
      introduction: `Thank you for the opportunity to support ${recipient.company}. This proposal translates your brief into a focused delivery plan.`,
      executiveSummary: request,
      objectives: `Deliver the outcomes described in the brief\nCreate a clear, measurable delivery cadence\nMaintain transparent review and reporting`,
      scope: request,
      deliverables: `Discovery and implementation plan\nAgreed production deliverables\nPerformance review and recommendations`,
      exclusions: 'Work not expressly described in this proposal requires written change approval.',
      timeline: 'Kickoff following approval, followed by phased delivery and scheduled review points.',
      currency: organization.currency || 'USD', taxRate: 0,
      services: [{ name: 'Professional services', description: request, duration: 'As agreed in the delivery plan', price: 0 }],
      paymentSchedule: [{ phase: 'Project commencement', due: 'Upon approval', amount: 0, description: 'Initial payment to reserve capacity and begin delivery.' }],
      assumptions: 'Required access, source materials, and consolidated feedback will be supplied within the agreed review windows.',
      clientResponsibilities: 'Provide accurate information, nominate a decision-maker, and review deliverables within agreed timelines.',
      agencyResponsibilities: 'Deliver the agreed scope professionally, communicate progress and risks, and protect client information.',
      changeControl: 'Scope changes will be documented with their effect on fees and schedule and require written approval.',
      confidentiality: 'Each party will protect confidential information and use it only for this engagement.',
      intellectualProperty: 'Upon full payment, the client receives agreed rights in final deliverables. Pre-existing tools and know-how remain with their owner.',
      termination: 'Either party may terminate with 30 days written notice. Completed work and committed third-party costs remain payable.',
      governingLaw,
      additionalTerms: '',
      nextSteps: 'Approve the proposal in Iris OS, confirm commercial terms, schedule kickoff, and provide required access and materials.',
    };
  }

  const common = {
    documentNumber: number, effectiveDate: iso(), ...org,
    clientName: recipient.name, clientLegalName: recipient.company, clientEmail: recipient.email,
    clientPhone: recipient.phone || '', clientAddress,
  };
  if (kind === 'CONTRACT') {
    return {
      kind, ...common, title: 'Professional Services Agreement', commencementDate: iso(), initialTerm: '90 days, then month-to-month unless otherwise agreed.',
      recitals: `${org.agencyLegalName} will provide professional services to ${recipient.company} based on this brief: ${request}`,
      services: request, deliverables: 'Deliverables will be completed according to the approved proposal or statement of work.', fees: 'Fees are stated in the applicable proposal or statement of work.',
      paymentTerms: 'Invoices are due within 14 days unless the applicable statement of work states otherwise.', latePayment: 'Overdue amounts may result in paused work after written notice.', cancellation: 'Committed work and non-refundable third-party costs remain payable.',
      performanceDisclaimer: 'Results depend on market conditions, platform availability, client inputs, and other factors outside the agency’s control.', termination: 'Either party may terminate with 30 days written notice, subject to payment for completed and committed work.',
      confidentiality: 'Each party will protect confidential information using reasonable safeguards and use it only for this engagement.', publicity: 'No public use of the other party’s name or marks without prior written approval.',
      intellectualProperty: 'Upon full payment, agreed rights in final deliverables transfer to the client. Pre-existing materials, tools, and know-how remain with their owner.', dataProtection: 'Each party will comply with applicable data-protection law and maintain appropriate security controls.',
      clientObligations: 'Provide timely access, accurate information, consolidated feedback, approvals, and a nominated decision-maker.', agencyObligations: 'Perform services professionally, communicate material risks, and follow the approved scope.',
      indemnification: 'Each party is responsible for third-party claims arising from its breach, negligence, or unlawful materials.', limitationOfLiability: 'Neither party is liable for indirect or consequential loss. Aggregate liability is limited to fees paid under the relevant statement of work, except where prohibited by law.',
      independentContractor: 'The agency is an independent contractor and neither party may bind the other.', assignment: 'Neither party may assign this agreement without written consent, except as part of a corporate reorganization or sale.',
      forceMajeure: 'Neither party is liable for delay caused by events beyond reasonable control, provided prompt notice and mitigation are given.', notices: 'Formal notices must be sent to the email or address stated in this agreement.',
      amendments: 'Changes must be recorded in writing and approved by authorized representatives.', entireAgreement: 'This agreement and incorporated statements of work form the entire agreement for the services.', severability: 'If a provision is unenforceable, the remaining provisions continue in effect.',
      governingLaw, disputeResolution: 'The parties will first attempt good-faith negotiation and mediation before court proceedings, except for urgent relief.',
      additionalTerms: '',
      agencySignatoryName: 'Authorized representative', agencySignatoryTitle: 'Authorized signatory', clientSignatoryName: recipient.name, clientSignatoryTitle: 'Authorized signatory',
    };
  }

  return {
    kind, ...common, title: 'Statement of Work', projectName: `Engagement for ${recipient.company}`, engagementType: 'Professional Services', startDate: iso(), endDate: plusDays(90),
    introduction: `This statement of work defines the delivery framework for ${recipient.company}.`, objectives: request, scope: request,
    executionProcess: 'Discovery and planning\nProduction and internal quality review\nClient review and approval\nDelivery, measurement, and reporting',
    deliverables: [{ name: 'Agreed engagement deliverables', scope: request, cadence: 'As scheduled', acceptance: 'Accepted when delivered in the agreed format and approved through Iris OS.' }],
    milestones: [{ name: 'Kickoff and discovery', targetDate: 'Week 1', output: 'Approved brief, access checklist, and delivery calendar.' }],
    currency: organization.currency || 'USD', fee: 0, taxRate: 0, pricingNotes: 'The fee includes only the services and deliverables stated in this SOW.', paymentTerms: 'Fees are payable according to the agreed invoice schedule.',
    expensesAndAdSpend: 'Media spend, production expenses, travel, and third-party subscriptions are separate and require approval.', revisions: 'Reasonable revisions within scope are included; new directions follow change control.', reporting: 'Progress, risks, and results will be communicated through agreed reporting checkpoints.',
    assumptions: 'Required access and materials are supplied on time\nFeedback is consolidated and returned within agreed windows', dependencies: 'Platform availability\nTimely approvals\nApproved third-party budgets', exclusions: 'Unlisted deliverables\nThird-party fees unless included\nWork requested after acceptance',
    governance: 'Each party will nominate a project owner. Decisions and approvals will be recorded in Iris OS.', changeManagement: 'Scope changes will document effects on fees, deliverables, and schedule before approval.',
    confidentiality: 'Each party will protect confidential information and use it only for the engagement.', intellectualProperty: 'Rights in final deliverables transfer as described in the governing agreement after full payment.', termination: 'Termination follows the governing agreement; completed work and committed costs remain payable.', closingNote: `This SOW provides a measurable delivery framework and is governed by: ${governingLaw}`,
    additionalTerms: '',
    agencySignatoryName: 'Authorized representative', agencySignatoryTitle: 'Authorized signatory', clientSignatoryName: recipient.name, clientSignatoryTitle: 'Authorized signatory',
  };
}

export function createSimpleDocumentDraft(kind: DocumentKind, details: SimpleDocumentDetails, recipient: DocumentRecipient, organization: Organization, userEmail: string): ProposalInput | LegalDocumentInput {
  const workProvided = details.workProvided.trim();
  const timeline = details.timeline.trim();
  const paymentTerms = details.paymentTerms.trim();
  const additionalTerms = details.termsAndConditions?.trim() || '';
  const brief = `Work provided:\n${workProvided}\n\nTimeline:\n${timeline}\n\nPayment terms:\n${paymentTerms}`;
  const draft = createDocumentDraft(kind, brief, recipient, organization, userEmail);

  if (kind === 'PROPOSAL') {
    const proposal = draft as ProposalInput;
    return {
      ...proposal,
      executiveSummary: `This proposal sets out the work, delivery timeline, and commercial terms agreed for ${recipient.company}.`,
      scope: workProvided,
      deliverables: workProvided,
      timeline,
      services: [{ name: 'Professional services', description: workProvided, duration: timeline, price: 0 }],
      paymentSchedule: [{ phase: 'Agreed payment schedule', due: paymentTerms, amount: 0, description: paymentTerms }],
      additionalTerms,
    };
  }

  if (kind === 'CONTRACT') {
    const contract = draft as ContractInput;
    return {
      ...contract,
      recitals: `${contract.agencyLegalName} will provide the services described in this agreement to ${recipient.company}.`,
      services: workProvided,
      deliverables: workProvided,
      initialTerm: timeline,
      fees: paymentTerms,
      paymentTerms,
      additionalTerms,
    };
  }

  const sow = draft as SowInput;
  return {
    ...sow,
    objectives: workProvided,
    scope: workProvided,
    deliverables: [{ name: 'Agreed engagement deliverables', scope: workProvided, cadence: timeline, acceptance: 'Accepted when delivered in the agreed format and approved through Iris OS.' }],
    milestones: [{ name: 'Delivery timeline', targetDate: timeline, output: workProvided }],
    pricingNotes: paymentTerms,
    paymentTerms,
    additionalTerms,
  };
}
