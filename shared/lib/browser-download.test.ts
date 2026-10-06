import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  downloadBlob,
  downloadFileFromUrl,
  FILE_DOWNLOAD_STARTED_EVENT,
  type FileDownloadStartedDetail,
} from './browser-download';

describe('downloadFileFromUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets the browser download a server response without copying it through a Blob URL', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const downloadStarted = vi.fn<EventListener>();
    window.addEventListener(FILE_DOWNLOAD_STARTED_EVENT, downloadStarted);

    downloadFileFromUrl('/api/invoices/invoice-1/pdf', 'INV-1.pdf');

    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(downloadStarted).toHaveBeenCalledOnce();
    expect((downloadStarted.mock.calls[0][0] as CustomEvent<FileDownloadStartedDetail>).detail).toEqual({ filename: 'INV-1.pdf' });
    expect(document.querySelector('a[download="INV-1.pdf"]')).toBeNull();
    window.removeEventListener(FILE_DOWNLOAD_STARTED_EVENT, downloadStarted);
  });
});

describe('downloadBlob', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps the object URL alive until the browser consumes the download', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:invoice-pdf');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadBlob(new Blob(['invoice'], { type: 'application/pdf' }), 'INV-1.pdf');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:invoice-pdf');
  });
});
