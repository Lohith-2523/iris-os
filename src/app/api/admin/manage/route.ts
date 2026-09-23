import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSuperadmin } from '@/server/admin/auth';
import { hashManagedCoupon } from '@/server/admin/managed-coupons';
import { isIrisAdminEmail, SUPERADMIN_OWNER_EMAIL } from '@/admin/policy';
import { validateProfileAvatarDataUrl } from '@/lib/profile-avatar';
import { createClient } from '@/lib/server';
import { createAdminDirectAccessLink } from '@/lib/auth-access';

const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('invite'), email: z.string().email(), role: z.enum(['VIEWER', 'EDITOR']), expiresInDays: z.number().int().min(1).max(30) }),
  z.object({ action: z.literal('revoke-admin'), email: z.string().email() }),
  z.object({ action: z.literal('create-user-access-link'), email: z.string().email().max(254), expiresInDays: z.number().int().min(1).max(30) }),
  z.object({ action: z.literal('create-coupon'), code: z.string().trim().min(4).max(64), label: z.string().trim().min(2).max(80), plan: z.enum(['ANY', 'PRO', 'ADVANCED']), startsAt: z.string().datetime(), endsAt: z.string().datetime().nullable(), maxUses: z.number().int().positive().nullable() }),
  z.object({ action: z.literal('update-coupon'), id: z.string().min(1).max(80), enabled: z.boolean(), label: z.string().trim().min(2).max(80), plan: z.enum(['ANY', 'PRO', 'ADVANCED']), startsAt: z.string().datetime(), endsAt: z.string().datetime().nullable(), maxUses: z.number().int().positive().nullable(), code: z.string().trim().min(4).max(64).optional() }),
  z.object({ action: z.literal('support-status'), id: z.string(), status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']) }),
  z.object({ action: z.literal('incident-status'), id: z.string().uuid(), status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED']) }),
  z.object({ action: z.literal('update-profile'), name: z.string().trim().min(1).max(80), avatarDataUrl: z.string().nullable() }),
]);

export async function POST(request: Request) {
  const admin = await getSuperadmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const input = parsed.data;
  if (admin.role === 'VIEWER' && input.action !== 'update-profile') return NextResponse.json({ error: 'Read-only access' }, { status: 403 });

  if (input.action === 'create-user-access-link') {
    const link = await createAdminDirectAccessLink(input.email, input.expiresInDays);
    return NextResponse.json({ ok: true, email: link.email, accessUrl: link.accessUrl, expiresAt: link.expiresAt.toISOString() });
  } else if (input.action === 'update-profile') {
    const avatarResult = input.avatarDataUrl === admin.avatarUrl
      ? { value: admin.avatarUrl }
      : validateProfileAvatarDataUrl(input.avatarDataUrl);
    if ('error' in avatarResult) return NextResponse.json({ error: avatarResult.error }, { status: 400 });
    const { error } = await (await createClient()).auth.updateUser({ data: { full_name: input.name, avatar_url: avatarResult.value } });
    if (error) return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 });
  } else if (input.action === 'invite') {
    if (admin.role !== 'OWNER') return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    const email = input.email.trim().toLowerCase();
    if (!isIrisAdminEmail(email) || email === SUPERADMIN_OWNER_EMAIL) return NextResponse.json({ error: 'Enter another @irisos.app address' }, { status: 400 });
    await prisma.adminAccess.upsert({
      where: { email },
      create: { email, role: input.role, invitedBy: admin.email, expiresAt: new Date(Date.now() + input.expiresInDays * 86400000) },
      update: { role: input.role, invitedBy: admin.email, expiresAt: new Date(Date.now() + input.expiresInDays * 86400000), revokedAt: null, acceptedAt: null },
    });
  } else if (input.action === 'revoke-admin') {
    if (admin.role !== 'OWNER') return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    await prisma.adminAccess.updateMany({ where: { email: input.email.trim().toLowerCase() }, data: { revokedAt: new Date() } });
  } else if (input.action === 'create-coupon') {
    const hashed = hashManagedCoupon(input.code);
    await prisma.managedCoupon.create({ data: { label: input.label, codeSalt: hashed.salt, codeDigest: hashed.digest, codeHint: `••••${input.code.slice(-4)}`, plan: input.plan, startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : null, maxUses: input.maxUses } });
  } else if (input.action === 'update-coupon') {
    const hashed = input.code ? hashManagedCoupon(input.code) : null;
    await prisma.managedCoupon.update({ where: { id: input.id }, data: { label: input.label, enabled: input.enabled, plan: input.plan, startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : null, maxUses: input.maxUses, ...(hashed ? { codeSalt: hashed.salt, codeDigest: hashed.digest, codeHint: `••••${input.code!.slice(-4)}` } : {}) } });
  } else if (input.action === 'support-status') {
    await prisma.helpRequest.update({ where: { id: input.id }, data: { status: input.status } });
  } else {
    await prisma.backendIncident.update({ where: { id: input.id }, data: { status: input.status } });
  }
  return NextResponse.json({ ok: true });
}
