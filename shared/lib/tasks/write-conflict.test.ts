import { describe, expect, it } from 'vitest';
import { isTaskWriteConflict } from './write-conflict';

describe('isTaskWriteConflict', () => {
  it('recognizes a Prisma P2025 error from its code', () => {
    expect(isTaskWriteConflict({
      code: 'P2025',
      message: 'No record was found for an update.',
    })).toBe(true);
  });

  it('recognizes a database lock conflict from its code', () => {
    expect(isTaskWriteConflict({ code: '55P03' })).toBe(true);
  });

  it('does not classify unrelated failures as write conflicts', () => {
    expect(isTaskWriteConflict(new Error('Connection unavailable'))).toBe(false);
  });
});
