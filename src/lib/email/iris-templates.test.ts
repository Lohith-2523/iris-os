import { describe, expect, it } from 'vitest';
import {
  __testing,
  clientOnboardingEmail,
  invoiceDeliveryEmail,
  meetingInvitationEmail,
  memberOnboardingEmail,
} from './iris-templates';

describe('Iris email templates', () => {
  it('escapes untrusted content', () => {
    expect(__testing.escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  });

  it('renders a branded meeting invitation with the Meet link', () => {
    const email = meetingInvitationEmail({
      meetingName: 'Quarterly Review',
      organizerName: 'Asha',
      organizationName: 'Iris Agency',
      startTime: new Date('2026-08-01T09:00:00.000Z'),
      endTime: new Date('2026-08-01T09:30:00.000Z'),
      timeZone: 'UTC',
      meetUrl: 'https://meet.google.com/example',
    });

    expect(email.html).toContain('IRIS OS');
    expect(email.html).toContain('https://meet.google.com/example');
    expect(email.text).toContain('Quarterly Review');
  });

  it('renders the black, white, and metallic client invitation layout', () => {
    const email = clientOnboardingEmail({
      recipientName: 'Lohith',
      organizationName: 'Iris Agency',
      inviteUrl: 'https://irisos.app/invite?token=client-token',
      expiresAt: new Date('2026-08-04T00:00:00.000Z'),
    });

    expect(email.html).toContain('background-color:#ffffff');
    expect(email.html).toContain('background-color:#090a0c');
    expect(email.html).toContain('linear-gradient(135deg,#fafafa');
    expect(email.html).toContain('https://irisos.app/iris-logo-white-bg.png');
    expect(email.html).toContain('Activate client workspace');
    expect(email.html).toContain('https://irisos.app/invite?token=client-token');
  });

  it('renders the same invitation system for team onboarding', () => {
    const email = memberOnboardingEmail({
      recipientName: 'Asha',
      organizationName: 'Iris Agency',
      agencyTypes: ['Creative', 'Strategy'],
      inviteUrl: 'https://irisos.app/onboarding/member?token=team-token',
      expiresAt: new Date('2026-08-04T00:00:00.000Z'),
    });

    expect(email.html).toContain('Team invitation');
    expect(email.html).toContain('Creative, Strategy');
    expect(email.html).toContain('Complete team onboarding');
    expect(email.text).toContain('team-token');
  });

  it('renders invoice delivery with the exact invitation layout system', () => {
    const email = invoiceDeliveryEmail({
      recipientName: 'Lohith',
      organizationName: 'Iris Agency',
      invoiceNumber: 'INV-2026-001',
      projectName: 'Launch campaign',
      amount: 'INR 118,000.00',
      dueDate: 'August 30, 2026',
      downloadUrl: 'https://irisos.app/api/invoices/invoice-id/pdf',
      documentType: 'INVOICE',
    });

    expect(email.subject).toContain('Tax invoice');
    expect(email.html).toContain('background-color:#090a0c');
    expect(email.html).toContain('linear-gradient(135deg,#fafafa');
    expect(email.html).toContain('https://irisos.app/iris-logo-white-bg.png');
    expect(email.html).toContain('Tax invoice');
    expect(email.html).toContain('Download invoice PDF');
  });

  it('omits a proforma validity date when none was provided', () => {
    const email = invoiceDeliveryEmail({
      recipientName: 'Lohith',
      organizationName: 'Iris Agency',
      invoiceNumber: 'PF-2026-001',
      projectName: 'Website redesign quotation',
      amount: 'INR 118,000.00',
      downloadUrl: 'https://irisos.app/api/invoices/proforma-id/pdf',
      documentType: 'PROFORMA',
    });

    expect(email.html).not.toContain('Valid until');
    expect(email.text).not.toContain('Valid until');
  });
});
