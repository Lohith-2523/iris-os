import 'server-only';

import { cache } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from './db';
import { createClient } from './server';
import { withDatabaseConnectionRetry } from './database-resilience';
import { measureServerOperation } from '@/server/observability/performance';
import { hasDeliveryWork } from '@/lib/team-member-access';
import { EmailVerificationRequiredError, requireEmailConfirmationEnabled } from '@/lib/email-verification';

const userWithWorkspace = {
  organization: {
    include: {
      onboardingState: true,
    },
  },
  client: true,
  preferences: true,
  projectMembers: {
    where: { project: { status: { not: 'COMPLETED' } } },
    select: { id: true },
  },
  clientTasks: {
    where: { status: { not: 'COMPLETED' } },
    select: { id: true },
    take: 1,
  },
} as const;

export function userHasDeliveryWorkspace(user: {
  handlesDeliverables?: boolean | null;
  projectMembers?: Array<unknown>;
  clientTasks?: Array<unknown>;
}) {
  return hasDeliveryWork({
    handlesDeliverables: user.handlesDeliverables,
    projectCount: user.projectMembers?.length || 0,
    activeTaskCount: user.clientTasks?.length || 0,
  });
}

export class WorkspaceIdentityConflictError extends Error {
  constructor() {
    super('Confirm this email address before reconnecting its existing workspace.');
    this.name = 'WorkspaceIdentityConflictError';
  }
}

type AuthenticatedIdentity = Pick<
  SupabaseUser,
  'id' | 'email' | 'phone' | 'user_metadata' | 'email_confirmed_at' | 'confirmed_at'
> & {
  emailVerified?: boolean;
  app_metadata?: SupabaseUser['app_metadata'];
};

function hasVerifiedEmail(identity: AuthenticatedIdentity) {
  return identity.emailVerified === true || Boolean(identity.email_confirmed_at || identity.confirmed_at);
}

async function resolveAuthenticatedIdentity(): Promise<AuthenticatedIdentity | null> {
  return measureServerOperation('identity.supabase.get-claims', async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub || typeof claims.email !== 'string') return null;

    const userMetadata = claims.user_metadata && typeof claims.user_metadata === 'object'
      ? claims.user_metadata as SupabaseUser['user_metadata']
      : {};

    return {
      id: claims.sub,
      email: claims.email,
      phone: typeof claims.phone === 'string' ? claims.phone : undefined,
      user_metadata: userMetadata,
      emailVerified: claims.email_verified === true || userMetadata.email_verified === true,
    };
  });
}

export const getAuthenticatedIdentity = cache(resolveAuthenticatedIdentity);

async function resolveRequestUser(_request?: unknown) {
  return measureServerOperation('identity.workspace-user', async () => {
    void _request;
    const identity = await getAuthenticatedIdentity();
    if (!identity?.email) return null;

    const normalizedEmail = identity.email.trim().toLowerCase();
    return withDatabaseConnectionRetry(async () => {
      const userByAuthId = await prisma.user.findUnique({
        where: { authUserId: identity.id },
        include: userWithWorkspace,
      });

      if (userByAuthId) return userByAuthId.accessRevokedAt ? null : userByAuthId;

      const userByEmail = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        include: userWithWorkspace,
      });

      if (!userByEmail || userByEmail.accessRevokedAt) return null;
      if (!hasVerifiedEmail(identity)) throw new WorkspaceIdentityConflictError();

      // A verified email can reclaim a legacy or partially provisioned workspace
      // after its Supabase auth subject has been recreated.
      return prisma.user.update({
        where: { id: userByEmail.id },
        data: { authUserId: identity.id, email: normalizedEmail },
        include: userWithWorkspace,
      });
    }, { maxAttempts: 3, delaysMs: [150, 500] });
  });
}

export const getRequestUser = cache(resolveRequestUser);

export async function provisionAuthenticatedUser(identity: AuthenticatedIdentity) {
  if (!identity.email) throw new Error('Authenticated user is missing an email address.');

  const normalizedEmail = identity.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { authUserId: identity.id },
    include: userWithWorkspace,
  });

  if (existing) return existing;

  // Only provider-verified inboxes may provision a new workspace. User-editable
  // profile metadata is not proof of email ownership.
  // The callback passes the user returned by exchangeCodeForSession; its new
  // cookies are on the redirect response and cannot yet be read from the request.
  const verifiedUser = identity.email_confirmed_at
    ? identity
    : (await (await createClient()).auth.getUser()).data.user;
  if (verifiedUser?.id !== identity.id || verifiedUser.email?.trim().toLowerCase() !== normalizedEmail || !verifiedUser.email_confirmed_at) {
    throw new EmailVerificationRequiredError();
  }
  if (verifiedUser.app_metadata?.provider === 'email') await requireEmailConfirmationEnabled();

  const displayName =
    identity.user_metadata?.full_name ||
    identity.user_metadata?.name ||
    normalizedEmail.split('@')[0];

  try {
    return await prisma.$transaction(async (tx) => {
      // Provisioning can be triggered by more than one auth lifecycle event.
      // Email is unique in the workspace database. Lock its canonical form so
      // retries and recreated Supabase subjects cannot race each other.
      await tx.$queryRaw<Array<{ lockAcquired: string }>>`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${normalizedEmail}, 0::bigint)
        )::text AS "lockAcquired"
      `;

      const provisionedByAuthId = await tx.user.findUnique({
        where: { authUserId: identity.id },
        include: userWithWorkspace,
      });

      if (provisionedByAuthId) return provisionedByAuthId;

      const provisionedByEmail = await tx.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        include: userWithWorkspace,
      });

      if (provisionedByEmail) {
        if (!hasVerifiedEmail(identity)) throw new WorkspaceIdentityConflictError();

        return tx.user.update({
          where: { id: provisionedByEmail.id },
          data: { authUserId: identity.id, email: normalizedEmail },
          include: userWithWorkspace,
        });
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
      const provisionedByAuthId = await prisma.user.findUnique({
        where: { authUserId: identity.id },
        include: userWithWorkspace,
      });
      if (provisionedByAuthId) return provisionedByAuthId;

      const provisionedByEmail = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        include: userWithWorkspace,
      });

      if (provisionedByEmail && hasVerifiedEmail(identity)) {
        try {
          return await prisma.user.update({
            where: { id: provisionedByEmail.id },
            data: { authUserId: identity.id, email: normalizedEmail },
            include: userWithWorkspace,
          });
        } catch (recoveryError) {
          if ((recoveryError as { code?: string }).code === 'P2002') {
            const concurrentProvision = await prisma.user.findUnique({
              where: { authUserId: identity.id },
              include: userWithWorkspace,
            });
            if (concurrentProvision) return concurrentProvision;
          }
          throw recoveryError;
        }
      }
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
