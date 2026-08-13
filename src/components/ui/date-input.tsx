'use client';

import * as React from 'react';
import { CalendarDays } from 'lucide-react';

export const DATE_INPUT_PATTERN = '[0-9]{2}/[0-9]{2}/[0-9]{4}';

function isoDate(value: string | null | undefined) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || '';
}

export function formatDateForInput(value: string | null | undefined) {
  const iso = isoDate(value);
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
}

export function parseTypedDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

export function formatDateWhileTyping(value: string, isDeleting = false) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits.length === 2 && !isDeleting ? `${digits}/` : digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}${digits.length === 4 && !isDeleting ? '/' : ''}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'> & {
  value: string | null | undefined;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
};

export function DateInput({ value, onChange, placeholder = 'DD/MM/YYYY', min, max, className, ...props }: DateInputProps) {
  const normalizedValue = isoDate(value);
  const [draft, setDraft] = React.useState(() => formatDateForInput(normalizedValue));
  const inputRef = React.useRef<HTMLInputElement>(null);
  const calendarInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDraft(formatDateForInput(normalizedValue));
  }, [normalizedValue]);

  const validate = React.useCallback((nextDraft: string) => {
    const input = inputRef.current;
    if (!input) return;
    input.setCustomValidity(nextDraft && !parseTypedDate(nextDraft) ? 'Enter a valid date as DD/MM/YYYY.' : '');
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputType = (event.nativeEvent as InputEvent).inputType || '';
    const nextDraft = formatDateWhileTyping(event.target.value, inputType.startsWith('delete'));
    setDraft(nextDraft);
    validate(nextDraft);
    const parsed = parseTypedDate(nextDraft);
    if (parsed) onChange(parsed);
    if (!nextDraft) onChange('');
  };

  const openCalendar = () => {
    const calendar = calendarInputRef.current;
    if (!calendar) return;
    calendar.focus({ preventScroll: true });
    try {
      calendar.showPicker();
    } catch {
      calendar.click();
    }
  };

  return <div className="relative min-w-0">
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={draft}
      onChange={handleChange}
      onBlur={() => validate(draft)}
      pattern={DATE_INPUT_PATTERN}
      title="Use DD/MM/YYYY"
      className={`${className || ''} pr-10`}
    />
    <button type="button" onClick={openCalendar} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground" aria-label="Choose date from calendar" title="Choose date from calendar">
      <CalendarDays className="h-4 w-4" aria-hidden="true" />
    </button>
    <input
      ref={calendarInputRef}
      type="date"
      value={normalizedValue}
      min={min}
      max={max}
      tabIndex={-1}
      aria-hidden="true"
      className="absolute h-px w-px overflow-hidden opacity-0 pointer-events-none"
      onChange={(event) => {
        const nextDate = event.target.value;
        setDraft(formatDateForInput(nextDate));
        inputRef.current?.setCustomValidity('');
        onChange(nextDate);
      }}
    />
  </div>;
}

type DateTimeInputProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  value: string | null | undefined;
  onChange: (value: string) => void;
  required?: boolean;
  dateInputClassName?: string;
  timeInputClassName?: string;
};

export function DateTimeInput({ value, onChange, required, className, dateInputClassName, timeInputClassName, ...props }: DateTimeInputProps) {
  const [datePart, timePart = ''] = String(value || '').split('T');
  const date = isoDate(datePart);
  const time = timePart.slice(0, 5);
  const [typedDate, setTypedDate] = React.useState(date);
  const [typedTime, setTypedTime] = React.useState(time);

  React.useEffect(() => {
    setTypedDate(date);
    setTypedTime(time);
  }, [date, time]);

  const commit = (nextDate: string, nextTime: string) => {
    if (!nextDate || !nextTime) {
      if (!nextDate || !nextTime) onChange('');
      return;
    }
    onChange(`${nextDate}T${nextTime}`);
  };

  return <div {...props} className={className}>
    <DateInput required={required} value={typedDate} onChange={(nextDate) => { setTypedDate(nextDate); commit(nextDate, typedTime); }} className={dateInputClassName} />
    <input required={required} type="time" value={typedTime} onChange={(event) => { const nextTime = event.target.value; setTypedTime(nextTime); commit(typedDate, nextTime); }} className={timeInputClassName} aria-label="Time" />
  </div>;
}
