import { describe, expect, it } from 'vitest';
import { parseAgencyIndustryList } from './agency-industry-list';

describe('parseAgencyIndustryList', () => {
  it('creates a clean unique list from comma-separated text', () => {
    expect(parseAgencyIndustryList('Healthcare, Fintech, healthcare,  B2B SaaS ')).toEqual(['Healthcare', 'Fintech', 'B2B SaaS']);
  });

  it('does not cap the number of specializations', () => {
    expect(parseAgencyIndustryList('One, Two, Three')).toEqual(['One', 'Two', 'Three']);
  });
});
