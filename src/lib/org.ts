import 'server-only';

import type { User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from './db';
import { createClient } from './server';

const userWithWorkspace = {
  organization: {
    include: {
      onboardingState: true,
    },
  },
  client: true,
  preferences: true,
} as const;

export async function getAuthenticatedIdentity(): Promise<SupabaseUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  return data.user;
}

export async function getRequestUser(_request?: unknown) {
  void _request;
  const identity = await getAuthenticatedIdentity();
  if (!identity?.email) return null;

  const normalizedEmail = identity.email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { authUserId: identity.id },
        {
          authUserId: null,
          email: { equals: normalizedEmail, mode: 'insensitive' },
        },
      ],
    },
    include: userWithWorkspace,
  });

  if (!user) return null;

  // Bind legacy rows to the verified auth subject once, then use that immutable
  // provider identifier for subsequent identity resolution.
  if (!user.authUserId) {
    return prisma.user.update({
      where: { id: user.id },
      data: { authUserId: identity.id, email: normalizedEmail },
      include: userWithWorkspace,
    });
  }

  return user;
}

export async function provisionAuthenticatedUser(identity: SupabaseUser) {
  if (!identity.email) throw new Error('Authenticated user is missing an email address.');

  const normalizedEmail = identity.email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { authUserId: identity.id },
        {
          authUserId: null,
          email: { equals: normalizedEmail, mode: 'insensitive' },
        },
      ],
    },
    include: userWithWorkspace,
  });

  if (existing) {
    if (!existing.authUserId) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { authUserId: identity.id, email: normalizedEmail },
        include: userWithWorkspace,
      });
    }
    return existing;
  }

  const displayName =
    identity.user_metadata?.full_name ||
    identity.user_metadata?.name ||
    normalizedEmail.split('@')[0];

  try {
    return await prisma.$transaction(async (tx) => {
      // Provisioning can be triggered by more than one auth lifecycle event.
      // Serialize creation for this immutable Supabase subject across all app
      // instances, then re-check inside the lock before inserting anything.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity.id}, 0::bigint))`;

      const provisioned = await tx.user.findFirst({
        where: {
          OR: [
            { authUserId: identity.id },
            {
              authUserId: null,
              email: { equals: normalizedEmail, mode: 'insensitive' },
            },
          ],
        },
        include: userWithWorkspace,
      });

      if (provisioned) {
        if (!provisioned.authUserId) {
          return tx.user.update({
            where: { id: provisioned.id },
            data: { authUserId: identity.id, email: normalizedEmail },
            include: userWithWorkspace,
          });
        }
        return provisioned;
      }

      const organization = await tx.organization.create({
        data: {
          name: `${displayName}'s Agency`,
          billingEmail: normalizedEmail,
          onboardingState: {
            create: {
              needsOnboarding: true,
              currentStep: 0,
              draft: {
                signupName: displayName,
                signupPhone: identity.phone || null,
              },
            },
          },
        },
      });

      return tx.user.create({
        data: {
          authUserId: identity.id,
          email: normalizedEmail,
          name: displayName,
          username: identity.user_metadata?.username || null,
          phone: identity.phone || null,
          role: 'admin',
          orgId: organization.id,
          avatarUrl: identity.user_metadata?.avatar_url || null,
          preferences: { create: {} },
        },
        include: userWithWorkspace,
      });
    });
  } catch (error) {
    // Defensive recovery for a collision on a different deployment version or
    // an already-running request that began before the advisory-lock change.
    if ((error as { code?: string }).code === 'P2002') {
      const provisioned = await prisma.user.findUnique({
        where: { authUserId: identity.id },
        include: userWithWorkspace,
      });
      if (provisioned) return provisioned;
    }
    throw error;
  }
}

export async function getOrCreateRequestUser() {
  const identity = await getAuthenticatedIdentity();
  return identity ? provisionAuthenticatedUser(identity) : null;
}

export async function getOrganization(_request?: unknown) {
  void _request;
  const user = await getRequestUser();
  return user?.organization ?? null;
}

export function isOrganizationAdmin(user: { role: string }) {
  return user.role.toLowerCase() === 'admin';
}
