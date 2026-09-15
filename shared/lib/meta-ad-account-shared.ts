export type AssignableMetaAdAccount = {
  id: string;
  accountId: string;
  name: string;
  accountStatus: number | null;
  currency: string | null;
  businessId: string | null;
  businessName: string | null;
};

export type MetaAdAccountOptionsResponse = {
  connected: boolean;
  accounts: AssignableMetaAdAccount[];
};

type StoredMetaAdAccount = AssignableMetaAdAccount & {
  timezoneName?: string | null;
  userTasks?: string[];
};

type StoredMetaAccountSelection = {
  discoveredAdAccounts: StoredMetaAdAccount[];
  selectedAdAccountIds: string[];
  selectedAdAccounts: StoredMetaAdAccount[];
};

function publicAccount(account: StoredMetaAdAccount): AssignableMetaAdAccount {
  return {
    id: account.id,
    accountId: account.accountId,
    name: account.name,
    accountStatus: account.accountStatus,
    currency: account.currency,
    businessId: account.businessId,
    businessName: account.businessName,
  };
}

export function selectAssignableMetaAdAccounts(
  credentials: StoredMetaAccountSelection,
) {
  const selectedIds = new Set(credentials.selectedAdAccountIds || []);
  const source = credentials.selectedAdAccounts?.length
    ? credentials.selectedAdAccounts
    : credentials.discoveredAdAccounts.filter((account) => selectedIds.has(account.id));

  return Array.from(new Map(
    source
      .filter((account) => selectedIds.has(account.id))
      .map((account) => [account.id, publicAccount(account)]),
  ).values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function metaAdAccountLabel(account: AssignableMetaAdAccount) {
  const context = [account.businessName, account.currency].filter(Boolean).join(' · ');
  return `${account.name} (${account.id})${context ? ` — ${context}` : ''}`;
}
