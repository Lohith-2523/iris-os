export function passwordConfirmationError(password: string, confirmation: string) {
  if (!confirmation) return 'Please confirm your password.';
  if (password !== confirmation) return 'Passwords do not match.';
  return null;
}
