const IRIS_SILVER = '#d4d4d8';
const IRIS_MUTED = '#a1a1aa';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function irisEmailLayout(input: {
  eyebrow: string;
  title: string;
  intro: string;
  details?: Array<{ label: string; value: string }>;
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}) {
  const details = input.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #27272a;background:#111113">
        ${input.details.map(({ label, value }) => `
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #27272a;color:${IRIS_MUTED};font-size:12px;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(label)}</td>
            <td style="padding:12px 16px;border-bottom:1px solid #27272a;color:#ffffff;font-size:13px;text-align:right">${escapeHtml(value)}</td>
          </tr>`).join('')}
      </table>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;background:#050506;color:#ffffff;font-family:Inter,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050506;padding:36px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border:1px solid #27272a;background:#0b0b0d">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #27272a">
                <div style="font-size:18px;font-weight:700;letter-spacing:.12em;color:#ffffff">IRISOS</div>
                <div style="margin-top:4px;font-size:10px;letter-spacing:.2em;color:${IRIS_MUTED};text-transform:uppercase">Enterprise Operations System</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px">
                <div style="font-size:10px;font-weight:700;letter-spacing:.18em;color:${IRIS_MUTED};text-transform:uppercase">${escapeHtml(input.eyebrow)}</div>
                <h1 style="margin:10px 0 14px;font-size:26px;line-height:1.2;color:#ffffff">${escapeHtml(input.title)}</h1>
                <p style="margin:0;color:${IRIS_SILVER};font-size:14px;line-height:1.7">${escapeHtml(input.intro)}</p>
                ${details}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px">
                  <tr>
                    <td style="background:#ffffff">
                      <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:13px 22px;color:#09090b;text-decoration:none;font-size:13px;font-weight:700">${escapeHtml(input.ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;color:#71717a;font-size:11px;line-height:1.6">If the button does not open, copy this secure link:<br><span style="color:#a1a1aa;word-break:break-all">${escapeHtml(input.ctaUrl)}</span></p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #27272a;color:#71717a;font-size:10px;line-height:1.6">${escapeHtml(input.footer)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function irisInviteLayout(input: {
  documentTitle: string;
  eyebrow: string;
  title: string;
  intro: string;
  details: Array<{ label: string; value: string }>;
  ctaLabel?: string;
  ctaUrl?: string;
  securityNote: string;
  badgeLabel?: string;
  footerNote?: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(input.documentTitle)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.intro)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#ffffff">
      <tr>
        <td align="center" style="padding:48px 20px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:580px">
            <tr>
              <td align="center" style="padding:0 0 22px">
                <img src="https://irisos.app/iris-logo-white-bg.png" width="132" alt="IrisOS" style="display:block;width:132px;max-width:100%;height:auto;border:0">
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #2e3034;border-radius:24px;background-color:#090a0c;box-shadow:0 20px 48px rgba(0,0,0,.22)">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:18px 36px;border-bottom:1px solid #34363a;background-color:#0c0d0f">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="font-size:10px;font-weight:700;letter-spacing:2px;color:#c7c9cd;text-transform:uppercase">Enterprise workspace</td>
                          <td align="right">
                            <span style="display:inline-block;padding:6px 10px;border:1px solid #777b81;border-radius:999px;background-color:#d8dade;background-image:linear-gradient(135deg,#ffffff 0%,#b5b8be 48%,#f4f4f5 100%);font-size:9px;font-weight:700;letter-spacing:1.2px;color:#151619;text-transform:uppercase">${escapeHtml(input.badgeLabel || 'Secure invite')}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px 36px 34px;background-color:#090a0c">
                      <span style="display:inline-block;margin:0 0 18px;padding:7px 11px;border:1px solid #aeb1b6;border-radius:6px;background-color:#e2e3e5;background-image:linear-gradient(135deg,#fafafa 0%,#b9bcc1 50%,#eeeeef 100%);font-size:10px;font-weight:700;letter-spacing:1.7px;color:#232529;text-transform:uppercase">${escapeHtml(input.eyebrow)}</span>
                      <h1 style="margin:0 0 16px;font-size:29px;line-height:1.22;font-weight:700;letter-spacing:-.6px;color:#ffffff">${escapeHtml(input.title)}</h1>
                      <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#c7c9cd">${escapeHtml(input.intro)}</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;border:1px solid #3c3f44;border-radius:12px;background-color:#151619">
                        ${input.details.map(({ label, value }, index) => `
                        <tr>
                          <td style="padding:13px 16px;${index < input.details.length - 1 ? 'border-bottom:1px solid #34363a;' : ''}font-size:10px;font-weight:700;letter-spacing:1.3px;color:#92969d;text-transform:uppercase">${escapeHtml(label)}</td>
                          <td align="right" style="padding:13px 16px;${index < input.details.length - 1 ? 'border-bottom:1px solid #34363a;' : ''}font-size:12px;font-weight:700;line-height:1.55;white-space:pre-wrap;color:#ffffff">${escapeHtml(value)}</td>
                        </tr>`).join('')}
                      </table>
                      ${input.ctaLabel && input.ctaUrl ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px">
                        <tr>
                          <td align="center" style="border:1px solid #ffffff;border-radius:11px;background-color:#ffffff;box-shadow:0 6px 18px rgba(255,255,255,.14)">
                            <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:15px 24px;border-radius:11px;color:#090a0c;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.1px">${escapeHtml(input.ctaLabel)}</a>
                          </td>
                        </tr>
                      </table>` : ''}
                      <div style="height:1px;margin:0 0 21px;background-color:#34363a"></div>
                      <p style="margin:0 0 14px;font-size:12px;line-height:1.65;color:#aeb1b6">${escapeHtml(input.securityNote)}</p>
                      ${input.ctaUrl ? `<p style="margin:0;font-size:11px;line-height:1.55;color:#777b82">If the button does not open, copy this secure link:<br><span style="color:#c7c9cd;word-break:break-all">${escapeHtml(input.ctaUrl)}</span></p>` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:18px 28px;border-top:1px solid #282a2e;background-color:#0c0d0f">
                      <p style="margin:0;font-size:10px;line-height:1.6;letter-spacing:.8px;color:#aeb1b6">IrisOS &nbsp;&middot;&nbsp; ENTERPRISE WORKSPACE MANAGEMENT</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 20px 0">
                <p style="margin:0;font-size:10px;line-height:1.5;color:#777b82">${escapeHtml(input.footerNote || 'Private, invitation-only access for modern operating teams.')}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function clientOnboardingEmail(input: {
  recipientName: string;
  organizationName: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const expiry = input.expiresAt.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
  return {
    subject: `Activate your ${input.organizationName} client portal`,
    html: irisInviteLayout({
      documentTitle: `Activate your ${input.organizationName} client portal`,
      eyebrow: 'Client invitation',
      title: `Welcome, ${input.recipientName}`,
      intro: `${input.organizationName} has invited you to activate your secure IrisOS client workspace.`,
      details: [{ label: 'Invitation expires', value: expiry }],
      ctaLabel: 'Activate client workspace',
      ctaUrl: input.inviteUrl,
      securityNote: 'This access link is unique to your email address. Do not forward it.',
    }),
    text: `Welcome, ${input.recipientName}.\n\n${input.organizationName} invited you to activate your IrisOS client workspace.\n\nActivate: ${input.inviteUrl}\n\nThis invitation expires ${expiry}.`,
  };
}

export function memberOnboardingEmail(input: {
  recipientName: string;
  organizationName: string;
  pageAccess: string[];
  handlesDeliverables: boolean;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const expiry = input.expiresAt.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
  const workspace = input.handlesDeliverables ? 'Team workspace' : 'Agency workspace';
  const access = input.pageAccess.length > 0 ? input.pageAccess.join(', ') : 'Standard delivery pages';
  return {
    subject: `Join ${input.organizationName} on IrisOS`,
    html: irisInviteLayout({
      documentTitle: `Join ${input.organizationName} on IrisOS`,
      eyebrow: 'Team invitation',
      title: `Your workspace is ready, ${input.recipientName}`,
      intro: `${input.organizationName} has invited you to join its IrisOS operating workspace.`,
      details: [
        { label: 'Workspace', value: workspace },
        { label: 'Page access', value: access },
        { label: 'Invitation expires', value: expiry },
      ],
      ctaLabel: 'Complete team onboarding',
      ctaUrl: input.inviteUrl,
      securityNote: 'This secure onboarding link is bound to the invited email address.',
    }),
    text: `Hello ${input.recipientName},\n\nJoin ${input.organizationName} on IrisOS.\nWorkspace: ${workspace}\nPage access: ${access}\n\nComplete onboarding: ${input.inviteUrl}\n\nThis invitation expires ${expiry}.`,
  };
}

export function meetingInvitationEmail(input: {
  meetingName: string;
  organizerName: string;
  organizationName: string;
  startTime: Date;
  endTime: Date;
  timeZone: string;
  meetUrl: string;
}) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: input.timeZone,
  });
  const start = formatter.format(input.startTime);
  const end = new Intl.DateTimeFormat('en-US', {
    timeStyle: 'short',
    timeZone: input.timeZone,
  }).format(input.endTime);

  return {
    subject: `Meeting invitation: ${input.meetingName}`,
    html: irisEmailLayout({
      eyebrow: 'Meeting invitation',
      title: input.meetingName,
      intro: `${input.organizerName} from ${input.organizationName} has invited you to a Google Meet.`,
      details: [
        { label: 'Starts', value: start },
        { label: 'Ends', value: `${end} (${input.timeZone})` },
      ],
      ctaLabel: 'Join Google Meet',
      ctaUrl: input.meetUrl,
      footer: 'A native Google Calendar invitation was also sent so you can respond and add this meeting to your calendar.',
    }),
    text: `${input.meetingName}\n\nOrganizer: ${input.organizerName}, ${input.organizationName}\nStarts: ${start}\nEnds: ${end} (${input.timeZone})\n\nJoin Google Meet: ${input.meetUrl}`,
  };
}

export function invoiceDeliveryEmail(input: {
  recipientName: string;
  organizationName: string;
  invoiceNumber: string;
  projectName: string;
  amount: string;
  dueDate?: string;
  downloadUrl: string;
  documentType?: 'INVOICE' | 'PROFORMA';
}) {
  const isProforma = input.documentType === 'PROFORMA';
  const documentLabel = isProforma ? 'Proforma invoice' : 'Tax invoice';
  return {
    subject: `${documentLabel} ${input.invoiceNumber} from ${input.organizationName}`,
    html: irisInviteLayout({
      documentTitle: `${documentLabel} ${input.invoiceNumber}`,
      eyebrow: isProforma ? 'Commercial proposal' : 'Project invoice',
      title: `${documentLabel} ${input.invoiceNumber}`,
      intro: `Hello ${input.recipientName}, ${input.organizationName} has issued ${isProforma ? 'a proforma invoice' : 'a tax invoice'} for ${input.projectName}. A PDF copy is attached to this email.`,
      details: [
        { label: isProforma ? 'Client' : 'Project', value: input.projectName },
        { label: isProforma ? 'Estimated total' : 'Amount due', value: input.amount },
        ...(input.dueDate ? [{ label: isProforma ? 'Valid until' : 'Due date', value: input.dueDate }] : []),
      ],
      ctaLabel: `Download ${isProforma ? 'proforma ' : ''}invoice PDF`,
      ctaUrl: input.downloadUrl,
      securityNote: 'The attached PDF is your document copy. The secure download link is intended for the named recipient.',
      badgeLabel: documentLabel,
      footerNote: `${documentLabel} generated securely by IrisOS. Keep this email for your billing records.`,
    }),
    text: `Hello ${input.recipientName},\n\n${input.organizationName} issued ${documentLabel.toLowerCase()} ${input.invoiceNumber} for ${input.projectName}.\n${isProforma ? 'Estimated total' : 'Amount due'}: ${input.amount}${input.dueDate ? `\n${isProforma ? 'Valid until' : 'Due date'}: ${input.dueDate}` : ''}\n\nDownload the PDF: ${input.downloadUrl}\n\nA PDF copy is also attached.`,
  };
}

export function authAccessEmail(input: {
  accessUrl: string;
  expiresAt: Date;
  isSignup: boolean;
}) {
  const expiry = input.expiresAt.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
  const title = input.isSignup ? 'Your early-access invitation is ready' : 'Authorize this device for IrisOS';
  return {
    subject: input.isSignup ? 'Your IrisOS early-access invitation' : 'Access IrisOS on this device',
    html: irisInviteLayout({
      documentTitle: title,
      eyebrow: input.isSignup ? 'Early access' : 'Secure access',
      title,
      intro: input.isSignup
        ? 'Your place on the IrisOS waitlist is ready. Authorize this browser to continue to workspace signup.'
        : 'A secure device-access link was requested for your IrisOS account.',
      details: [
        { label: 'Access type', value: input.isSignup ? 'Workspace signup' : 'Existing account' },
        { label: 'Link expires', value: expiry },
      ],
      ctaLabel: input.isSignup ? 'Continue to workspace signup' : 'Authorize this device',
      ctaUrl: input.accessUrl,
      securityNote: 'This single-use link authorizes the browser only. Your password or Google account is still required to sign in.',
      badgeLabel: 'Secure link',
      footerNote: 'If you did not request this message, ignore it. No account access has been granted.',
    }),
    text: `${title}\n\n${input.isSignup ? 'Your IrisOS waitlist place is ready.' : 'A secure device-access link was requested for your account.'}\n\nContinue: ${input.accessUrl}\n\nThis single-use link expires ${expiry}. Your account credentials are still required.`,
  };
}

export function teamOffboardingEmail(input: {
  recipientName: string;
  organizationName: string;
  administratorName: string;
  administratorEmail: string;
  feedback: string;
}) {
  const contactUrl = `mailto:${input.administratorEmail}`;
  return {
    subject: `Your access to ${input.organizationName} has been revoked`,
    html: irisInviteLayout({
      documentTitle: `Access revoked · ${input.organizationName}`,
      eyebrow: 'Access update',
      title: `Your workspace access has ended, ${input.recipientName}`,
      intro: `${input.organizationName} has revoked your IrisOS team access. Your workspace data and permissions are no longer available.`,
      details: [
        { label: 'Organization', value: input.organizationName },
        { label: 'Agency feedback', value: input.feedback },
      ],
      ctaLabel: 'Contact agency administrator',
      ctaUrl: contactUrl,
      securityNote: `Contact ${input.administratorName} if you believe this access change was made in error.`,
      badgeLabel: 'Access revoked',
      footerNote: 'This message confirms an access change made by your agency administrator.',
    }),
    text: `Hello ${input.recipientName},\n\n${input.organizationName} has revoked your IrisOS team access.\n\nFeedback from the agency:\n${input.feedback}\n\nContact ${input.administratorName} at ${input.administratorEmail} if you have questions.`,
  };
}

export function generatedDocumentDeliveryEmail(input: {
  recipientName: string;
  organizationName: string;
  documentTitle: string;
  documentNumber: string;
  documentLabel: string;
  signingUrl?: string;
  includesLinkedProforma?: boolean;
}) {
  return {
    subject: `${input.documentTitle} from IrisOS`,
    html: irisInviteLayout({
      documentTitle: input.documentTitle,
      eyebrow: 'Document delivery',
      title: input.documentTitle,
      intro: `Hello ${input.recipientName}, ${input.organizationName} has sent a ${input.documentLabel} for your review. The document files are attached.${input.includesLinkedProforma ? ' A linked proforma invoice is attached as well.' : ''}`,
      details: [
        { label: 'Document', value: input.documentLabel },
        { label: 'Reference', value: input.documentNumber },
      ],
      ...(input.signingUrl ? { ctaLabel: 'Review and sign document', ctaUrl: input.signingUrl } : {}),
      securityNote: input.signingUrl ? 'The secure signing link is intended only for the named recipient.' : 'Keep the attached files for your records.',
      badgeLabel: 'Secure document',
      footerNote: 'Document delivered securely through IrisOS.',
    }),
    text: `Hello ${input.recipientName},\n\n${input.organizationName} sent ${input.documentTitle} (${input.documentNumber}) for review. The document files are attached.${input.includesLinkedProforma ? ' A linked proforma invoice is attached as well.' : ''}${input.signingUrl ? `\n\nReview and sign securely: ${input.signingUrl}` : ''}`,
  };
}

export function helpRequestNotificationEmail(input: {
  type: string;
  name: string;
  email: string;
  subject: string;
  details: string;
  page: string;
}) {
  return {
    subject: `[IrisOS ${input.type.toLowerCase()}] ${input.subject}`,
    html: irisInviteLayout({
      documentTitle: input.subject,
      eyebrow: `${input.type} request`,
      title: input.subject,
      intro: input.details,
      details: [
        { label: 'Submitted by', value: `${input.name} · ${input.email}` },
        { label: 'Page', value: input.page || 'IrisOS' },
      ],
      ctaLabel: 'Reply to requester',
      ctaUrl: `mailto:${input.email}`,
      securityNote: 'This operational notification was generated from the IrisOS help form.',
      badgeLabel: input.type,
      footerNote: 'Internal IrisOS support notification.',
    }),
    text: `${input.name} (${input.email}) submitted a ${input.type.toLowerCase()} from ${input.page || 'IrisOS'}.\n\n${input.details}`,
  };
}

export function contactRequestNotificationEmail(input: {
  name: string;
  email: string;
  company?: string;
  topic: string;
  subject: string;
  message: string;
}) {
  return {
    subject: `[IrisOS contact] ${input.subject}`,
    html: irisInviteLayout({
      documentTitle: input.subject,
      eyebrow: 'Website contact',
      title: input.subject,
      intro: input.message,
      details: [
        { label: 'From', value: `${input.name} · ${input.email}` },
        { label: 'Company', value: input.company || 'Not provided' },
        { label: 'Topic', value: input.topic },
      ],
      ctaLabel: 'Reply to sender',
      ctaUrl: `mailto:${input.email}`,
      securityNote: 'This message was verified by Google reCAPTCHA before delivery.',
      badgeLabel: 'Contact',
      footerNote: 'IrisOS website contact notification.',
    }),
    text: `${input.name} (${input.email}) submitted an IrisOS contact request.\n\nCompany: ${input.company || 'Not provided'}\nTopic: ${input.topic}\nSubject: ${input.subject}\n\n${input.message}`,
  };
}

export function waitlistDailyReportEmail(input: { reportDate: string; entryCount: number }) {
  return {
    subject: `IrisOS waitlist — ${input.reportDate}`,
    html: irisInviteLayout({
      documentTitle: `Waitlist report · ${input.reportDate}`,
      eyebrow: 'Daily operations',
      title: 'Waitlist report is ready',
      intro: 'The latest IrisOS waitlist workbook is attached to this message.',
      details: [
        { label: 'Report date', value: input.reportDate },
        { label: 'Registrations', value: String(input.entryCount) },
      ],
      securityNote: 'This attachment contains registration details and should remain within the authorized IrisOS operations team.',
      badgeLabel: 'Internal report',
      footerNote: 'Automated IrisOS waitlist operations report.',
    }),
    text: `Attached is the IrisOS waitlist report for ${input.reportDate}. Total registrations: ${input.entryCount}.`,
  };
}

export const __testing = { escapeHtml };
