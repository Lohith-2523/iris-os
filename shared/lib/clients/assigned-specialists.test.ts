import { describe, expect, it } from 'vitest';
import { collectAssignedSpecialists } from './assigned-specialists';

describe('collectAssignedSpecialists', () => {
  it('deduplicates specialists assigned across multiple client projects', () => {
    const avery = { id: 'member-1', name: 'Avery Stone' };
    const jordan = { id: 'member-2', name: 'Jordan Lee' };

    expect(collectAssignedSpecialists([
      { members: [avery, jordan] },
      { members: [avery] },
    ])).toEqual([avery, jordan]);
  });

  it('keeps the legacy client specialist as a fallback without duplicating project members', () => {
    const avery = { id: 'member-1', name: 'Avery Stone' };
    expect(collectAssignedSpecialists([{ members: [avery] }], avery)).toEqual([avery]);
    expect(collectAssignedSpecialists([], avery)).toEqual([avery]);
  });
});
