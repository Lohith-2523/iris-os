import { describe, expect, it } from 'vitest';
import {
  normalizeMetaAdAccountId,
  normalizeMetaLeadFields,
} from './meta-leads-shared';

describe('normalizeMetaLeadFields', () => {
  it('normalizes standard Instant Form contact fields', () => {
    expect(normalizeMetaLeadFields([
      { name: 'full_name', values: ['Ada Lovelace'] },
      { name: 'email', values: ['ada@example.com'] },
      { name: 'phone_number', values: ['+44 20 7946 0958'] },
      { name: 'Company Size', values: ['51-200'] },
    ])).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+44 20 7946 0958',
      values: {
        full_name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone_number: '+44 20 7946 0958',
        company_size: '51-200',
      },
    });
  });

  it('composes a name and preserves leads with partial contact data', () => {
    expect(normalizeMetaLeadFields([
      { name: 'first_name', values: ['Grace'] },
      { name: 'last_name', values: ['Hopper'] },
      { name: 'phone', values: ['555-0100'] },
    ])).toMatchObject({
      fullName: 'Grace Hopper',
      email: null,
      phone: '555-0100',
    });
  });
});

describe('normalizeMetaAdAccountId', () => {
  it('normalizes Graph API account IDs to the stored act_ form', () => {
    expect(normalizeMetaAdAccountId('12345')).toBe('act_12345');
    expect(normalizeMetaAdAccountId('act_12345')).toBe('act_12345');
    expect(normalizeMetaAdAccountId(null)).toBeNull();
  });
});
