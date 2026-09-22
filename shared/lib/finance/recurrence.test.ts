import { describe, expect, it } from 'vitest';
import { generateRecurringOccurrences, recurringOccurrenceId } from './recurrence';

describe('generateRecurringOccurrences', () => {
  it('recognizes the start date and every monthly recurrence through the reporting date', () => {
    const occurrences = generateRecurringOccurrences(
      '2026-01-15',
      2500,
      'monthly',
      '2026-04-15T23:59:59Z',
    );

    expect(occurrences).toHaveLength(4);
    expect(occurrences.map(({ date }) => date.toISOString().slice(0, 10))).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);
    expect(occurrences.reduce((sum, occurrence) => sum + occurrence.amount, 0)).toBe(10000);
  });

  it('keeps month-end retainers at the end of shorter months', () => {
    const occurrences = generateRecurringOccurrences(
      '2025-01-31',
      1000,
      'monthly',
      '2025-03-31T23:59:59Z',
    );

    expect(occurrences.map(({ date }) => date.toISOString().slice(0, 10))).toEqual([
      '2025-01-31',
      '2025-02-28',
      '2025-03-31',
    ]);
  });

  it('does not recognize revenue before the retainer starts', () => {
    expect(generateRecurringOccurrences('2027-01-01', 1000, 'monthly', '2026-12-31')).toEqual([]);
  });
});

describe('recurringOccurrenceId', () => {
  it('keeps recurring rows unique across dates for one subscription', () => {
    const subscriptionId = 'ae57ca04-dbe0-4000-8000-000000000000';
    const ids = [
      recurringOccurrenceId(subscriptionId, new Date('2026-08-01T12:00:00Z')),
      recurringOccurrenceId(subscriptionId, new Date('2026-09-01T12:00:00Z')),
    ];

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      `${subscriptionId}-2026-08-01`,
      `${subscriptionId}-2026-09-01`,
    ]);
  });
});
