import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { generateAtlasReportPdf, generateMilesTextReportPdf } from './pdf';
import type { AtlasReportDocument } from './types';

const documentData: AtlasReportDocument = {
  version: 1,
  kind: 'TEAM',
  title: 'Team Capacity Report',
  generatedAt: '2026-08-01T00:00:00.000Z',
  periodLabel: 'Current workspace snapshot',
  atlasNarrative: '## Capacity signal\nAtlas reviewed the **verified** team workload.\n\n| Risk | Owner |\n| --- | --- |\n| Capacity | Operations |',
  metrics: [{ label: 'Team size', value: '8', detail: 'Active members' }],
  highlights: ['Two people carry more than three active assignments.'],
  sections: [
    { title: 'Roster', description: 'Team detail', columns: ['Name', 'Role'], rows: [['Asha', 'Admin']] },
    { title: 'Assignments', description: 'Work detail', columns: ['Name', 'Project'], rows: [['Asha', 'Launch']] },
  ],
  recommendations: ['Review assignment balance.'],
  methodology: 'Verified workspace snapshot.',
};

describe('generateAtlasReportPdf', () => {
  it('creates a readable branded three-page PDF', async () => {
    const bytes = await generateAtlasReportPdf(documentData, { name: 'Studio North', color: '#4A435F' });
    const parsed = await PDFDocument.load(new Uint8Array(bytes));
    expect(parsed.getPageCount()).toBe(3);
    expect(parsed.getTitle()).toBe('Team Capacity Report');
    expect(bytes.length).toBeGreaterThan(5_000);
    const outputDirectory = path.join(process.cwd(), 'tmp', 'pdfs');
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(path.join(outputDirectory, 'atlas-report-template-qa.pdf'), bytes);
  });

  it('renders every saved Miles text report as a paginated PDF', async () => {
    const content = Array.from({ length: 180 }, (_, index) => `- Specific finding ${index + 1}: verified workspace detail ${index + 1}.`).join('\n');
    const bytes = await generateMilesTextReportPdf({
      content,
      createdAt: '2026-09-28T00:00:00.000Z',
      title: 'Historical Miles Report',
      type: 'FINANCIAL',
    }, { name: 'Studio North', color: '#4A435F' });
    const parsed = await PDFDocument.load(new Uint8Array(bytes));

    expect(parsed.getPageCount()).toBeGreaterThan(3);
    expect(parsed.getTitle()).toBe('Historical Miles Report');
    expect(bytes.length).toBeGreaterThan(10_000);
  });
});
