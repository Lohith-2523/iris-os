import { describe, expect, it } from 'vitest';
import { agencyViaIrisSenderName } from './sender-name';

describe('agencyViaIrisSenderName', () => {
  it('keeps Basic email sender branding as Iris OS', () => {
    expect(agencyViaIrisSenderName('Northstar Agency', 'BASIC')).toBeUndefined();
  });

  it.each(['PRO', 'ADVANCED'])('brands %s document emails for the agency', (plan) => {
    expect(agencyViaIrisSenderName('Northstar Agency', plan)).toBe('Northstar Agency Via Iris OS');
  });

  it('removes unsafe header characters from the agency name', () => {
    expect(agencyViaIrisSenderName('Northstar\r\nBCC: example@test.com', 'PRO')).toBe('Northstar BCC: example@test.com Via Iris OS');
  });
});
