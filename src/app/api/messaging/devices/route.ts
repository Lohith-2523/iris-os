import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getMessagingUser, isAllowedDirectPair, messagingNoStoreHeaders } from '@/lib/messaging/server';
import { readKey } from 'openpgp';

const deviceSchema = z.object({
  deviceLabel: z.string().trim().min(1).max(80),
  identityPublicKey: z.string().startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----').max(200_000),
  publicKeyFingerprint: z.string().regex(/^[a-fA-F0-9]{40,64}$/),
  protocolVersion: z.number().int().min(1).max(10).default(1),
});

export async function GET(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const userId = request.nextUrl.searchParams.get('userId') || authorization.user.id;
  const target = await prisma.user.findFirst({
    where: { id: userId, orgId: authorization.user.orgId },
    select: { id: true, role: true },
  });
  if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  if (target.id !== authorization.user.id && !isAllowedDirectPair(authorization.user.role, target.role)) {
    return NextResponse.json({ error: 'Device key access is limited to an authorized direct participant.' }, { status: 403 });
  }
  const devices = await prisma.messagingDevice.findMany({
    where: { userId, orgId: authorization.user.orgId },
    select: {
      id: true,
      userId: true,
      deviceLabel: true,
      identityPublicKey: true,
      publicKeyFingerprint: true,
      protocolVersion: true,
      revokedAt: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ devices }, { headers: messagingNoStoreHeaders() });
}

export async function POST(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const parsed = deviceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid public device key bundle.' }, { status: 400 });
  let publicKey;
  try {
    publicKey = await readKey({ armoredKey: parsed.data.identityPublicKey });
  } catch {
    return NextResponse.json({ error: 'Malformed OpenPGP public device key.' }, { status: 400 });
  }
  if (publicKey.isPrivate() || publicKey.getFingerprint().toUpperCase() !== parsed.data.publicKeyFingerprint.toUpperCase()) {
    return NextResponse.json({ error: 'OpenPGP public key fingerprint does not match.' }, { status: 400 });
  }
  const device = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`messaging-device:${authorization.user.id}`}))`;
    const fingerprint = parsed.data.publicKeyFingerprint.toUpperCase();
    const existing = await tx.messagingDevice.findUnique({
      where: { userId_publicKeyFingerprint: { userId: authorization.user.id, publicKeyFingerprint: fingerprint } },
      select: { id: true },
    });
    if (!existing) {
      const activeDeviceCount = await tx.messagingDevice.count({
        where: { userId: authorization.user.id, revokedAt: null },
      });
      if (activeDeviceCount >= 10) throw new Error('ACTIVE_DEVICE_LIMIT');
    }
    return tx.messagingDevice.upsert({
      where: { userId_publicKeyFingerprint: { userId: authorization.user.id, publicKeyFingerprint: fingerprint } },
      create: { ...parsed.data, publicKeyFingerprint: fingerprint, orgId: authorization.user.orgId, userId: authorization.user.id },
      update: { deviceLabel: parsed.data.deviceLabel, lastSeenAt: new Date(), revokedAt: null },
      select: { id: true, deviceLabel: true, protocolVersion: true, createdAt: true },
    });
  }).catch((error) => {
    if (error instanceof Error && error.message === 'ACTIVE_DEVICE_LIMIT') return null;
    throw error;
  });
  if (!device) return NextResponse.json({ error: 'A user can register up to 10 active secure devices.' }, { status: 409 });
  return NextResponse.json({ device }, { status: 201, headers: messagingNoStoreHeaders() });
}
