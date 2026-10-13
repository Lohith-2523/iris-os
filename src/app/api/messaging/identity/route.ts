import { NextRequest, NextResponse } from 'next/server';
import { readKey, readPrivateKey } from 'openpgp';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { decryptMessagingPrivateKey, encryptMessagingPrivateKey } from '@/lib/messaging/account-key-secrets';
import { getMessagingUser, messagingNoStoreHeaders } from '@/lib/messaging/server';

const accountKeySchema = z.object({
  identityPublicKey: z.string().startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----').max(200_000),
  identityPrivateKey: z.string().startsWith('-----BEGIN PGP PRIVATE KEY BLOCK-----').max(400_000),
  publicKeyFingerprint: z.string().regex(/^[a-fA-F0-9]{40,64}$/),
});

function accountKeyResponse(key: {
  id: string;
  deviceId: string;
  encryptedPrivateKey: string;
  publicKeyFingerprint: string;
  isPrimary: boolean;
  device: { identityPublicKey: string };
}) {
  return {
    id: key.id,
    deviceId: key.deviceId,
    identityPublicKey: key.device.identityPublicKey,
    identityPrivateKey: decryptMessagingPrivateKey(key.encryptedPrivateKey),
    publicKeyFingerprint: key.publicKeyFingerprint,
    isPrimary: key.isPrimary,
  };
}

export async function GET(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const keys = await prisma.messagingAccountKey.findMany({
    where: {
      userId: authorization.user.id,
      orgId: authorization.user.orgId,
      device: { revokedAt: null },
    },
    include: { device: { select: { identityPublicKey: true } } },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  const unreadableKeys: Array<{ id: string; deviceId: string }> = [];
  const readableKeys = keys.flatMap((key) => {
    try {
      return [accountKeyResponse(key)];
    } catch (error) {
      console.warn('Skipping an unreadable messaging account key during identity recovery.', {
        keyId: key.id,
        deviceId: key.deviceId,
        cause: error instanceof Error ? error.message : 'Unknown decryption error',
      });
      unreadableKeys.push({ id: key.id, deviceId: key.deviceId });
      return [];
    }
  });
  if (readableKeys.length > 0 && unreadableKeys.length > 0) {
    const promotedId = readableKeys.find((key) => key.isPrimary)?.id || readableKeys[0].id;
    const unreadableIds = unreadableKeys.map((key) => key.id);
    const unreadableDeviceIds = unreadableKeys.map((key) => key.deviceId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`messaging-account:${authorization.user.id}`}))`;
      await tx.messagingAccountKey.updateMany({
        where: { id: { in: unreadableIds }, userId: authorization.user.id },
        data: { isPrimary: false },
      });
      await tx.messagingDevice.updateMany({
        where: { id: { in: unreadableDeviceIds }, userId: authorization.user.id },
        data: { revokedAt: new Date() },
      });
      await tx.messagingAccountKey.update({
        where: { id: promotedId },
        data: { isPrimary: true },
      });
    });
    readableKeys.forEach((key, index) => {
      readableKeys[index] = { ...key, isPrimary: key.id === promotedId };
    });
  } else if (readableKeys.length > 0 && !readableKeys.some((key) => key.isPrimary)) {
    readableKeys[0] = { ...readableKeys[0], isPrimary: true };
  }
  return NextResponse.json({ keys: readableKeys }, { headers: messagingNoStoreHeaders() });
}

export async function POST(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });

  const body = await request.json().catch(() => null);
  const parsed = accountKeySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid account messaging key.' }, { status: 400 });

  const fingerprint = parsed.data.publicKeyFingerprint.toUpperCase();
  try {
    const [publicKey, privateKey] = await Promise.all([
      readKey({ armoredKey: parsed.data.identityPublicKey }),
      readPrivateKey({ armoredKey: parsed.data.identityPrivateKey }),
    ]);
    if (publicKey.isPrivate()
      || publicKey.getFingerprint().toUpperCase() !== fingerprint
      || privateKey.getFingerprint().toUpperCase() !== fingerprint) {
      return NextResponse.json({ error: 'OpenPGP account key fingerprint does not match.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Malformed OpenPGP account key.' }, { status: 400 });
  }

  const encryptedPrivateKey = encryptMessagingPrivateKey(parsed.data.identityPrivateKey);
  const key = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`messaging-account:${authorization.user.id}`}))`;
    const existingPrimary = await tx.messagingAccountKey.findFirst({
      where: { userId: authorization.user.id, isPrimary: true },
      select: { id: true },
    });
    const device = await tx.messagingDevice.upsert({
      where: { userId_publicKeyFingerprint: { userId: authorization.user.id, publicKeyFingerprint: fingerprint } },
      create: {
        orgId: authorization.user.orgId,
        userId: authorization.user.id,
        deviceLabel: 'Account encryption key',
        identityPublicKey: parsed.data.identityPublicKey,
        publicKeyFingerprint: fingerprint,
        protocolVersion: 1,
      },
      update: {
        identityPublicKey: parsed.data.identityPublicKey,
        lastSeenAt: new Date(),
        revokedAt: null,
      },
      select: { id: true },
    });
    return tx.messagingAccountKey.upsert({
      where: { userId_publicKeyFingerprint: { userId: authorization.user.id, publicKeyFingerprint: fingerprint } },
      create: {
        orgId: authorization.user.orgId,
        userId: authorization.user.id,
        deviceId: device.id,
        encryptedPrivateKey,
        publicKeyFingerprint: fingerprint,
        isPrimary: !existingPrimary,
      },
      update: { encryptedPrivateKey },
      include: { device: { select: { identityPublicKey: true } } },
    });
  });

  return NextResponse.json({ key: accountKeyResponse(key) }, { status: 201, headers: messagingNoStoreHeaders() });
}
