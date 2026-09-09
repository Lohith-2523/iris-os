// @vitest-environment node

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('checkbox visual states', () => {
  it('excludes checkboxes from inset input focus shadows', () => {
    expect(css).toContain(
      ".workspace-shell input:not([type='checkbox']):not([type='radio']):focus",
    );
    expect(css).toContain(
      ".workspace-auth input:not([type='checkbox']):not([type='radio']):focus",
    );
    expect(css).not.toContain('.workspace-shell input:focus,');
    expect(css).not.toContain('.workspace-auth input:focus,');
  });

  it('keeps checked and disabled checkbox surfaces bright', () => {
    const checkedStart = css.indexOf("input[type='checkbox']:not(.sr-only):checked {");
    const disabledStart = css.indexOf("input[type='checkbox']:not(.sr-only):disabled {");
    const checkedRule = css.slice(checkedStart, css.indexOf('}', checkedStart) + 1);
    const disabledRule = css.slice(disabledStart, css.indexOf('}', disabledStart) + 1);

    expect(checkedStart).toBeGreaterThan(-1);
    expect(disabledStart).toBeGreaterThan(-1);
    expect(checkedRule).toContain('background: #ffffff !important;');
    expect(disabledRule).toContain('opacity: 1;');
  });
});
