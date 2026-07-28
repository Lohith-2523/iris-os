import { describe, expect, it } from 'vitest';
import { isWorkspaceThemePath, workspaceThemePaths } from './theme-routes';

describe('workspace theme routes', () => {
  it('keeps invoices inside the persisted workspace theme scope', () => {
    expect(workspaceThemePaths).toContain('/invoices');
    expect(isWorkspaceThemePath('/invoices')).toBe(true);
  });
});
