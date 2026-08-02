import { describe, expect, it } from 'vitest';
import { executableFileBlockReason, isDangerousFileName, safeDownloadName, validateBrowserFile } from './file-security';

function mockFile(name: string, type: string, bytes: number[]) {
  const data = new Uint8Array(bytes);
  return { name, type, size: data.byteLength, arrayBuffer: async () => data.buffer };
}

describe('file security', () => {
  it('blocks executable and active-content filenames', async () => {
    expect(isDangerousFileName('payload.exe')).toBe(true);
    expect(isDangerousFileName('payload.exe. ')).toBe(true);
    expect(isDangerousFileName('preview.svg')).toBe(true);
    expect(executableFileBlockReason({ name: 'report.pdf', type: 'application/x-msdownload' })).toContain('cannot be selected');
    await expect(validateBrowserFile(mockFile('payload.exe', 'application/x-msdownload', [0x4d, 0x5a]), 'message-attachment'))
      .resolves.toMatchObject({ ok: false });
  });

  it('checks spreadsheet signatures instead of trusting the extension', async () => {
    await expect(validateBrowserFile(mockFile('import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', [1, 2, 3]), 'spreadsheet-import'))
      .resolves.toMatchObject({ ok: false });
    await expect(validateBrowserFile(mockFile('import.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', [0x50, 0x4b, 3, 4]), 'spreadsheet-import'))
      .resolves.toEqual({ ok: true });
  });

  it('forces unsafe download names to an inert extension', () => {
    expect(safeDownloadName('../../run.cmd')).toBe('iris-attachment.download');
    expect(safeDownloadName('quarterly report.pdf')).toBe('quarterly report.pdf');
  });
});
