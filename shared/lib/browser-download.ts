const OBJECT_URL_REVOKE_DELAY_MS = 1_000;
export const FILE_DOWNLOAD_STARTED_EVENT = 'iris:file-download-started';

export type FileDownloadStartedDetail = {
  filename: string;
};

export function downloadFileFromUrl(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);

  try {
    link.click();
    window.dispatchEvent(new CustomEvent<FileDownloadStartedDetail>(FILE_DOWNLOAD_STARTED_EVENT, {
      detail: { filename },
    }));
  } finally {
    link.remove();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();
    // Some browsers consume the Blob after the click handler returns.
    // Revoking synchronously can leave a valid-looking blank file.
    window.setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
  }
}
