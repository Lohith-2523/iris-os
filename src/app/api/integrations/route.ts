import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integration-secrets';
import {
  discoverMetaBusinessAssets,
  exchangeMetaAccessToken,
  MetaCredentialPayload,
  MetaIntegrationError,
  publicMetaConnection,
  subscribeMetaPagesToLeadgen,
  verifyMetaAccessToken,
} from '@/lib/meta-business';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { googleCalendarOwnerScope } from '@/lib/google-calendar-scope';

const PROVIDERS = ['META', 'GOOGLE'];

const DEFAULT_LOGS: Record<string, string> = {
  META: 'Not connected. Authorize Meta, then select the ad accounts to connect.',
  GOOGLE: 'Not connected. Connect your Google account to sync Google Calendar.',
};

function readMetaCredentials(ciphertext: string | null) {
  if (!ciphertext) {
    throw new MetaIntegrationError('Meta authorization is missing. Connect the account again.', 409);
  }
  return decryptIntegrationCredentials<MetaCredentialPayload & Record<string, unknown>>(ciphertext);
}

async function saveMetaConnection(
  orgId: string,
  credentials: MetaCredentialPayload,
  status: 'CONNECTED' | 'SYNCING',
  syncLogs: string,
) {
  return prisma.integrationConnection.upsert({
    where: {
      orgId_provider: {
        orgId,
        provider: 'META',
      },
    },
    create: {
      orgId,
      provider: 'META',
      status,
      lastSync: new Date(),
      syncLogs,
      externalAccountId: credentials.facebookUserId,
      credentialCiphertext: encryptIntegrationCredentials(credentials),
    },
    update: {
      status,
      lastSync: new Date(),
      syncLogs,
      externalAccountId: credentials.facebookUserId,
      credentialCiphertext: encryptIntegrationCredentials(credentials),
    },
  });
}

async function saveMetaPageMappings(
  connectionId: string,
  orgId: string,
  pages: MetaCredentialPayload['pages'],
) {
  await prisma.$transaction(async (tx) => {
    await tx.metaPageConnection.deleteMany({ where: { connectionId } });
    if ((pages || []).length > 0) {
      await tx.metaPageConnection.createMany({
        data: (pages || []).map((page) => ({
          pageId: page.id,
          pageName: page.name,
          connectionId,
          orgId,
        })),
      });
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
    }

    const [metaConnection, googleConnection] = await Promise.all([
      prisma.integrationConnection.findUnique({
        where: {
          orgId_provider: {
            orgId: user.orgId,
            provider: 'META',
          },
        },
      }),
      prisma.googleCalendarConnection.findUnique({
        where: { userId: user.id },
      }),
    ]);

    const integrations = PROVIDERS.map((provider) => {
      const connection = provider === 'META' ? metaConnection : googleConnection;
      const result: Record<string, unknown> = {
        provider,
        status: connection?.status || 'DISCONNECTED',
        lastSync: connection?.lastSync || null,
        logs: connection?.syncLogs || DEFAULT_LOGS[provider],
        hasConfig: Boolean(connection?.credentialCiphertext),
      };
      if (provider === 'GOOGLE' && connection?.externalAccountId) {
        result.accountEmail = connection.externalAccountId;
      }

      if (
        provider === 'META' &&
        isOrganizationAdmin(user) &&
        connection?.credentialCiphertext
      ) {
        try {
          const credentials = readMetaCredentials(connection.credentialCiphertext);
          result.meta = publicMetaConnection(credentials);
        } catch (error) {
          console.error('Unable to decrypt Meta integration credentials:', error);
          result.status = 'ERROR';
          result.logs = 'The saved Meta authorization cannot be read. Disconnect and reconnect it.';
        }
      }

      return result;
    });

    return NextResponse.json(integrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

    const body = await request.json();
    const { provider, action } = body;

    if (!provider || !PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    if (provider === 'GOOGLE') {
      if (action !== 'disconnect') {
        return NextResponse.json(
          { error: 'Connect Google Calendar through the OAuth flow.' },
          { status: 400 },
        );
      }

      await prisma.$transaction([
        prisma.googleCalendarConnection.deleteMany({
          where: { orgId: user.orgId, userId: user.id },
        }),
        prisma.calendarEvent.deleteMany({
          where: googleCalendarOwnerScope(user.orgId, user.id),
        }),
      ]);
      return NextResponse.json({ success: true, status: 'DISCONNECTED' });
    }

    if (!isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });
    }

    const existingConnection = await prisma.integrationConnection.findUnique({
      where: {
        orgId_provider: {
          orgId: user.orgId,
          provider: 'META',
        },
      },
    });

    if (action === 'disconnect') {
      if (existingConnection) {
        await prisma.$transaction([
          prisma.agencyMetaAdAccount.deleteMany({ where: { orgId: user.orgId } }),
          prisma.integrationConnection.delete({ where: { id: existingConnection.id } }),
        ]);
      }
      return NextResponse.json({ success: true, status: 'DISCONNECTED' });
    }

    if (!user.organization.metaAccessConsent) {
      return NextResponse.json(
        { error: 'Consent to access Meta data is required before connecting or synchronizing Meta.' },
        { status: 403 },
      );
    }

    if (provider === 'META' && action === 'connect_sdk') {
      const shortLivedAccessToken = body.authResponse?.accessToken;
      if (typeof shortLivedAccessToken !== 'string' || shortLivedAccessToken.length < 20) {
        return NextResponse.json({ error: 'Facebook Login did not return an access token.' }, { status: 400 });
      }

      const exchangedToken = await exchangeMetaAccessToken(shortLivedAccessToken);
      const token = await verifyMetaAccessToken(exchangedToken.accessToken);
      if (body.authResponse?.userID && body.authResponse.userID !== token.userId) {
        throw new MetaIntegrationError('The Facebook Login user does not match the verified token.', 401);
      }

      const assets = await discoverMetaBusinessAssets(exchangedToken.accessToken);
      const expiresAt =
        token.expiresAt ||
        (exchangedToken.expiresIn
          ? new Date(Date.now() + exchangedToken.expiresIn * 1000)
          : null);
      const credentials: MetaCredentialPayload = {
        schemaVersion: 2,
        accessToken: exchangedToken.accessToken,
        tokenType: exchangedToken.tokenType,
        facebookUserId: token.userId,
        facebookUserName: assets.profile.name,
        facebookUserEmail: assets.profile.email,
        expiresAt: expiresAt?.toISOString() || null,
        grantedScopes: token.scopes,
        businesses: assets.businesses,
        discoveredAdAccounts: assets.adAccounts,
        selectedAdAccountIds: [],
        selectedAdAccounts: [],
        pages: assets.pages,
      };

      const connection = await saveMetaConnection(
        user.orgId,
        credentials,
        'SYNCING',
        assets.adAccounts.length > 0
          ? `Meta authorized as ${assets.profile.name}. Select one or more accessible ad accounts.`
          : `Meta authorized as ${assets.profile.name}, but no accessible ad accounts were found.`,
      );
      await saveMetaPageMappings(connection.id, user.orgId, assets.pages);

      return NextResponse.json({
        success: true,
        status: 'SYNCING',
        meta: publicMetaConnection(credentials),
      });
    }

    if (provider === 'META' && (action === 'refresh_meta_accounts' || action === 'select_meta_accounts')) {
      const credentials = readMetaCredentials(existingConnection?.credentialCiphertext || null);
      const token = await verifyMetaAccessToken(credentials.accessToken);
      const assets = await discoverMetaBusinessAssets(credentials.accessToken);

      let selectedIds = credentials.selectedAdAccountIds.filter((accountId) =>
        assets.adAccounts.some((account) => account.id === accountId),
      );

      if (action === 'select_meta_accounts') {
        if (!Array.isArray(body.accountIds)) {
          return NextResponse.json({ error: 'Select at least one Meta ad account.' }, { status: 400 });
        }
        selectedIds = Array.from(
          new Set(body.accountIds.filter((accountId: unknown): accountId is string => typeof accountId === 'string')),
        );
        if (selectedIds.length === 0) {
          return NextResponse.json({ error: 'Select at least one Meta ad account.' }, { status: 400 });
        }

        const administeredIds = new Set(assets.adAccounts.map((account) => account.id));
        const unauthorizedSelection = selectedIds.find((accountId) => !administeredIds.has(accountId));
        if (unauthorizedSelection) {
          return NextResponse.json(
            { error: 'One or more selected accounts are unavailable or you are not an administrator.' },
            { status: 403 },
          );
        }
      }

      const selectedAdAccounts = assets.adAccounts.filter((account) => selectedIds.includes(account.id));
      if (selectedIds.length > 0 && assets.pages.length > 0) {
        await subscribeMetaPagesToLeadgen(assets.pages);
      }
      const updatedCredentials: MetaCredentialPayload = {
        ...credentials,
        schemaVersion: 2,
        facebookUserName: assets.profile.name,
        facebookUserEmail: assets.profile.email,
        expiresAt: token.expiresAt?.toISOString() || credentials.expiresAt,
        grantedScopes: token.scopes,
        businesses: assets.businesses,
        discoveredAdAccounts: assets.adAccounts,
        selectedAdAccountIds: selectedIds,
        selectedAdAccounts,
        pages: assets.pages,
      };
      const status = selectedIds.length > 0 ? 'CONNECTED' : 'SYNCING';

      const connection = await saveMetaConnection(
        user.orgId,
        updatedCredentials,
        status,
        selectedIds.length > 0
          ? assets.pages.length > 0
            ? `${selectedIds.length} Meta ad account${selectedIds.length === 1 ? '' : 's'} connected and ${assets.pages.length} Facebook Page${assets.pages.length === 1 ? '' : 's'} subscribed for lead notifications.`
            : `${selectedIds.length} Meta ad account${selectedIds.length === 1 ? '' : 's'} connected, but no manageable Facebook Pages were found for lead notifications.`
          : `Meta authorized as ${assets.profile.name}. Select one or more accessible ad accounts.`,
      );
      await saveMetaPageMappings(connection.id, user.orgId, assets.pages);

      return NextResponse.json({
        success: true,
        status,
        meta: publicMetaConnection(updatedCredentials),
      });
    }

    return NextResponse.json({ error: 'Unsupported integration action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating integration connection:', error);
    if (error instanceof MetaIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}
