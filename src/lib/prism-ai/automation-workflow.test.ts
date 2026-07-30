import { describe, expect, it } from 'vitest';
import {
  automationConfirmationMessage,
  automationDraftSchema,
  isAutomationRequest,
  mergeAutomationWorkflow,
  missingAutomationFields,
} from './automation-workflow';

describe('Prism automation workflow', () => {
  it('detects creation requests without hijacking analytical questions', () => {
    expect(isAutomationRequest('Create a project for Acme')).toBe(true);
    expect(isAutomationRequest('Generate a financial report')).toBe(true);
    expect(isAutomationRequest('What projects are at risk?')).toBe(false);
  });

  it('preserves collected values across follow-up answers', () => {
    const current = {
      kind: 'TASK' as const,
      awaitingConfirmation: false,
      draft: automationDraftSchema.parse({
        title: 'Approve launch creative',
        projectName: 'Acme Launch',
      }),
    };
    const next = mergeAutomationWorkflow(current, {
      kind: 'TASK',
      action: 'READY',
      draft: automationDraftSchema.parse({ deadline: '2026-08-15' }),
      reply: '',
    });

    expect(next?.draft.title).toBe('Approve launch creative');
    expect(next?.draft.projectName).toBe('Acme Launch');
    expect(next?.draft.deadline).toBe('2026-08-15');
    expect(next?.awaitingConfirmation).toBe(true);
  });

  it('requires retainer frequency but not one-time frequency', () => {
    const base = automationDraftSchema.parse({
      name: 'Website',
      clientName: 'Acme',
      serviceLine: 'Web design',
      startDate: '2026-08-01',
      endDate: '2026-09-30',
      paymentAmount: '5000',
      paymentStartDate: '2026-08-01',
      paymentTerms: 'NET_30',
    });
    expect(missingAutomationFields({
      kind: 'PROJECT',
      awaitingConfirmation: false,
      draft: { ...base, paymentType: 'RETAINER' },
    })).toContain('retainer frequency');
    expect(missingAutomationFields({
      kind: 'PROJECT',
      awaitingConfirmation: false,
      draft: { ...base, paymentType: 'ONE_TIME' },
    })).not.toContain('retainer frequency');
  });

  it('requires a saved lead for proformas while keeping validity optional', () => {
    const draft = automationDraftSchema.parse({
      invoiceDocumentType: 'PROFORMA',
      invoiceNumber: 'PF-2026-001',
      invoiceIssuedDate: '2026-08-07',
      invoiceReferenceName: 'Brand redesign',
      description: 'Brand redesign quotation',
      customerAddressLine1: '1 Studio Road',
      customerCity: 'Bengaluru',
      customerState: 'Karnataka',
      customerPostalCode: '560001',
      customerCountry: 'India',
      invoiceTaxRate: '18',
      invoiceItems: [{ description: 'Brand strategy', quantity: 1, unitPrice: 75000 }],
    });

    const missingLead = missingAutomationFields({
      kind: 'INVOICE',
      awaitingConfirmation: false,
      draft,
    });
    expect(missingLead).toContain('lead');
    expect(missingLead).not.toContain('valid-until date');

    expect(missingAutomationFields({
      kind: 'INVOICE',
      awaitingConfirmation: false,
      draft: { ...draft, leadName: 'Luxor Industries' },
    })).toEqual([]);
  });

  it('keeps provider branding out of the confirmation', () => {
    const message = automationConfirmationMessage({
      kind: 'REPORT',
      awaitingConfirmation: true,
      draft: automationDraftSchema.parse({
        title: 'July performance',
        reportType: 'FINANCIAL',
        reportFocus: 'Revenue and margin',
      }),
    }, 'USD');
    expect(message).toContain('Reply **Confirm**');
    expect(message).not.toMatch(/Gemini/i);
  });
});
