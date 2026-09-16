import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { DATE_INPUT_PATTERN, DateInput, formatDateForInput, formatDateWhileTyping, parseTypedDate } from './date-input';

describe('date input formatting', () => {
  it('formats stored ISO dates for the DD/MM/YYYY input', () => {
    expect(formatDateForInput('2026-08-07')).toBe('07/08/2026');
    expect(formatDateForInput('2026-08-07T09:30')).toBe('07/08/2026');
  });

  it('uses a browser-safe pattern for calendar-selected dates', () => {
    expect(new RegExp(`^${DATE_INPUT_PATTERN}$`).test(formatDateForInput('2026-08-07'))).toBe(true);
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

  it('keeps the calendar button inside the date input bounds', () => {
    const { container } = render(React.createElement(DateInput, {
      value: '2026-08-07',
      onChange: () => undefined,
      containerClassName: 'w-35',
      className: 'rounded border',
    }));

    expect(container.firstElementChild).toHaveClass('relative', 'grid', 'max-w-full', 'w-35');
    expect(screen.getByRole('textbox')).toHaveClass('col-start-1', 'row-start-1', 'block', 'w-full', 'max-w-full', 'box-border', 'pr-10');
    expect(screen.getByRole('button', { name: 'Choose date from calendar' })).toHaveClass('col-start-1', 'row-start-1', 'justify-self-end', 'self-stretch');

    const pickerProxy = container.querySelector('input[type="date"]');
    expect(pickerProxy).toHaveAttribute('data-date-picker-proxy', 'true');
    expect(pickerProxy).toHaveClass('absolute', 'right-0', 'top-0', 'h-full', 'w-10');
    expect(pickerProxy).not.toHaveClass('fixed', 'left-0');
  });
});
