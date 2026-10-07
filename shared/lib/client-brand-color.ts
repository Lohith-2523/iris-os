export const CLIENT_BRAND_COLOR_PALETTE = [
  '#7C3AED',
  '#2563EB',
  '#0284C7',
  '#0891B2',
  '#0F766E',
  '#059669',
  '#65A30D',
  '#CA8A04',
  '#D97706',
  '#EA580C',
  '#DC2626',
  '#E11D48',
  '#DB2777',
  '#C026D3',
  '#9333EA',
  '#4F46E5',
] as const;

export function normalizeClientBrandColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim())
    ? value.trim().toUpperCase()
    : null;
}

export function defaultClientBrandColor(clientId: string): string {
  let hash = 2166136261;
  for (let index = 0; index < clientId.length; index += 1) {
    hash ^= clientId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return CLIENT_BRAND_COLOR_PALETTE[(hash >>> 0) % CLIENT_BRAND_COLOR_PALETTE.length];
}

export function resolveClientBrandColor(metadata: unknown, clientId: string): string {
  const record = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as { brandColor?: unknown }
    : {};
  return normalizeClientBrandColor(record.brandColor) || defaultClientBrandColor(clientId);
}

export function pickRandomClientBrandColor(usedColors: Iterable<unknown>, randomValue = Math.random()): string {
  const used = new Set(Array.from(usedColors, normalizeClientBrandColor).filter((color): color is string => Boolean(color)));
  const available = CLIENT_BRAND_COLOR_PALETTE.filter((color) => !used.has(color));
  const choices = available.length > 0 ? available : CLIENT_BRAND_COLOR_PALETTE;
  const safeRandom = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999999999) : 0;
  return choices[Math.floor(safeRandom * choices.length)];
}
