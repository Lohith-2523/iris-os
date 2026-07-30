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
                <div style="font-size:18px;font-weight:700;letter-spacing:.12em;color:#ffffff">IRIS OS</div>
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
  ctaLabel: string;
  ctaUrl: string;
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
                <img src="https://irisos.app/iris-logo-white-bg.png" width="132" alt="Iris OS" style="display:block;width:132px;max-width:100%;height:auto;border:0">
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
                          <td align="right" style="padding:13px 16px;${index < input.details.length - 1 ? 'border-bottom:1px solid #34363a;' : ''}font-size:12px;font-weight:700;color:#ffffff">${escapeHtml(value)}</td>
                        </tr>`).join('')}
                      </table>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px">
                        <tr>
                          <td align="center" style="border:1px solid #ffffff;border-radius:11px;background-color:#ffffff;box-shadow:0 6px 18px rgba(255,255,255,.14)">
                            <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:15px 24px;border-radius:11px;color:#090a0c;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.1px">${escapeHtml(input.ctaLabel)}</a>
                          </td>
                        </tr>
                      </table>
                      <div style="height:1px;margin:0 0 21px;background-color:#34363a"></div>
                      <p style="margin:0 0 14px;font-size:12px;line-height:1.65;color:#aeb1b6">${escapeHtml(input.securityNote)}</p>
                      <p style="margin:0;font-size:11px;line-height:1.55;color:#777b82">If the button does not open, copy this secure link:<br><span style="color:#c7c9cd;word-break:break-all">${escapeHtml(input.ctaUrl)}</span></p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:18px 28px;border-top:1px solid #282a2e;background-color:#0c0d0f">
                      <p style="margin:0;font-size:10px;line-height:1.6;letter-spacing:.8px;color:#aeb1b6">IRIS OS &nbsp;&middot;&nbsp; ENTERPRISE WORKSPACE MANAGEMENT</p>
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
      intro: `${input.organizationName} has invited you to activate your secure Iris OS client workspace.`,
      details: [{ label: 'Invitation expires', value: expiry }],
      ctaLabel: 'Activate client workspace',
      ctaUrl: input.inviteUrl,
      securityNote: 'This access link is unique to your email address. Do not forward it.',
    }),
    text: `Welcome, ${input.recipientName}.\n\n${input.organizationName} invited you to activate your Iris OS client workspace.\n\nActivate: ${input.inviteUrl}\n\nThis invitation expires ${expiry}.`,
  };
}

export function memberOnboardingEmail(input: {
  recipientName: string;
  organizationName: string;
  agencyTypes: string[];
  inviteUrl: string;
  expiresAt: Date;
}) {
  const expiry = input.expiresAt.toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' });
  return {
    subject: `Join ${input.organizationName} on Iris OS`,
    html: irisInviteLayout({
      documentTitle: `Join ${input.organizationName} on Iris OS`,
      eyebrow: 'Team invitation',
      title: `Your workspace is ready, ${input.recipientName}`,
      intro: `${input.organizationName} has invited you to join its Iris OS operating workspace.`,
      details: [
        { label: 'Disciplines', value: input.agencyTypes.join(', ') },
        { label: 'Invitation expires', value: expiry },
      ],
      ctaLabel: 'Complete team onboarding',
      ctaUrl: input.inviteUrl,
      securityNote: 'This secure onboarding link is bound to the invited email address.',
    }),
    text: `Hello ${input.recipientName},\n\nJoin ${input.organizationName} on Iris OS.\nDisciplines: ${input.agencyTypes.join(', ')}\n\nComplete onboarding: ${input.inviteUrl}\n\nThis invitation expires ${expiry}.`,
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
      footerNote: `${documentLabel} generated securely by Iris OS. Keep this email for your billing records.`,
    }),
    text: `Hello ${input.recipientName},\n\n${input.organizationName} issued ${documentLabel.toLowerCase()} ${input.invoiceNumber} for ${input.projectName}.\n${isProforma ? 'Estimated total' : 'Amount due'}: ${input.amount}${input.dueDate ? `\n${isProforma ? 'Valid until' : 'Due date'}: ${input.dueDate}` : ''}\n\nDownload the PDF: ${input.downloadUrl}\n\nA PDF copy is also attached.`,
  };
}

export const __testing = { escapeHtml };
