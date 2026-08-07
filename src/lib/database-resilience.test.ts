import { describe, expect, it, vi } from 'vitest';
import {
  isTransientDatabaseConnectionError,
  resolveDatabasePoolMax,
  withDatabaseConnectionRetry,
} from './database-resilience';

describe('resolveDatabasePoolMax', () => {
  it('uses conservative defaults for development and production', () => {
    expect(resolveDatabasePoolMax(undefined, 'development')).toBe(2);
    expect(resolveDatabasePoolMax(undefined, 'production')).toBe(1);
  });

  it('accepts a valid override but caps unsafe values', () => {
    expect(resolveDatabasePoolMax('3', 'production')).toBe(3);
    expect(resolveDatabasePoolMax('20', 'development')).toBe(5);
    expect(resolveDatabasePoolMax('invalid', 'production')).toBe(1);
  });
});

describe('isTransientDatabaseConnectionError', () => {
  it('recognizes Supavisor and Prisma connection-capacity errors', () => {
    expect(isTransientDatabaseConnectionError({
      code: 'EMAXCONNSESSION',
      message: 'max clients reached in session mode',
    })).toBe(true);
    expect(isTransientDatabaseConnectionError({ code: 'P2024' })).toBe(true);
    expect(isTransientDatabaseConnectionError({
      code: 'P2028',
      message: 'Transaction API error: Unable to start a transaction in the given time.',
    })).toBe(true);
    expect(isTransientDatabaseConnectionError({
      cause: { code: '53300', message: 'too many connections' },
    })).toBe(true);
  });

  it('does not retry validation or application errors', () => {
    expect(isTransientDatabaseConnectionError({ code: 'P2002' })).toBe(false);
    expect(isTransientDatabaseConnectionError({
      code: 'P2028',
      message: 'Transaction already closed: A query cannot be executed on a committed transaction.',
    })).toBe(false);
    expect(isTransientDatabaseConnectionError(new Error('Invalid invite'))).toBe(false);
  });
});

describe('withDatabaseConnectionRetry', () => {
  it('retries transient failures and returns the successful result', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ code: 'EMAXCONNSESSION' })
      .mockRejectedValueOnce({ code: 'P2024' })
      .mockResolvedValue('ready');
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withDatabaseConnectionRetry(operation, {
      maxAttempts: 4,
      delaysMs: [10, 20, 30],
      sleep,
    })).resolves.toBe('ready');

    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
  });

  it('does not retry non-transient failures', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Invalid workspace'));
    const sleep = vi.fn();

    await expect(withDatabaseConnectionRetry(operation, { sleep })).rejects.toThrow('Invalid workspace');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
