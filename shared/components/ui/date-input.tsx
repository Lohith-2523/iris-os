'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  containerClassName?: string;
};

export function DateInput({ value, onChange, placeholder = 'DD/MM/YYYY', min, max, className, containerClassName, ...props }: DateInputProps) {
  const normalizedValue = isoDate(value);
  const [draft, setDraft] = React.useState(() => formatDateForInput(normalizedValue));
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [calendarView, setCalendarView] = React.useState<'days' | 'months' | 'years'>('days');
  const [visibleMonth, setVisibleMonth] = React.useState(() => {
    const selected = normalizedValue ? new Date(`${normalizedValue}T12:00:00`) : new Date();
    return new Date(selected.getFullYear(), selected.getMonth(), 1);
  });
  const [calendarPosition, setCalendarPosition] = React.useState({ top: 0, left: 0 });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const calendarButtonRef = React.useRef<HTMLButtonElement>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setDraft(formatDateForInput(normalizedValue));
  }, [normalizedValue]);

  const positionCalendar = React.useCallback(() => {
    const anchor = calendarButtonRef.current?.closest('[data-date-input-root]')?.getBoundingClientRect();
    if (!anchor) return;
    const width = Math.min(288, window.innerWidth - 16);
    const estimatedHeight = 330;
    const gap = 8;
    const showAbove = window.innerHeight - anchor.bottom < estimatedHeight + gap && anchor.top > estimatedHeight + gap;
    setCalendarPosition({
      top: showAbove ? Math.max(8, anchor.top - estimatedHeight - gap) : Math.max(8, Math.min(window.innerHeight - estimatedHeight - 8, anchor.bottom + gap)),
      left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)),
    });
  }, []);

  React.useEffect(() => {
    if (!calendarOpen) return;
    positionCalendar();
    const closeOnOutsidePress = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!calendarRef.current?.contains(target) && !calendarButtonRef.current?.contains(target)) setCalendarOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalendarOpen(false);
    };
    window.addEventListener('resize', positionCalendar);
    window.addEventListener('scroll', positionCalendar, true);
    document.addEventListener('mousedown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', positionCalendar);
      window.removeEventListener('scroll', positionCalendar, true);
      document.removeEventListener('mousedown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [calendarOpen, positionCalendar]);

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
    const selected = normalizedValue ? new Date(`${normalizedValue}T12:00:00`) : new Date();
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setCalendarView('days');
    positionCalendar();
    setCalendarOpen((open) => !open);
  };

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const decadeStart = Math.floor(year / 10) * 10;
  const leadingDays = new Date(year, month, 1).getDay();
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - leadingDays + 1, 12);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { date, iso, inMonth: date.getMonth() === month, disabled: Boolean((min && iso < min) || (max && iso > max)) };
  });
  const moveCalendarPage = (direction: -1 | 1) => {
    if (calendarView === 'days') setVisibleMonth(new Date(year, month + direction, 1));
    else if (calendarView === 'months') setVisibleMonth(new Date(year + direction, month, 1));
    else setVisibleMonth(new Date(year + direction * 10, month, 1));
  };
  const calendarHeading = calendarView === 'days'
    ? visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : calendarView === 'months'
      ? String(year)
      : `${decadeStart}–${decadeStart + 9}`;

  return <div data-date-input-root className={cn('relative grid w-full min-w-[8.5rem] max-w-full', containerClassName)}>
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
      className={cn('col-start-1 row-start-1 block w-full min-w-0 max-w-full box-border', className, 'pr-10')}
    />
    <button ref={calendarButtonRef} type="button" onClick={openCalendar} className="relative z-10 col-start-1 row-start-1 my-px mr-px flex w-9 items-center justify-center justify-self-end self-stretch text-muted-foreground transition-colors hover:text-foreground" aria-label="Choose date from calendar" title="Choose date from calendar" aria-expanded={calendarOpen}>
      <CalendarDays className="h-4 w-4" aria-hidden="true" />
    </button>
    {calendarOpen && typeof document !== 'undefined' && createPortal(
      <div ref={calendarRef} role="dialog" aria-label="Choose date" className="fixed z-[200] w-72 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-zinc-100 shadow-2xl" style={calendarPosition}>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => moveCalendarPage(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label={`Previous ${calendarView === 'days' ? 'month' : calendarView === 'months' ? 'year' : 'decade'}`}><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setCalendarView((view) => view === 'days' ? 'months' : 'years')} disabled={calendarView === 'years'} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-zinc-800 disabled:cursor-default disabled:hover:bg-transparent" aria-label={calendarView === 'days' ? 'Choose month' : calendarView === 'months' ? 'Choose year' : 'Year range'}>{calendarHeading}</button>
          <button type="button" onClick={() => moveCalendarPage(1)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label={`Next ${calendarView === 'days' ? 'month' : calendarView === 'months' ? 'year' : 'decade'}`}><ChevronRight className="h-4 w-4" /></button>
        </div>
        {calendarView === 'days' && <>
        <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day} className="py-1">{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day) => <button
            key={day.iso}
            type="button"
            disabled={day.disabled}
            onClick={() => {
              setDraft(formatDateForInput(day.iso));
              inputRef.current?.setCustomValidity('');
              onChange(day.iso);
              setCalendarOpen(false);
              inputRef.current?.focus({ preventScroll: true });
            }}
            className={cn('grid aspect-square place-items-center rounded-lg text-xs transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-25', !day.inMonth && 'text-zinc-600', day.iso === normalizedValue && 'bg-white font-bold text-zinc-950 hover:bg-zinc-200')}
            aria-label={day.date.toLocaleDateString()}
            aria-pressed={day.iso === normalizedValue}
          >{day.date.getDate()}</button>)}
        </div>
        </>}
        {calendarView === 'months' && <div className="grid grid-cols-3 gap-2 py-2">
          {Array.from({ length: 12 }, (_, monthIndex) => <button key={monthIndex} type="button" onClick={() => { setVisibleMonth(new Date(year, monthIndex, 1)); setCalendarView('days'); }} className={cn('rounded-lg px-2 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white', monthIndex === month && 'bg-white text-zinc-950 hover:bg-zinc-200 hover:text-zinc-950')}>{new Date(year, monthIndex, 1).toLocaleDateString(undefined, { month: 'short' })}</button>)}
        </div>}
        {calendarView === 'years' && <div className="grid grid-cols-3 gap-2 py-2">
          {Array.from({ length: 12 }, (_, index) => decadeStart - 1 + index).map((yearOption) => <button key={yearOption} type="button" onClick={() => { setVisibleMonth(new Date(yearOption, month, 1)); setCalendarView('months'); }} className={cn('rounded-lg px-2 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white', yearOption === year && 'bg-white text-zinc-950 hover:bg-zinc-200 hover:text-zinc-950', (yearOption < decadeStart || yearOption > decadeStart + 9) && 'text-zinc-600')}>{yearOption}</button>)}
        </div>}
      </div>,
      document.body,
    )}
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
