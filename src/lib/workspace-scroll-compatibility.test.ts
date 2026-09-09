// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalsCss = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const workspaceShell = readFileSync(
  join(process.cwd(), 'src/components/app-shell/workspace-shell.tsx'),
  'utf8',
);

describe('workspace scroll compatibility', () => {
  it('preserves intrinsic page height for legacy Chromium scroll measurement', () => {
    const pageRule = globalsCss.match(/\.workspace-page\s*\{[\s\S]*?\}/)?.[0];

    expect(pageRule).toBeDefined();
    expect(pageRule).toContain('flex: 1 0 auto;');
    expect(pageRule).toContain('min-height: 100%;');
    expect(pageRule).not.toContain('flex: 1 1 0%;');
    expect(pageRule).not.toContain('min-height: 0;');
  });

  it('keeps the primary vertical scroller on legacy-compatible overflow values', () => {
    const recoveryBlock = globalsCss.match(
      /\/\* Scroll recovery \+ Atlas topbar menu\.[\s\S]*?(?=\.atlas-topbar-menu-trigger)/,
    )?.[0];

    expect(recoveryBlock).toBeDefined();
    expect(recoveryBlock).toContain('overflow-x: hidden !important;');
    expect(recoveryBlock).toContain('overflow-y: auto !important;');
    expect(recoveryBlock).not.toContain('overflow-x: clip');
    expect(workspaceShell).toContain('overflow-y-auto overflow-x-hidden');
    expect(workspaceShell).not.toContain('overflow-y-auto overflow-x-clip');
  });

  it('does not disable workspace scrolling based on full-screen descendants', () => {
    expect(globalsCss).not.toContain(
      '.workspace-shell:has(.fixed.inset-0) .workspace-main',
    );
  });
});
