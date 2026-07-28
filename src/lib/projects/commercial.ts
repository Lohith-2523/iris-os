import { generateRecurringOccurrences } from '@/lib/finance/recurrence';

export const PROJECT_PAYMENT_TYPES = ['RETAINER', 'ONE_TIME'] as const;
export const PROJECT_PAYMENT_FREQUENCIES = ['monthly', 'quarterly', 'yearly'] as const;
export const PROJECT_PAYMENT_TERMS = [
  'DUE_ON_RECEIPT',
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
] as const;

export type ProjectPaymentType = (typeof PROJECT_PAYMENT_TYPES)[number];

export type ProjectCommercialInput = {
  paymentType?: unknown;
  paymentAmount?: unknown;
  paymentFrequency?: unknown;
  paymentStartDate?: unknown;
  paymentTerms?: unknown;
};

export type ProjectCommercialData = {
  paymentType: ProjectPaymentType;
  paymentAmount: number | null;
  paymentFrequency: string | null;
  paymentStartDate: Date | null;
  paymentTerms: string | null;
};

function normalizedEnum(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

export function parseProjectCommercials(
  input: ProjectCommercialInput,
  options: { partial?: boolean } = {},
): { data?: Partial<ProjectCommercialData>; error?: string } {
  const partial = options.partial === true;
  const data: Partial<ProjectCommercialData> = {};

  const typeValue = input.paymentType === undefined && partial
    ? undefined
    : normalizedEnum(input.paymentType || 'RETAINER');
  if (typeValue !== undefined) {
    if (!PROJECT_PAYMENT_TYPES.includes(typeValue as ProjectPaymentType)) {
      return { error: 'Payment type must be Retainer or One-time payment' };
    }
    data.paymentType = typeValue as ProjectPaymentType;
  }

  if (input.paymentAmount !== undefined || !partial) {
    if (input.paymentAmount === '' || input.paymentAmount === null || input.paymentAmount === undefined) {
      data.paymentAmount = null;
    } else {
      const amount = Number(input.paymentAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { error: 'Project payment amount must be a positive number' };
      }
      data.paymentAmount = amount;
    }
  }

  if (input.paymentFrequency !== undefined || !partial) {
    const frequency = String(input.paymentFrequency || 'monthly').trim().toLowerCase();
    if (!PROJECT_PAYMENT_FREQUENCIES.includes(frequency as (typeof PROJECT_PAYMENT_FREQUENCIES)[number])) {
      return { error: 'Retainer frequency must be monthly, quarterly, or yearly' };
    }
    data.paymentFrequency = frequency;
  }

  if (input.paymentStartDate !== undefined || !partial) {
    if (!input.paymentStartDate) {
      data.paymentStartDate = null;
    } else {
      const paymentStartDate = new Date(String(input.paymentStartDate));
      if (Number.isNaN(paymentStartDate.getTime())) {
        return { error: 'Project payment start date is invalid' };
      }
      data.paymentStartDate = paymentStartDate;
    }
  }

  if (input.paymentTerms !== undefined || !partial) {
    const terms = normalizedEnum(input.paymentTerms || 'NET_30');
    if (!PROJECT_PAYMENT_TERMS.includes(terms as (typeof PROJECT_PAYMENT_TERMS)[number])) {
      return { error: 'Project payment terms are invalid' };
    }
    data.paymentTerms = terms;
  }

  const resolvedType = data.paymentType;
  if (resolvedType === 'ONE_TIME') {
    data.paymentFrequency = null;
  }

  return { data };
}

export function generateProjectPaymentOccurrences(project: {
  paymentType?: string | null;
  paymentAmount?: number | null;
  paymentFrequency?: string | null;
  paymentStartDate?: Date | string | null;
  startDate: Date | string;
}) {
  const amount = Number(project.paymentAmount || 0);
  if (amount <= 0) return [];

  const paymentDate = new Date(project.paymentStartDate || project.startDate);
  if (Number.isNaN(paymentDate.getTime())) return [];

  if (String(project.paymentType).toUpperCase() === 'ONE_TIME') {
    return paymentDate.getTime() <= Date.now() ? [{ date: paymentDate, amount }] : [];
  }

  return generateRecurringOccurrences(
    paymentDate,
    amount,
    project.paymentFrequency || 'monthly',
  );
}

export function formatProjectPaymentType(value: string | null | undefined) {
  return String(value).toUpperCase() === 'ONE_TIME' ? 'One-time payment' : 'Retainer';
}
