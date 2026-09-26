export function isTaskWriteConflict(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;
  const message = error instanceof Error ? error.message : String(error);

  return code === 'P2025'
    || code === '55P03'
    || message.includes('P2025')
    || message.includes('55P03')
    || message.toLowerCase().includes('lock timeout');
}
