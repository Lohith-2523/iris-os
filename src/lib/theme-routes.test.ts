import { describe, expect, it } from 'vitest';
import { isWorkspaceThemePath, workspaceThemePaths } from './theme-routes';

describe('workspace theme routes', () => {
  it('keeps invoices inside the persisted workspace theme scope', () => {
    expect(workspaceThemePaths).toContain('/invoices');
    expect(isWorkspaceThemePath('/invoices')).toBe(true);
  });

  it.each(['/proposals', '/documents'])('keeps %s inside the persisted workspace theme scope', (pathname) => {
    expect(workspaceThemePaths).toContain(pathname as (typeof workspaceThemePaths)[number]);
    expect(isWorkspaceThemePath(pathname)).toBe(true);
    expect(isWorkspaceThemePath(`${pathname}/example`)).toBe(true);
  });

  it('keeps secure messaging inside the persisted workspace theme scope', () => {
    expect(workspaceThemePaths).toContain('/messages');
    expect(isWorkspaceThemePath('/messages')).toBe(true);
  });
});
