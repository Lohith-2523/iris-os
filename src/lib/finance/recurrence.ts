export type RecurrenceFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface RecurringOccurrence {
  date: Date;
  amount: number;
}

function daysInUtcMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addMonthsFromAnchor(start: Date, months: number) {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const day = Math.min(start.getUTCDate(), daysInUtcMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, day, 12));
}

export function generateRecurringOccurrences(
  startValue: string | Date,
  amount: number,
  frequency: string,
  throughValue: string | Date = new Date(),
): RecurringOccurrence[] {
  const start = new Date(startValue);
  const through = new Date(throughValue);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(through.getTime()) ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) return [];

  const frequencyMonths = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : frequency === 'yearly' ? 12 : 0;
  if (!frequencyMonths || start > through) return [];

  const occurrences: RecurringOccurrence[] = [];
  for (let index = 0; index < 1200; index += 1) {
    const date = addMonthsFromAnchor(start, index * frequencyMonths);
    if (date > through) break;
    occurrences.push({ date, amount });
  }
  return occurrences;
}
