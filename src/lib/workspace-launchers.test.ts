import { describe, expect, it } from 'vitest';
import { canShowAtlasLauncher } from './workspace-launchers';

describe('canShowAtlasLauncher', () => {
  it.each(['client', 'CLIENT', 'member', 'MEMBER'])('hides Atlas and briefing launchers for %s workspaces', (role) => {
    expect(canShowAtlasLauncher(role)).toBe(false);
  });

  it.each(['admin', 'sub_admin'])('keeps the launcher available for %s workspaces', (role) => {
    expect(canShowAtlasLauncher(role)).toBe(true);
  });

  it('does not render before the workspace role is known', () => {
    expect(canShowAtlasLauncher()).toBe(false);
  });
});
