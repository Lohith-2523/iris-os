export function parseAgencyIndustryList(value: unknown) {
  if (typeof value !== 'string') return [];
  const seen = new Set<string>();
  const industries: string[] = [];
  for (const part of value.split(',')) {
    const industry = part.trim().replace(/\s+/g, ' ');
    const key = industry.toLowerCase();
    if (!industry || seen.has(key)) continue;
    seen.add(key);
    industries.push(industry);
  }
  return industries;
}
