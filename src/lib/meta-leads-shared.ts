export type MetaLeadField = {
  name?: string;
  values?: unknown[];
};

export type NormalizedMetaLeadFields = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  values: Record<string, string>;
};

function firstString(values: unknown[] | undefined) {
  const value = values?.find((item): item is string => typeof item === 'string');
  return value?.trim() || null;
}

function canonicalFieldName(name: string) {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function normalizeMetaLeadFields(fields: MetaLeadField[] | undefined): NormalizedMetaLeadFields {
  const values: Record<string, string> = {};

  for (const field of fields || []) {
    if (!field.name) continue;
    const value = firstString(field.values);
    if (value) values[canonicalFieldName(field.name)] = value;
  }

  const firstName = values.first_name || '';
  const lastName = values.last_name || '';
  const composedName = `${firstName} ${lastName}`.trim();

  return {
    fullName: values.full_name || values.name || composedName || null,
    email: values.email || values.email_address || null,
    phone: values.phone_number || values.phone || values.mobile_number || null,
    values,
  };
}

export function normalizeMetaAdAccountId(accountId: string | null | undefined) {
  const normalized = accountId?.trim();
  if (!normalized) return null;
  return normalized.startsWith('act_') ? normalized : `act_${normalized}`;
}
