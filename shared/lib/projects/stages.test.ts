import { describe, expect, it } from 'vitest';
import { normalizeProjectStageColor } from './stages';

describe('project stage colors', () => {
  it('normalizes valid hex colors', () => {
    expect(normalizeProjectStageColor('#a78bfa')).toBe('#A78BFA');
  });

  it('uses a stable palette fallback by stage position', () => {
    expect(normalizeProjectStageColor('', 0)).toBe('#94A3B8');
    expect(normalizeProjectStageColor('invalid', 1)).toBe('#A78BFA');
  });
});
