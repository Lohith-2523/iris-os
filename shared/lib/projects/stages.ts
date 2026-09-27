export const DEFAULT_PROJECT_STAGE_COLOR = '#94A3B8';

export const PROJECT_STAGE_COLORS = [
  '#94A3B8',
  '#A78BFA',
  '#60A5FA',
  '#2DD4BF',
  '#F59E0B',
  '#F472B6',
  '#FB7185',
  '#A3E635',
] as const;

export function normalizeProjectStageColor(value: unknown, position = 0) {
  const color = String(value || '').trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(color)) return color;
  return PROJECT_STAGE_COLORS[position % PROJECT_STAGE_COLORS.length] || DEFAULT_PROJECT_STAGE_COLOR;
}
