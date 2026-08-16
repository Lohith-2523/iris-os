import type { NextRequest } from 'next/server';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_CURSOR_LENGTH = 1_024;

type CursorPayload = {
  v: 1;
  value: string;
  id: string;
};

export type CursorPageRequest = {
  cursor: CursorPayload | null;
  limit: number;
  take: number;
};

function safeInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

export function decodeCursor(value: string | null): CursorPayload | null {
  if (!value || value.length > MAX_CURSOR_LENGTH) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<CursorPayload>;
    if (parsed.v !== 1 || typeof parsed.value !== 'string' || typeof parsed.id !== 'string') return null;
    if (!parsed.value || !parsed.id || parsed.value.length > 200 || parsed.id.length > 200) return null;
    return { v: 1, value: parsed.value, id: parsed.id };
  } catch {
    return null;
  }
}

export function encodeCursor(value: Date | string, id: string) {
  const normalized = value instanceof Date ? value.toISOString() : value;
  return Buffer.from(JSON.stringify({ v: 1, value: normalized, id } satisfies CursorPayload), 'utf8').toString('base64url');
}

export function readCursorPage(
  request: NextRequest | Request,
  options: {
    defaultLimit?: number;
    maxLimit?: number;
    cursorParam?: string;
    limitParam?: string;
  } = {},
): CursorPageRequest {
  const searchParams = new URL(request.url).searchParams;
  const maxLimit = Math.max(1, Math.min(options.maxLimit ?? MAX_PAGE_SIZE, 250));
  const defaultLimit = Math.max(1, Math.min(options.defaultLimit ?? DEFAULT_PAGE_SIZE, maxLimit));
  const limit = Math.max(1, Math.min(safeInteger(searchParams.get(options.limitParam ?? 'limit'), defaultLimit), maxLimit));
  return {
    cursor: decodeCursor(searchParams.get(options.cursorParam ?? 'cursor')),
    limit,
    take: limit + 1,
  };
}

export function descendingCursorWhere(cursor: CursorPayload | null, field: string) {
  if (!cursor) return {};
  const date = new Date(cursor.value);
  if (Number.isNaN(date.getTime())) return {};
  return {
    OR: [
      { [field]: { lt: date } },
      { [field]: date, id: { lt: cursor.id } },
    ],
  };
}

export function ascendingCursorWhere(cursor: CursorPayload | null, field: string) {
  if (!cursor) return {};
  const date = new Date(cursor.value);
  if (Number.isNaN(date.getTime())) return {};
  return {
    OR: [
      { [field]: { gt: date } },
      { [field]: date, id: { gt: cursor.id } },
    ],
  };
}

export function finishCursorPage<T extends { id: string }>(
  rows: T[],
  limit: number,
  cursorValue: (row: T) => Date | string,
) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(cursorValue(last), last.id) : null,
  };
}

export function cursorHeaders(page: { hasMore: boolean; nextCursor: string | null }, limit: number) {
  const headers = new Headers({
    'X-Has-More': String(page.hasMore),
    'X-Page-Limit': String(limit),
  });
  if (page.nextCursor) headers.set('X-Next-Cursor', page.nextCursor);
  return headers;
}

