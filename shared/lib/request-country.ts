import 'server-only';

import { pricingRegionForCountry } from './plan-pricing';

const COUNTRY_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
] as const;

export function countryFromPublicIpHeaders(headers: Headers) {
  for (const name of COUNTRY_HEADERS) {
    const value = headers.get(name)?.trim().toUpperCase();
    if (value && /^[A-Z]{2}$/.test(value) && value !== 'XX') return value;
  }
  return null;
}

export function pricingLocation(headers: Headers) {
  const country = countryFromPublicIpHeaders(headers);
  return { country, region: pricingRegionForCountry(country) };
}
