import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const deleteModels = [
    'generatedDocument', 'encryptedAttachment', 'encryptedMessage',
    'messagingConversation', 'messagingDevice', 'notification', 'calendarEvent',
    'googleCalendarConnection', 'memberInvite', 'transaction', 'invoice', 'expense',
    'recurringSubscription', 'recurringRetainer', 'financialForecast', 'deliverable',
    'changeRequest', 'clientTask', 'project', 'metaLead', 'client', 'agencyLead',
    'report', 'strategy', 'askAtlasMessage', 'atlasChatSession', 'atlasInsight',
    'automationRun', 'automation', 'metaPageConnection', 'integrationConnection',
    'metaAd', 'metaCampaign', 'agencyMetaAdAccount', 'designAsset', 'campaign', 'brand',
  ] as const;
  const delegates = Object.fromEntries([
    ...deleteModels.map((model) => [model, { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) }]),
    ['organization', { update: vi.fn().mockResolvedValue({ id: 'org-1' }) }],
  ]);

  return {
    deleteModels,
    delegates,
    getRequestUser: vi.fn(),
    isOrganizationAdmin: vi.fn(),
    transaction: vi.fn(async (callback: (tx: typeof delegates) => unknown) => callback(delegates)),
  };
});

vi.mock('@/lib/org', () => ({
  getOrganization: vi.fn(),
  getRequestUser: mocks.getRequestUser,
  isOrganizationAdmin: mocks.isOrganizationAdmin,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { DELETE } from './route';

function deleteRequest() {
  return new NextRequest('http://localhost:3000/api/organization', { method: 'DELETE' });
}

describe('DELETE /api/organization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({ id: 'admin-1', orgId: 'org-1', role: 'admin' });
    mocks.isOrganizationAdmin.mockReturnValue(true);
    mocks.transaction.mockImplementation(async (callback) => callback(mocks.delegates));
    for (const model of mocks.deleteModels) {
      mocks.delegates[model].deleteMany.mockResolvedValue({ count: 0 });
    }
  });

  it('atomically deletes every current organization-owned data family', async () => {
    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(200);
    expect(mocks.getRequestUser).toHaveBeenCalledTimes(1);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 10_000,
      timeout: 60_000,
    });
    for (const model of mocks.deleteModels) {
      expect(mocks.delegates[model].deleteMany).toHaveBeenCalledTimes(1);
    }
    expect(mocks.delegates.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: { agencyTypes: [], bankNames: [] },
    });
  });

  it('does not start a purge for a non-admin user', async () => {
    mocks.isOrganizationAdmin.mockReturnValue(false);

    const response = await DELETE(deleteRequest());

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('returns the failed stage while the transaction rolls back', async () => {
    mocks.delegates.invoice.deleteMany.mockRejectedValueOnce(new Error('database failure'));

    const response = await DELETE(deleteRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Unable to wipe agency data while deleting financial data. No data was deleted.');
  });
});
