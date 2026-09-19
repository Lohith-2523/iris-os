import 'server-only';

import { cache } from 'react';
import { randomUUID } from 'node:crypto';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { prisma } from './db';
import { createClient } from './server';
import { withDatabaseConnectionRetry } from './database-resilience';
import { measureServerOperation } from '@/server/observability/performance';
import { hasDeliveryWork } from '@/lib/team-member-access';
import { EmailVerificationRequiredError } from '@/lib/email-verification';
import { purgeWorkspaceUsers } from '@/server/domains/member-deletion-service';
import { purgeOrganizationData } from '@/server/domains/account-deletion-service';

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

export class WorkspaceSignupRoleConflictError extends Error {
  constructor() {
    super('This email belongs to an invited workspace account. Sign in instead or use a different email to create a workspace.');
    this.name = 'WorkspaceSignupRoleConflictError';
  }
}

export class DeletedClientWorkspaceError extends Error {
  constructor() {
    super('This client workspace was deleted. Create a new workspace to continue.');
    this.name = 'DeletedClientWorkspaceError';
  }
}

type ProvisioningIntent = 'sign-in' | 'workspace-signup';

function rejectInvitedRoleDuringWorkspaceSignup(
  user: { role: string },
  intent: ProvisioningIntent,
) {
  if (intent !== 'workspace-signup') return;
  const role = user.role.toLowerCase();
  if (role === 'client' || role === 'member') {
    throw new WorkspaceSignupRoleConflictError();
  }
}

function isOrphanedClient(user: { role?: string; clientId?: string | null }) {
  return user.role?.toLowerCase() === 'client' && !user.clientId;
}

async function purgeOrphanedClientForWorkspaceSignup(
  user: { id: string; authUserId?: string | null; email: string; orgId: string; role: string; clientId?: string | null },
  identity: AuthenticatedIdentity,
  normalizedEmail: string,
) {
  if (!isOrphanedClient(user)) return false;
  if (!hasVerifiedEmail(identity) || user.email.trim().toLowerCase() !== normalizedEmail) {
    throw new WorkspaceSignupRoleConflictError();
  }

  await prisma.$transaction(
    (tx) => purgeWorkspaceUsers(tx, user.orgId, [{
      id: user.id,
      authUserId: user.authUserId ?? null,
      email: user.email,
    }]),
    { maxWait: 10_000, timeout: 60_000 },
  );
  return true;
}

async function purgeRecreatedAdminWorkspaceForSignup(
  user: { authUserId?: string | null; email: string; orgId: string; role: string },
  identity: AuthenticatedIdentity,
  normalizedEmail: string,
  intent: ProvisioningIntent,
) {
  const isRecreatedAdmin = intent === 'workspace-signup'
    && user.role.toLowerCase() === 'admin'
    && Boolean(user.authUserId)
    && user.authUserId !== identity.id;
  if (!isRecreatedAdmin) return false;
  if (!hasVerifiedEmail(identity) || user.email.trim().toLowerCase() !== normalizedEmail) {
    throw new WorkspaceIdentityConflictError();
  }

  await prisma.$transaction(async (tx) => {
    await purgeOrganizationData(tx, user.orgId);
    await tx.organization.delete({ where: { id: user.orgId } });
  }, { maxWait: 10_000, timeout: 60_000 });
  return true;
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

      if (userByAuthId) {
        return userByAuthId.accessRevokedAt || isOrphanedClient(userByAuthId) ? null : userByAuthId;
      }

      const userByEmail = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        include: userWithWorkspace,
      });

      if (!userByEmail || userByEmail.accessRevokedAt || isOrphanedClient(userByEmail)) return null;
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

export async function provisionAuthenticatedUser(
  identity: AuthenticatedIdentity,
  options: { intent?: ProvisioningIntent } = {},
) {
  if (!identity.email) throw new Error('Authenticated user is missing an email address.');

  const intent = options.intent ?? 'sign-in';
  const normalizedEmail = identity.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { authUserId: identity.id },
    include: userWithWorkspace,
  });

  if (existing) {
    if (intent === 'workspace-signup' && await purgeOrphanedClientForWorkspaceSignup(existing, identity, normalizedEmail)) {
      // Continue below and provision this verified identity as a new admin.
    } else {
      if (isOrphanedClient(existing)) throw new DeletedClientWorkspaceError();
      rejectInvitedRoleDuringWorkspaceSignup(existing, intent);
      return existing;
    }
  }

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
  const displayName =
    identity.user_metadata?.full_name ||
    identity.user_metadata?.name ||
    normalizedEmail.split('@')[0];

  const existingByEmail = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    include: userWithWorkspace,
  });

  if (existingByEmail) {
    if (!hasVerifiedEmail(identity)) throw new WorkspaceIdentityConflictError();
    if (intent === 'workspace-signup' && await purgeOrphanedClientForWorkspaceSignup(existingByEmail, identity, normalizedEmail)) {
      // The former client has no client workspace. Provision a clean admin below.
    } else if (await purgeRecreatedAdminWorkspaceForSignup(existingByEmail, identity, normalizedEmail, intent)) {
      // A newly created verified auth identity must not inherit a deleted
      // administrator's organization profile or onboarding draft.
    } else {
      if (isOrphanedClient(existingByEmail)) throw new DeletedClientWorkspaceError();
      rejectInvitedRoleDuringWorkspaceSignup(existingByEmail, intent);

      return prisma.user.update({
        where: { id: existingByEmail.id },
        data: { authUserId: identity.id, email: normalizedEmail },
        include: userWithWorkspace,
      });
    }
  }

  try {
    const userId = randomUUID();
    await prisma.organization.create({
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
        users: {
          create: {
            id: userId,
            authUserId: identity.id,
            email: normalizedEmail,
            name: displayName,
            username: identity.user_metadata?.username || null,
            phone: identity.phone || null,
            role: 'admin',
            avatarUrl: identity.user_metadata?.avatar_url || null,
            preferences: { create: {} },
          },
        },
      },
    });

    const provisioned = await prisma.user.findUnique({
      where: { id: userId },
      include: userWithWorkspace,
    });
    if (!provisioned) {
      throw new Error('Workspace provisioning completed without a user record.');
    }
    return provisioned;
  } catch (error) {
    // Unique auth subject and normalized-email constraints arbitrate concurrent
    // callbacks. The losing nested write rolls back before this recovery runs.
    if ((error as { code?: string }).code === 'P2002') {
      const provisionedByAuthId = await prisma.user.findUnique({
        where: { authUserId: identity.id },
        include: userWithWorkspace,
      });
      if (provisionedByAuthId) {
        rejectInvitedRoleDuringWorkspaceSignup(provisionedByAuthId, intent);
        return provisionedByAuthId;
      }

      const provisionedByEmail = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        include: userWithWorkspace,
      });

      if (provisionedByEmail && hasVerifiedEmail(identity)) {
        rejectInvitedRoleDuringWorkspaceSignup(provisionedByEmail, intent);
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
            if (concurrentProvision) {
              rejectInvitedRoleDuringWorkspaceSignup(concurrentProvision, intent);
              return concurrentProvision;
            }
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
