import { describe, expect, it } from 'vitest';
import {
  decodeCursor,
  descendingCursorWhere,
  encodeCursor,
  finishCursorPage,
  readCursorPage,
} from './cursor-pagination';

describe('cursor pagination', () => {
  it('round-trips opaque cursors', () => {
    const cursor = encodeCursor(new Date('2026-08-15T10:00:00.000Z'), 'row-1');
    expect(decodeCursor(cursor)).toEqual({ v: 1, value: '2026-08-15T10:00:00.000Z', id: 'row-1' });
  });

  it('bounds requested page sizes', () => {
    expect(readCursorPage(new Request('https://iris.test/api/items?limit=999')).limit).toBe(100);
    expect(readCursorPage(new Request('https://iris.test/api/items?limit=0')).limit).toBe(1);
  });

  it('returns one extra row only as pagination evidence', () => {
    const page = finishCursorPage([
      { id: '3', createdAt: new Date('2026-08-15T03:00:00Z') },
      { id: '2', createdAt: new Date('2026-08-15T02:00:00Z') },
      { id: '1', createdAt: new Date('2026-08-15T01:00:00Z') },
    ], 2, (row) => row.createdAt);
    expect(page.items.map((item) => item.id)).toEqual(['3', '2']);
    expect(page.hasMore).toBe(true);
    expect(decodeCursor(page.nextCursor)?.id).toBe('2');
  });

  it('builds a stable descending date and id predicate', () => {
    const cursor = decodeCursor(encodeCursor('2026-08-15T10:00:00.000Z', 'row-1'));
    expect(descendingCursorWhere(cursor, 'createdAt')).toEqual({
      OR: [
        { createdAt: { lt: new Date('2026-08-15T10:00:00.000Z') } },
        { createdAt: new Date('2026-08-15T10:00:00.000Z'), id: { lt: 'row-1' } },
      ],
    });
  });
});
