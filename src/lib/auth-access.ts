import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { sendIrisEmail } from '@/lib/email/iris-email';
import { authAccessEmail } from '@/lib/email/iris-templates';
import { createDeviceAccessCookieValue, verifyDeviceAccessCookieValue } from '@/lib/auth-access-cookie';

export const WAITLIST_SIGNUP_PURPOSE = 'WAITLIST_SIGNUP';
export const ACCOUNT_LOGIN_PURPOSE = 'ACCOUNT_LOGIN';
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const DEVICE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
const STALE_LOCK_MS = 15 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function rawToken() {
  return randomBytes(32).toString('base64url');
}

export function configuredAppUrl() {
  return (process.env.APP_URL || 'https://irisos.app').trim().replace(/\/+$/, '');
}

export async function scheduleWaitlistInvitation(waitlistEntry: { id: string; email: string }, now = new Date()) {
  // The daily delivery run picks this up on its first pass after 24 hours,
  // keeping delivery within the promised 24–48 hour window.
  const scheduledAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return prisma.authAccessToken.upsert({
    where: { dedupeKey: `waitlist:${waitlistEntry.id}` },
    create: {
      email: waitlistEntry.email,
      purpose: WAITLIST_SIGNUP_PURPOSE,
      dedupeKey: `waitlist:${waitlistEntry.id}`,
      waitlistEntryId: waitlistEntry.id,
      scheduledAt,
    },
    update: {},
  });
}

export async function deliverAuthAccessToken(id: string, baseUrl = configuredAppUrl(), now = new Date()) {
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  const claimed = await prisma.authAccessToken.updateMany({
    where: {
      id,
      scheduledAt: { lte: now },
      OR: [
        { status: { in: ['PENDING', 'FAILED'] } },
        { status: 'SENDING', lockedAt: { lt: staleBefore } },
      ],
    },
    data: { status: 'SENDING', lockedAt: now, lastError: null, attemptCount: { increment: 1 } },
  });
  if (claimed.count === 0) return { sent: false as const };

  const record = await prisma.authAccessToken.findUniqueOrThrow({ where: { id } });
  const token = rawToken();
  const expiresAt = new Date(now.getTime() + INVITE_LIFETIME_MS);
  await prisma.authAccessToken.update({ where: { id }, data: { tokenHash: hashToken(token), expiresAt } });
  const accessUrl = new URL('/access', baseUrl);
  accessUrl.searchParams.set('token', token);
  const isSignup = record.purpose === WAITLIST_SIGNUP_PURPOSE;
  const email = authAccessEmail({ accessUrl: accessUrl.toString(), expiresAt, isSignup });

  try {
    const delivery = await sendIrisEmail({
      to: [record.email],
      subject: email.subject,
      text: email.text,
      html: email.html,
      idempotencyKey: `auth-access:${record.id}:${record.attemptCount + 1}`,
      tags: [{ name: 'category', value: isSignup ? 'waitlist-invitation' : 'account-device-access' }],
    });
    await prisma.authAccessToken.update({ where: { id }, data: { status: 'SENT', sentAt: new Date(), lockedAt: null, lastError: null } });
    return { sent: true as const, messageId: delivery.id };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : 'Email delivery failed';
    await prisma.authAccessToken.update({ where: { id }, data: { status: 'FAILED', lockedAt: null, lastError: message } });
    throw error;
  }
}

export async function sendDueWaitlistInvitations(now = new Date()) {
  await prisma.authAccessToken.updateMany({
    where: { status: 'SENT', expiresAt: { lte: now } },
    data: { status: 'EXPIRED' },
  });
  const retentionCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  await prisma.deviceAccessGrant.deleteMany({
    where: { OR: [{ expiresAt: { lt: retentionCutoff } }, { revokedAt: { lt: retentionCutoff } }] },
  });
  await prisma.authAccessToken.deleteMany({
    where: { status: { in: ['REDEEMED', 'EXPIRED'] }, updatedAt: { lt: retentionCutoff } },
  });
  // Invitations created before the daily schedule was introduced may have a
  // randomized due time. Make them eligible after 24 hours so none drift past
  // the original 48-hour delivery promise while the new cadence takes effect.
  await prisma.authAccessToken.updateMany({
    where: {
      purpose: WAITLIST_SIGNUP_PURPOSE,
      status: 'PENDING',
      createdAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      scheduledAt: { gt: now },
    },
    data: { scheduledAt: now },
  });
  const due = await prisma.authAccessToken.findMany({
    where: { purpose: WAITLIST_SIGNUP_PURPOSE, scheduledAt: { lte: now }, status: { in: ['PENDING', 'FAILED', 'SENDING'] } },
    orderBy: { scheduledAt: 'asc' },
    take: 50,
    select: { id: true },
  });
  let sent = 0;
  let failed = 0;
  for (const record of due) {
    try {
      if ((await deliverAuthAccessToken(record.id, configuredAppUrl(), now)).sent) sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { processed: due.length, sent, failed };
}

export async function requestExistingAccountAccess(email: string, now = new Date()) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (!user) return;
  const recentRequests = await prisma.authAccessToken.count({
    where: { email: normalizedEmail, purpose: ACCOUNT_LOGIN_PURPOSE, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
  });
  if (recentRequests >= 3) return;
  const record = await prisma.authAccessToken.create({
    data: { email: normalizedEmail, purpose: ACCOUNT_LOGIN_PURPOSE, scheduledAt: now },
  });
  await deliverAuthAccessToken(record.id, configuredAppUrl(), now);
}

export async function redeemAuthAccessToken(token: string, now = new Date()) {
  const record = await prisma.authAccessToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.status !== 'SENT' || !record.expiresAt || record.expiresAt <= now || record.redeemedAt) return null;
  const grantToken = rawToken();
  const expiresAt = new Date(now.getTime() + DEVICE_LIFETIME_MS);
  const result = await prisma.$transaction(async tx => {
    const consumed = await tx.authAccessToken.updateMany({
      where: { id: record.id, status: 'SENT', redeemedAt: null, expiresAt: { gt: now } },
      data: { status: 'REDEEMED', redeemedAt: now },
    });
    if (consumed.count !== 1) return null;
    return tx.deviceAccessGrant.create({
      data: { tokenHash: hashToken(grantToken), email: record.email, expiresAt, sourceTokenId: record.id },
    });
  });
  if (!result) return null;
  return {
    email: record.email,
    purpose: record.purpose,
    cookieValue: createDeviceAccessCookieValue(result.id, grantToken, expiresAt),
  };
}

export async function validateDeviceAccess(cookieValue: string | null | undefined, email?: string, now = new Date()) {
  const parsed = verifyDeviceAccessCookieValue(cookieValue, now);
  if (!parsed) return null;
  const grant = await prisma.deviceAccessGrant.findUnique({ where: { id: parsed.grantId } });
  if (!grant || grant.revokedAt || grant.expiresAt <= now || grant.tokenHash !== hashToken(parsed.rawToken)) return null;
  if (email && grant.email !== email.trim().toLowerCase()) return null;
  await prisma.deviceAccessGrant.update({ where: { id: grant.id }, data: { lastUsedAt: now } });
  return grant;
}

export async function bindDeviceGrantToAuthUser(cookieValue: string | null | undefined, authUserId: string, email: string) {
  const grant = await validateDeviceAccess(cookieValue, email);
  if (!grant) return false;
  await prisma.deviceAccessGrant.update({ where: { id: grant.id }, data: { authUserId } });
  return true;
}

export async function hasApprovedSignup(authUserId: string, email: string) {
  return Boolean(await prisma.deviceAccessGrant.findFirst({
    where: { authUserId, email: email.trim().toLowerCase(), revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  }));
}
