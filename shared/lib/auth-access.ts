import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { sendIrisEmail } from '@/lib/email/iris-email';
import { authAccessEmail } from '@/lib/email/iris-templates';
import { createDeviceAccessCookieValue, verifyDeviceAccessCookieValue } from '@/lib/auth-access-cookie';

export const WAITLIST_SIGNUP_PURPOSE = 'WAITLIST_SIGNUP';
export const ACCOUNT_LOGIN_PURPOSE = 'ACCOUNT_LOGIN';
export const ADMIN_DIRECT_ACCESS_PURPOSE = 'ADMIN_DIRECT_ACCESS';
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const DEVICE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
const STALE_LOCK_MS = 15 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function rawToken() {
  return randomBytes(32).toString('base64url');
}

function directAccessEncryptionKey() {
  const secret = process.env.AUTH_ACCESS_SECRET;
  if (!secret || secret.length < 24) throw new Error('AUTH_ACCESS_SECRET must contain at least 24 characters.');
  return createHash('sha256').update(`admin-direct-access:${secret}`).digest();
}

function encryptDirectAccessToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', directAccessEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((value) => value.toString('base64url')).join('.');
}

function decryptDirectAccessToken(value: string) {
  const [ivValue, tagValue, ciphertextValue] = value.split('.');
  if (!ivValue || !tagValue || !ciphertextValue) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', directAccessEncryptionKey(), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function configuredAppUrl() {
  return (process.env.APP_URL || 'https://irisos.app').trim().replace(/\/+$/, '');
}

export async function createAdminDirectAccessLink(
  baseUrl = configuredAppUrl(),
  now = new Date(),
) {
  const token = rawToken();
  const record = await prisma.authAccessToken.create({
    data: {
      email: null,
      purpose: ADMIN_DIRECT_ACCESS_PURPOSE,
      status: 'SENT',
      tokenHash: hashToken(token),
      tokenCiphertext: encryptDirectAccessToken(token),
      scheduledAt: now,
      expiresAt: null,
      sentAt: now,
    },
  });
  const accessUrl = new URL('/access', baseUrl);
  accessUrl.searchParams.set('token', token);
  return { id: record.id, accessUrl: accessUrl.toString() };
}

export function adminDirectAccessUrl(tokenCiphertext: string | null | undefined, baseUrl = configuredAppUrl()) {
  if (!tokenCiphertext) return null;
  const token = decryptDirectAccessToken(tokenCiphertext);
  if (!token) return null;
  const accessUrl = new URL('/access', baseUrl);
  accessUrl.searchParams.set('token', token);
  return accessUrl.toString();
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
  if (!record.email) throw new Error('Email-bound access token is missing its recipient.');
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
  const isDirectAccess = record?.purpose === ADMIN_DIRECT_ACCESS_PURPOSE;
  if (!record || record.status !== 'SENT' || (!isDirectAccess && (!record.expiresAt || record.expiresAt <= now || record.redeemedAt))) return null;
  const grantToken = rawToken();
  const expiresAt = new Date(now.getTime() + DEVICE_LIFETIME_MS);
  const result = isDirectAccess
    ? await prisma.deviceAccessGrant.create({
        data: { tokenHash: hashToken(grantToken), email: record.email, authUserId: record.authUserId, expiresAt, sourceTokenId: record.id },
      })
    : await prisma.$transaction(async tx => {
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
    cookieValue: createDeviceAccessCookieValue(
      result.id,
      grantToken,
      expiresAt,
      record.purpose === ADMIN_DIRECT_ACCESS_PURPOSE ? 'HOME' : 'ASK',
    ),
  };
}

export async function isAdminDirectAccessGrant(grant: { sourceTokenId?: string | null }) {
  if (!grant.sourceTokenId) return false;
  return Boolean(await prisma.authAccessToken.findFirst({
    where: { id: grant.sourceTokenId, purpose: ADMIN_DIRECT_ACCESS_PURPOSE },
    select: { id: true },
  }));
}

export async function validateDeviceAccess(cookieValue: string | null | undefined, email?: string, now = new Date()) {
  const parsed = verifyDeviceAccessCookieValue(cookieValue, now);
  if (!parsed) return null;
  const grant = await prisma.deviceAccessGrant.findUnique({ where: { id: parsed.grantId } });
  if (!grant || grant.revokedAt || grant.expiresAt <= now || grant.tokenHash !== hashToken(parsed.rawToken)) return null;
  if (email && grant.email && grant.email !== email.trim().toLowerCase()) return null;
  await prisma.deviceAccessGrant.update({ where: { id: grant.id }, data: { lastUsedAt: now } });
  return grant;
}

export async function ensureDeviceAccessForUser(
  cookieValue: string | null | undefined,
  user: { id: string; email: string },
  now = new Date(),
) {
  const normalizedEmail = user.email.trim().toLowerCase();
  const parsed = verifyDeviceAccessCookieValue(cookieValue, now);
  const existingGrant = parsed ? await validateDeviceAccess(cookieValue, normalizedEmail, now) : null;

  if (parsed && existingGrant && (!existingGrant.authUserId || existingGrant.authUserId === user.id)) {
    if (!existingGrant.authUserId) {
      await prisma.deviceAccessGrant.update({ where: { id: existingGrant.id }, data: { authUserId: user.id } });
    }
    return {
      cookieValue: createDeviceAccessCookieValue(
        existingGrant.id,
        parsed.rawToken,
        parsed.expiresAt,
        parsed.landingPreference,
      ),
      expiresAt: parsed.expiresAt,
      created: false,
    };
  }

  const rawGrantToken = rawToken();
  const expiresAt = new Date(now.getTime() + DEVICE_LIFETIME_MS);
  const grant = await prisma.deviceAccessGrant.create({
    data: {
      tokenHash: hashToken(rawGrantToken),
      email: normalizedEmail,
      authUserId: user.id,
      expiresAt,
    },
  });
  return {
    cookieValue: createDeviceAccessCookieValue(grant.id, rawGrantToken, expiresAt),
    expiresAt,
    created: true,
  };
}

export async function bindDeviceGrantToAuthUser(cookieValue: string | null | undefined, authUserId: string, email: string) {
  const grant = await validateDeviceAccess(cookieValue, email);
  if (!grant) return false;
  const normalizedEmail = email.trim().toLowerCase();
  if (grant.sourceTokenId) {
    const token = await prisma.authAccessToken.findFirst({ where: { id: grant.sourceTokenId, purpose: ADMIN_DIRECT_ACCESS_PURPOSE } });
    if (token?.authUserId && token.authUserId !== authUserId) return false;
    if (token) {
      const bound = await prisma.authAccessToken.updateMany({
        where: { id: token.id, OR: [{ authUserId: null }, { authUserId }] },
        data: { authUserId, email: normalizedEmail },
      });
      if (bound.count !== 1) return false;
      await prisma.deviceAccessGrant.updateMany({
        where: { sourceTokenId: token.id, id: { not: grant.id }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }
  await prisma.deviceAccessGrant.update({ where: { id: grant.id }, data: { authUserId, email: normalizedEmail } });
  return true;
}

export async function completeAdminDirectAccessForAuthUser(authUserId: string | null | undefined, now = new Date()) {
  if (!authUserId) return;
  const tokens = await prisma.authAccessToken.findMany({
    where: { authUserId, purpose: ADMIN_DIRECT_ACCESS_PURPOSE, status: 'SENT' },
    select: { id: true },
  });
  if (!tokens.length) return;
  const tokenIds = tokens.map((token) => token.id);
  await prisma.$transaction([
    prisma.authAccessToken.updateMany({
      where: { id: { in: tokenIds } },
      data: { status: 'COMPLETED', tokenCiphertext: null, redeemedAt: now },
    }),
    prisma.deviceAccessGrant.updateMany({
      where: { sourceTokenId: { in: tokenIds }, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);
}

export async function hasApprovedSignup(authUserId: string, email: string) {
  return Boolean(await prisma.deviceAccessGrant.findFirst({
    where: { authUserId, email: email.trim().toLowerCase(), revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  }));
}
