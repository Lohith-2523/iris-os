import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { generateStrategyPdf } from './pdf';

describe('generateStrategyPdf', () => {
  it('creates a readable multipage strategy document', async () => {
    const content = [
      '# Expansion strategy for Northstar',
      '## Executive direction',
      'Focus the next quarter on expanding the strongest existing client relationships.',
      ...Array.from({ length: 42 }, (_, index) => (
        `- Action ${index + 1}: Validate the opportunity, assign an owner, define evidence, and review progress in the weekly operating cadence.`
      )),
      '## Risks, assumptions, and information gaps',
      'This plan uses only manually onboarded client and project records.',
    ].join('\n');
    const pdf = await generateStrategyPdf({
      title: 'Expansion strategy for Northstar',
      type: 'UPSELL',
      goal: 'Create a focused and respectful expansion pipeline.',
      timeline: 'Next 90 days',
      content,
      organizationName: 'Iris OS Demo Agency',
      createdBy: 'Agency Admin',
      createdAt: new Date('2026-07-28T00:00:00.000Z'),
    });

    const bytes = Uint8Array.from(pdf);
    const parsed = await PDFDocument.load(bytes);
    expect(pdf.length).toBeGreaterThan(5_000);
    expect(parsed.getPageCount()).toBeGreaterThan(1);
    const outputDirectory = path.join(process.cwd(), 'tmp', 'pdfs');
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(path.join(outputDirectory, 'strategy-template-qa.pdf'), pdf);
  });
});
