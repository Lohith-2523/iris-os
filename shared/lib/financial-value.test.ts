import { describe, expect, it } from 'vitest';
import { financialValueClass } from './financial-value';

describe('financialValueClass', () => {
  it('marks unexpected negative financial values in red', () => {
    expect(financialValueClass(-1, 'text-emerald-400')).toBe('text-rose-400');
    expect(financialValueClass(0, 'text-emerald-400')).toBe('text-emerald-400');
    expect(financialValueClass(1, 'text-emerald-400')).toBe('text-emerald-400');
  });
});
