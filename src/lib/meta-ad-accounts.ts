import 'server-only';

import { prisma } from '@/lib/db';
import { decryptIntegrationCredentials } from '@/lib/integration-secrets';
import type { MetaCredentialPayload } from '@/lib/meta-business';
import type {
  MetaAdAccountOptionsResponse,
} from '@/lib/meta-ad-account-shared';
import { selectAssignableMetaAdAccounts } from '@/lib/meta-ad-account-shared';

export class MetaAdAccountAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetaAdAccountAssignmentError';
  }
}

export async function getAssignableMetaAdAccounts(
  orgId: string,
): Promise<MetaAdAccountOptionsResponse> {
  const connection = await prisma.integrationConnection.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: 'META',
      },
    },
    select: {
      status: true,
      credentialCiphertext: true,
    },
  });

  if (!connection?.credentialCiphertext) {
    return { connected: false, accounts: [] };
  }

  const credentials = decryptIntegrationCredentials<MetaCredentialPayload & Record<string, unknown>>(
    connection.credentialCiphertext,
  );

  return {
    connected: connection.status === 'CONNECTED',
    accounts: selectAssignableMetaAdAccounts(credentials),
  };
}

export async function resolveAssignableMetaAdAccountId(
  orgId: string,
  requestedAccountId: unknown,
) {
  if (requestedAccountId === null || requestedAccountId === undefined || requestedAccountId === '') {
    return null;
  }
  if (typeof requestedAccountId !== 'string') {
    throw new MetaAdAccountAssignmentError('Select a valid Meta ad account.');
  }

  const normalizedAccountId = requestedAccountId.trim();
  const { accounts } = await getAssignableMetaAdAccounts(orgId);
  const account = accounts.find((option) => option.id === normalizedAccountId);
  if (!account) {
    throw new MetaAdAccountAssignmentError(
      'Select a Meta ad account that is connected to this workspace.',
    );
  }

  const agencyAssignment = await prisma.agencyMetaAdAccount.findUnique({
    where: { orgId_adAccountId: { orgId, adAccountId: account.id } },
    select: { accountName: true },
  });
  if (agencyAssignment) {
    throw new MetaAdAccountAssignmentError(
      `${agencyAssignment.accountName} is assigned to the agency lead pipeline and cannot also be assigned to a client.`,
    );
  }

  return account.id;
}
