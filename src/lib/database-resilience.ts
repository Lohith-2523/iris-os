const TRANSIENT_DATABASE_CODES = new Set([
  '53300',
  '57P03',
  'EMAXCONNSESSION',
  'P1001',
  'P1002',
  'P2024',
]);

const TRANSIENT_DATABASE_MESSAGE =
  /max clients reached|too many (?:database )?connections|connection pool timeout|connection timeout|timeout exceeded when trying to connect|timed out fetching a new connection|cannot connect now|database is starting up/i;

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
};

export function resolveDatabasePoolMax(
  configuredValue: string | undefined,
  environment = process.env.NODE_ENV,
) {
  const defaultMax = environment === 'production' ? 1 : 2;
  if (!configuredValue) return defaultMax;

  const parsed = Number(configuredValue);
  if (!Number.isInteger(parsed) || parsed < 1) return defaultMax;

  // Keep one process from consuming the majority of a small Supavisor pool.
  return Math.min(parsed, 5);
}

export function isTransientDatabaseConnectionError(error: unknown) {
  let current: unknown = error;

  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current !== 'object') return false;

    const candidate = current as ErrorLike;
    const code = typeof candidate.code === 'string' ? candidate.code.toUpperCase() : '';
    const message = typeof candidate.message === 'string' ? candidate.message : '';
    const transactionStartTimeout = code === 'P2028'
      && /unable to start a transaction in the given time/i.test(message);

    if (TRANSIENT_DATABASE_CODES.has(code) || transactionStartTimeout || TRANSIENT_DATABASE_MESSAGE.test(message)) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}

type DatabaseRetryOptions = {
  maxAttempts?: number;
  delaysMs?: readonly number[];
  sleep?: (milliseconds: number) => Promise<void>;
  onRetry?: (error: unknown, nextAttempt: number) => void;
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function withDatabaseConnectionRetry<T>(
  operation: () => Promise<T>,
  options: DatabaseRetryOptions = {},
) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 4);
  const delaysMs = options.delaysMs ?? [200, 500, 1_000];
  const sleep = options.sleep ?? wait;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts || !isTransientDatabaseConnectionError(error)) {
        throw error;
      }

      options.onRetry?.(error, attempt + 1);
      const delay = delaysMs[Math.min(attempt - 1, delaysMs.length - 1)] ?? 0;
      if (delay > 0) await sleep(delay);
    }
  }

  throw new Error('Database operation exhausted its retry attempts.');
}
