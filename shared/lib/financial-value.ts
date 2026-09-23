export function financialValueClass(value: number, nonNegativeClass = 'text-white') {
  return Number.isFinite(value) && value < 0 ? 'text-rose-400' : nonNegativeClass;
}
