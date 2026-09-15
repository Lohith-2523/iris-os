export const META_ENABLED_SPECIALIZATIONS = [
  'Digital Marketing Agency',
  'Social Media Management Agency',
  'Paid Advertising Agency (PPC)',
] as const;

function normalizedSpecialization(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\bagency\b/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const META_SERVICE_LINE_ALIASES = new Set([
  ...META_ENABLED_SPECIALIZATIONS.map(normalizedSpecialization),
  'digital marketing',
  'social media marketing',
  'social media management',
  'social media smm',
  'paid advertising',
  'paid advertising ppc',
  'paid ads and cro',
  'ppc campaign',
]);

export function agencyServiceLines(agencyTypes: unknown): string[] {
  if (!Array.isArray(agencyTypes)) return [];
  return Array.from(new Set(
    agencyTypes
      .filter((value): value is string => typeof value === 'string')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim().replace(/\s+/g, ' '))
      .filter(Boolean),
  ));
}

export function mergeAgencySpecializations(current: unknown, pending: unknown): string[] {
  const values = [
    ...(Array.isArray(current) ? current : []),
    ...(typeof pending === 'string' ? pending.split(',') : []),
  ];
  const seen = new Set<string>();
  return values.flatMap((value) => {
    if (typeof value !== 'string') return [];
    const specialization = value.trim().replace(/\s+/g, ' ');
    const key = normalizedSpecialization(specialization);
    if (!specialization || !key || seen.has(key)) return [];
    seen.add(key);
    return [specialization];
  });
}

export function isMetaEnabledServiceLine(serviceLine: unknown) {
  return META_SERVICE_LINE_ALIASES.has(normalizedSpecialization(serviceLine));
}

export function clientHasMetaEnabledProject(projects: unknown) {
  return Array.isArray(projects)
    && projects.some((project) => project && typeof project === 'object'
      && (project as { metaIntegrationEnabled?: unknown }).metaIntegrationEnabled === true);
}

export function isSelectedAgencyServiceLine(serviceLine: unknown, agencyTypes: unknown) {
  const normalized = normalizedSpecialization(serviceLine);
  return Boolean(normalized) && agencyServiceLines(agencyTypes)
    .some((candidate) => normalizedSpecialization(candidate) === normalized);
}
