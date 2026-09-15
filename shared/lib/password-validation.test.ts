import { describe, expect, it } from 'vitest';
import { passwordConfirmationError } from './password-validation';

describe('passwordConfirmationError', () => {
  it('requires a confirmation', () => {
    expect(passwordConfirmationError('secure-password', '')).toBe('Please confirm your password.');
  });

  it('rejects a different confirmation', () => {
    expect(passwordConfirmationError('secure-password', 'different-password')).toBe('Passwords do not match.');
  });

  it('accepts matching passwords', () => {
    expect(passwordConfirmationError('secure-password', 'secure-password')).toBeNull();
  });
});
