import { describe, expect, it } from 'vitest';
import {
  metaAdAccountLabel,
  selectAssignableMetaAdAccounts,
  type AssignableMetaAdAccount,
} from './meta-ad-account-shared';

function account(
  id: string,
  name: string,
  overrides: Partial<AssignableMetaAdAccount> = {},
) {
  return {
    id,
    accountId: id.replace(/^act_/, ''),
    name,
    accountStatus: 1,
    currency: 'USD',
    businessId: null,
    businessName: null,
    userTasks: ['MANAGE'],
    ...overrides,
  };
}

describe('selectAssignableMetaAdAccounts', () => {
  it('returns only workspace-selected accounts in stable name order', () => {
    const alpha = account('act_1', 'Alpha');
    const beta = account('act_2', 'Beta');
    const unselected = account('act_3', 'Unselected');

    expect(selectAssignableMetaAdAccounts({
      discoveredAdAccounts: [unselected, beta, alpha],
      selectedAdAccountIds: [beta.id, alpha.id],
      selectedAdAccounts: [beta, alpha],
    })).toEqual([
      expect.objectContaining({ id: alpha.id, name: alpha.name }),
      expect.objectContaining({ id: beta.id, name: beta.name }),
    ]);
  });

  it('recovers selected accounts from discovery data for older credentials', () => {
    const selected = account('act_9', 'Recovered');

    expect(selectAssignableMetaAdAccounts({
      discoveredAdAccounts: [selected],
      selectedAdAccountIds: [selected.id],
      selectedAdAccounts: [],
    })).toEqual([
      expect.objectContaining({ id: selected.id }),
    ]);
  });
});

describe('metaAdAccountLabel', () => {
  it('includes the account name, canonical id, business, and currency', () => {
    expect(metaAdAccountLabel(account('act_42', 'Growth', {
      businessName: 'Agency Business',
      currency: 'INR',
    }))).toBe('Growth (act_42) — Agency Business · INR');
  });
});
