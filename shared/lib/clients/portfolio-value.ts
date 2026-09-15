export type PortfolioProject = {
  startDate: Date;
  endDate: Date | null;
  paymentType: string;
  paymentAmount: number | null;
  paymentFrequency: string | null;
  paymentStartDate: Date | null;
};

function utcDate(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcMonths(value: Date, months: number) {
  const day = value.getUTCDate();
  const firstOfTarget = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(
    firstOfTarget.getUTCFullYear(),
    firstOfTarget.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  return new Date(Date.UTC(
    firstOfTarget.getUTCFullYear(),
    firstOfTarget.getUTCMonth(),
    Math.min(day, lastDay),
  ));
}

function frequencyMonths(frequency: string | null) {
  const normalized = frequency?.trim().toLowerCase();
  if (normalized === 'quarterly') return 3;
  if (normalized === 'yearly' || normalized === 'annually' || normalized === 'annual') return 12;
  return 1;
}

export function projectPortfolioValueForYear(project: PortfolioProject, year: number) {
  const amount = Number(project.paymentAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const projectStart = utcDate(project.startDate);
  const paymentStart = utcDate(project.paymentStartDate || project.startDate);
  const firstPayment = paymentStart < projectStart ? projectStart : paymentStart;

  if (project.paymentType.trim().toUpperCase() === 'ONE_TIME') {
    return firstPayment.getUTCFullYear() === year ? amount : 0;
  }

  // A retainer without a contractual end date has no known future face value.
  // Count its first known installment once and never annualize it.
  const contractEnd = project.endDate ? utcDate(project.endDate) : firstPayment;
  if (contractEnd < firstPayment) return 0;

  const step = frequencyMonths(project.paymentFrequency);
  let total = 0;
  let installment = firstPayment;
  for (let installmentCount = 0; installment <= contractEnd && installmentCount < 1_200; installmentCount += 1) {
    if (installment.getUTCFullYear() === year) total += amount;
    installment = addUtcMonths(installment, step);
  }
  return total;
}

export function clientPortfolioValueForYear(projects: PortfolioProject[], year: number) {
  return projects.reduce(
    (total, project) => total + projectPortfolioValueForYear(project, year),
    0,
  );
}
