import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { generateProposalPdf } from './pdf';
import { proposalSchema } from './types';

describe('Iris OS proposal PDF', () => {
  it('creates a branded multi-page proposal without requiring signatures', async () => {
    const input = proposalSchema.parse({
      proposalNumber: 'PROP-2026-001', title: 'Growth Partnership Proposal', issueDate: '2026-08-06', validUntil: '2026-09-05',
      agencyName: 'Iris Studio', agencyEmail: 'hello@iris.example', agencyPhone: '+919876543210', agencyAddress: 'Bengaluru, Karnataka, India', brandColor: '#5B3F8C', logoDataUrl: '',
      clientName: 'Avery Morgan', clientCompany: 'Northstar Labs', clientEmail: 'avery@northstar.example', clientPhone: '+441234567890', clientAddress: 'London, United Kingdom', projectName: 'Growth Operations Programme',
      introduction: 'Thank you for inviting Iris Studio to propose a structured growth programme.',
      executiveSummary: 'This proposal aligns strategy, execution, reporting, and governance around measurable commercial outcomes.',
      objectives: 'Increase qualified demand\nImprove conversion visibility\nCreate a repeatable operating cadence',
      scope: 'Discovery and research\nStrategy and implementation\nReporting and optimisation',
      deliverables: 'Operating plan\nCampaign assets\nMonthly performance report', exclusions: 'Media spend\nUnlisted third-party subscriptions', timeline: 'Weeks 1-2: discovery\nWeeks 3-6: implementation\nMonthly: optimisation',
      currency: 'USD', taxRate: 0,
      services: [{ name: 'Growth strategy', description: 'Research, planning, implementation guidance, and performance reviews.', duration: '12 weeks', price: 18000 }],
      paymentSchedule: [{ phase: 'Commencement', due: 'On approval', amount: 9000, description: 'Reserves delivery capacity and starts discovery.' }, { phase: 'Implementation', due: 'At week 4', amount: 9000, description: 'Covers implementation and reporting.' }],
      assumptions: 'Feedback arrives within three business days.', clientResponsibilities: 'Provide access and timely approvals.', agencyResponsibilities: 'Deliver the agreed scope and report risks.',
      changeControl: 'Changes require a written impact assessment and approval.', confidentiality: 'Both parties protect confidential information.', intellectualProperty: 'Final deliverables transfer after full payment; pre-existing IP remains with its owner.', termination: 'Either party may terminate with 30 days written notice.', governingLaw: 'Laws of Karnataka, India, with disputes first referred to mediation.', nextSteps: 'Approve in Iris OS\nSchedule kickoff\nProvide access and materials',
    });
    const bytes = await generateProposalPdf(input);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    const parsed = await PDFDocument.load(Uint8Array.from(bytes));
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(5);
    expect(parsed.getTitle()).toBe('Growth Partnership Proposal');
    expect(parsed.getAuthor()).toBe('Iris Studio');
  });
});
