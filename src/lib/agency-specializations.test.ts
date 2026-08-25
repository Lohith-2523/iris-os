import { describe, expect, it } from 'vitest';
import {
  agencyServiceLines,
  clientHasMetaEnabledProject,
  isMetaEnabledServiceLine,
  isSelectedAgencyServiceLine,
  mergeAgencySpecializations,
} from './agency-specializations';

describe('agency specialization service lines', () => {
  it('uses the unique specializations selected in agency settings', () => {
    expect(agencyServiceLines(['SEO Agency', ' SEO Agency ', 'Graphic Design Agency'])).toEqual([
      'SEO Agency',
      'Graphic Design Agency',
    ]);
  });

  it('preserves manually entered labels and accepts comma-delimited legacy values', () => {
    expect(agencyServiceLines(['Healthcare marketing, B2B SaaS'])).toEqual(['Healthcare marketing', 'B2B SaaS']);
  });

  it('merges an unsaved input value into the submitted specialization list', () => {
    expect(mergeAgencySpecializations(['SEO Agency'], 'Healthcare marketing, seo')).toEqual([
      'SEO Agency',
      'Healthcare marketing',
    ]);
  });

  it.each([
    'Digital Marketing Agency',
    'Social Media Management Agency',
    'Paid Advertising Agency (PPC)',
    'Paid Ads & CRO',
    'Social Media (SMM)',
  ])('enables Meta client sections for %s', (serviceLine) => {
    expect(isMetaEnabledServiceLine(serviceLine)).toBe(true);
  });

  it('requires at least one eligible client project', () => {
    expect(clientHasMetaEnabledProject([{ metaIntegrationEnabled: false }, { serviceLine: 'Paid Advertising Agency (PPC)' }])).toBe(false);
    expect(clientHasMetaEnabledProject([{ serviceLine: 'SEO Agency' }, { metaIntegrationEnabled: true }])).toBe(true);
  });

  it('validates a service line against agency settings', () => {
    expect(isSelectedAgencyServiceLine('SEO Agency', ['SEO Agency'])).toBe(true);
    expect(isSelectedAgencyServiceLine('Paid Ads & CRO', ['SEO Agency'])).toBe(false);
  });
});
