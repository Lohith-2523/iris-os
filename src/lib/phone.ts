export function normalizeRequiredPhone(value: unknown) {
  const normalized = String(value || '').replace(/[\s()-]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(normalized) ? normalized : null;
}
