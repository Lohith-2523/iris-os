import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { generateLegalDocumentPdf } from './pdf';
import { contractSchema, sowSchema } from './types';

const parties = {
  documentNumber: 'DOC-2026-001', title: 'Professional Services Agreement', effectiveDate: '2026-08-06',
  agencyName: 'Iris Studio', agencyLegalName: 'Iris Studio Private Limited', agencyEmail: 'hello@iris.example', agencyPhone: '+919876543210', agencyAddress: 'Bengaluru, India',
  clientName: 'Avery Morgan', clientLegalName: 'Northstar Labs Limited', clientEmail: 'avery@northstar.example', clientPhone: '+441234567890', clientAddress: 'London, United Kingdom',
  brandColor: '#5B3F8C', logoDataUrl: '', agencySignatoryName: 'Robin Reyes', agencySignatoryTitle: 'Director', clientSignatoryName: 'Avery Morgan', clientSignatoryTitle: 'Chief Marketing Officer',
};

describe('Iris OS Contract and SOW PDFs', () => {
  it('creates a complete service agreement', async () => {
    const input = contractSchema.parse({
      kind: 'CONTRACT', ...parties, commencementDate: '2026-08-10', initialTerm: '90 days', recitals: 'The parties wish to establish a professional services relationship.', services: 'Strategy\nCampaign delivery\nReporting', deliverables: 'Approved campaign assets and monthly reports.', fees: 'USD 18,000.', paymentTerms: 'Payable in two equal instalments.', latePayment: 'Services may be suspended after written notice.', cancellation: 'Completed work is non-refundable.', performanceDisclaimer: 'Third-party and market outcomes are not guaranteed.', termination: '30 days written notice.', confidentiality: 'Mutual confidentiality applies.', publicity: 'Written approval is required.', intellectualProperty: 'Final bespoke work transfers after full payment.', dataProtection: 'Each party applies lawful safeguards.', clientObligations: 'Provide access\nProvide approvals', agencyObligations: 'Perform professionally\nReport risks', indemnification: 'Mutual indemnification for breach.', limitationOfLiability: 'Indirect losses are excluded where lawful.', independentContractor: 'The Agency is an independent contractor.', assignment: 'Assignment requires written consent.', forceMajeure: 'Events beyond reasonable control excuse delay.', notices: 'Notices must be written.', amendments: 'Amendments require written approval.', entireAgreement: 'This is the entire agreement.', severability: 'Remaining clauses survive.', governingLaw: 'Laws of Karnataka, India.', disputeResolution: 'Good-faith negotiation followed by mediation.',
    });
    const bytes = await generateLegalDocumentPdf(input);
    const parsed = await PDFDocument.load(Uint8Array.from(bytes));
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(6);
    expect(parsed.getSubject()).toContain('SERVICE AGREEMENT');
  });

  it('creates a deliverable-led statement of work', async () => {
    const input = sowSchema.parse({
      kind: 'SOW', ...parties, documentNumber: 'SOW-2026-001', title: 'Digital Growth Statement of Work', projectName: 'Growth Programme', engagementType: 'Monthly Retainer', startDate: '2026-08-10', endDate: '2026-12-31', introduction: 'A structured digital growth engagement.', objectives: 'Build brand presence\nGenerate qualified leads', scope: 'Social management\nContent production\nPerformance marketing', executionProcess: 'Plan\nCreate\nApprove\nPublish\nOptimise', deliverables: [{ name: 'Content', scope: 'Twelve monthly creatives and copy.', cadence: 'Monthly', acceptance: 'Approved in Iris OS.' }], milestones: [{ name: 'Kickoff', targetDate: 'Week 1', output: 'Approved calendar.' }], currency: 'INR', fee: 150000, taxRate: 18, pricingNotes: 'Monthly retainer.', paymentTerms: 'Monthly advance.', expensesAndAdSpend: 'Client funded on actuals.', revisions: 'Included within scope.', reporting: 'Monthly insights.', assumptions: 'Timely access and approvals.', dependencies: 'Platform availability.', exclusions: 'Media spend.', governance: 'Named project owners.', changeManagement: 'Written approval for scope changes.', confidentiality: 'Mutual confidentiality applies.', intellectualProperty: 'Final bespoke work transfers after full payment.', termination: '30 days written notice.', closingNote: 'The parties will work toward measurable growth.',
    });
    const bytes = await generateLegalDocumentPdf(input);
    const parsed = await PDFDocument.load(Uint8Array.from(bytes));
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(7);
    expect(parsed.getSubject()).toContain('STATEMENT OF WORK');
  });
});
