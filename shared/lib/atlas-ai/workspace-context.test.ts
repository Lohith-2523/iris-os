import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => Object.fromEntries([
  'transaction', 'agencyLead', 'invoice', 'expense', 'agencyMetaAdAccount', 'metaAd', 'client', 'project', 'clientTask',
].map((name) => [name, { findMany: vi.fn() }])));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));

import { getAtlasWorkspaceContext } from './workspace-context';

const org = { id: 'agency-1', currency: 'INR', aiSharingConsent: true, metaAccessConsent: false, atlasMetaAnalyticsConsent: false };

describe('Miles consented workspace context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const model of Object.values(db)) model.findMany.mockResolvedValue([]);
  });

  it('performs no private data reads when consent is disabled', async () => {
    const context = await getAtlasWorkspaceContext({ ...org, aiSharingConsent: false });
    expect(context).toContain('disabled AI data-sharing consent');
    for (const model of Object.values(db)) expect(model.findMany).not.toHaveBeenCalled();
  });

  it('includes clients, projects, tasks and finance for the authenticated agency', async () => {
    db.client.findMany.mockResolvedValue([{ name: 'Acme', status: 'ACTIVE' }]);
    db.project.findMany.mockResolvedValue([{ name: 'Launch', status: 'IN_PROGRESS', progress: 40, endDate: null, client: { name: 'Acme' } }]);
    db.clientTask.findMany.mockResolvedValue([{ title: 'Design review', status: 'TODO', deadline: null, project: { name: 'Launch' } }]);
    db.invoice.findMany.mockResolvedValue([{ invoiceNumber: 'INV-1', amount: 500, status: 'UNPAID' }]);
    const context = await getAtlasWorkspaceContext(org);
    expect(context).toContain('Acme: ACTIVE');
    expect(context).toContain('Launch (Client: Acme)');
    expect(context).toContain('Design review (Project: Launch): TO-DO');
    expect(context).toContain('Invoice INV-1: INR 500');
    expect(context).toContain('limited samples, not complete totals');
    for (const name of ['transaction', 'agencyLead', 'invoice', 'expense', 'client', 'project']) {
      expect(db[name].findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ orgId: org.id }) }));
    }
    expect(db.clientTask.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { client: { orgId: org.id } } }));
    expect(db.agencyLead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ sourceProvider: null }, { sourceProvider: { not: 'META' } }] }) }));
    expect(db.metaAd.findMany).not.toHaveBeenCalled();
  });

  it.each([[true, false], [false, true]])('requires both separate Meta consents (%s, %s)', async (metaAccessConsent, atlasMetaAnalyticsConsent) => {
    await getAtlasWorkspaceContext({ ...org, metaAccessConsent, atlasMetaAnalyticsConsent });
    expect(db.agencyMetaAdAccount.findMany).not.toHaveBeenCalled();
    expect(db.metaAd.findMany).not.toHaveBeenCalled();
  });

  it('shares only aggregate Meta metrics from this agency\'s selected accounts', async () => {
    db.agencyMetaAdAccount.findMany.mockResolvedValue([{ adAccountId: 'act-1' }]);
    db.metaAd.findMany.mockResolvedValue([{ spend: 100, reach: 200, impressions: 300, clicks: 10, leadsCount: 2 }]);
    const context = await getAtlasWorkspaceContext({ ...org, metaAccessConsent: true, atlasMetaAnalyticsConsent: true });
    expect(context).toContain('Spend: INR 100.00');
    expect(db.metaAd.findMany).toHaveBeenCalledWith({ where: { orgId: org.id, adAccountId: { in: ['act-1'] } }, select: { spend: true, reach: true, impressions: true, clicks: true, leadsCount: true } });
  });
});
