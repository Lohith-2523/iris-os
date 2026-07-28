import 'server-only';

import { createHash } from 'node:crypto';
import nodemailer, { type Transporter } from 'nodemailer';

export const IRIS_EMAIL_FROM = 'Iris OS <noreply@irisos.app>';

export class IrisEmailDeliveryError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'IrisEmailDeliveryError';
  }
}

type SendIrisEmailInput = {
  to: string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  tags?: Array<{ name: string; value: string }>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  requireTls: boolean;
  user?: string;
  password?: string;
};

let transporter: Transporter | null = null;
let transporterKey = '';

function smtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim();
  const rawPort = process.env.SMTP_PORT?.trim();
  const secure = process.env.SMTP_SECURE?.trim().toLowerCase() === 'true';
  const requireTls = process.env.SMTP_REQUIRE_TLS?.trim().toLowerCase() !== 'false';
  const port = rawPort ? Number(rawPort) : (secure ? 465 : 587);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;

  if (!host) {
    throw new IrisEmailDeliveryError(
      'Transactional email is not configured. Set SMTP_HOST and the appropriate Google SMTP credentials.',
      503,
    );
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new IrisEmailDeliveryError('SMTP_PORT must be a valid TCP port.', 503);
  }
  if (Boolean(user) !== Boolean(password)) {
    throw new IrisEmailDeliveryError(
      'SMTP_USER and SMTP_PASSWORD must either both be set or both be omitted for an IP-authorized relay.',
      503,
    );
  }

  return { host, port, secure, requireTls, user, password };
}

function smtpTransport(config: SmtpConfig) {
  const key = JSON.stringify([
    config.host,
    config.port,
    config.secure,
    config.requireTls,
    config.user || '',
    config.password || '',
  ]);
  if (transporter && transporterKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTls,
    auth: config.user && config.password
      ? { user: config.user, pass: config.password }
      : undefined,
    pool: true,
    maxConnections: 3,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    tls: {
      minVersion: 'TLSv1.2',
      servername: config.host,
      rejectUnauthorized: true,
    },
  });
  transporterKey = key;
  return transporter;
}

export function assertIrisEmailConfigured() {
  smtpConfig();
}

function normalizedRecipients(recipients: string[]) {
  return Array.from(new Set(
    recipients
      .map((email) => email.trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  ));
}

export async function sendIrisEmail(input: SendIrisEmailInput) {
  const config = smtpConfig();
  const to = normalizedRecipients(input.to);
  if (to.length === 0) {
    throw new IrisEmailDeliveryError('At least one valid email recipient is required.', 400);
  }
  if (to.length > 50) {
    throw new IrisEmailDeliveryError('A maximum of 50 email recipients is supported per message.', 400);
  }

  const messageIdToken = createHash('sha256')
    .update(input.idempotencyKey)
    .digest('hex');

  try {
    const info = await smtpTransport(config).sendMail({
      from: IRIS_EMAIL_FROM,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      messageId: `<${messageIdToken}@irisos.app>`,
      attachments: input.attachments,
      headers: input.tags?.length
        ? { 'X-Iris-Tags': input.tags.map((tag) => `${tag.name}=${tag.value}`).join(',') }
        : undefined,
    });

    if (!info.messageId || !info.accepted?.length || info.rejected?.length) {
      throw new Error('SMTP server did not accept every recipient.');
    }
    return {
      id: info.messageId,
      recipients: to,
      accepted: (info.accepted || []).map(String),
      rejected: (info.rejected || []).map(String),
    };
  } catch (error) {
    const smtpError = error as {
      code?: string;
      responseCode?: number;
      command?: string;
    };
    console.error(
      'Iris SMTP delivery failed:',
      smtpError.code || 'SMTP_ERROR',
      smtpError.responseCode || '',
      smtpError.command || '',
    );
    throw new IrisEmailDeliveryError(
      'Google SMTP could not deliver this message. Check the SMTP host, authentication, relay permissions, and noreply@irisos.app sender authorization.',
      502,
    );
  }
}
