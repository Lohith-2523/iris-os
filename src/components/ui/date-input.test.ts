import { describe, expect, it } from 'vitest';
import { formatDateForInput, formatDateWhileTyping, parseTypedDate } from './date-input';

describe('date input formatting', () => {
  it('formats stored ISO dates for the DD/MM/YYYY input', () => {
    expect(formatDateForInput('2026-08-07')).toBe('07/08/2026');
    expect(formatDateForInput('2026-08-07T09:30')).toBe('07/08/2026');
  });

  it('adds separators after a completed day and month', () => {
    expect(formatDateWhileTyping('07')).toBe('07/');
    expect(formatDateWhileTyping('0708')).toBe('07/08/');
    expect(formatDateWhileTyping('07082026')).toBe('07/08/2026');
  });

  it('only accepts real calendar dates', () => {
    expect(parseTypedDate('29/02/2024')).toBe('2024-02-29');
    expect(parseTypedDate('29/02/2025')).toBeNull();
    expect(parseTypedDate('31/04/2026')).toBeNull();
  });
});
