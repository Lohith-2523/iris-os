export type UploadProfile = 'invoice-logo' | 'csv-import' | 'spreadsheet-import' | 'message-attachment';

export type SafeAttachmentCategory = 'IMAGE' | 'GIF' | 'VOICE' | 'VIDEO' | 'DOCUMENT' | 'ARCHIVE';

type FileLike = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  slice?(start?: number, end?: number): Blob;
};

export type FileValidationResult =
  | { ok: true; category?: SafeAttachmentCategory }
  | { ok: false; error: string };

const DANGEROUS_EXTENSIONS = new Set([
  'app', 'appx', 'apk', 'bat', 'bin', 'cmd', 'com', 'command', 'cpl', 'deb', 'desktop',
  'dll', 'dmg', 'exe', 'gadget', 'hta', 'htm', 'html', 'iso', 'jar', 'js', 'jse',
  'lnk', 'mjs', 'msi', 'msix', 'msp', 'pkg', 'pif', 'ps1', 'reg', 'rpm', 'scpt',
  'scr', 'sh', 'svg', 'sys', 'url', 'vb', 'vbe', 'vbs', 'workflow', 'wsf',
]);

const DANGEROUS_MIME_TYPES = new Set([
  'application/hta',
  'application/java-archive',
  'application/javascript',
  'application/vnd.microsoft.portable-executable',
  'application/x-dosexec',
  'application/x-executable',
  'application/x-httpd-php',
  'application/x-msdownload',
  'application/x-sh',
  'image/svg+xml',
  'text/html',
  'text/javascript',
]);

const MESSAGE_TYPES: Record<string, { category: SafeAttachmentCategory; mime: readonly string[] }> = {
  png: { category: 'IMAGE', mime: ['image/png'] },
  jpg: { category: 'IMAGE', mime: ['image/jpeg'] },
  jpeg: { category: 'IMAGE', mime: ['image/jpeg'] },
  webp: { category: 'IMAGE', mime: ['image/webp'] },
  gif: { category: 'GIF', mime: ['image/gif'] },
  avif: { category: 'IMAGE', mime: ['image/avif'] },
  mp3: { category: 'VOICE', mime: ['audio/mpeg'] },
  m4a: { category: 'VOICE', mime: ['audio/mp4', 'audio/x-m4a'] },
  ogg: { category: 'VOICE', mime: ['audio/ogg'] },
  wav: { category: 'VOICE', mime: ['audio/wav', 'audio/x-wav'] },
  webm: { category: 'VIDEO', mime: ['video/webm', 'audio/webm'] },
  mp4: { category: 'VIDEO', mime: ['video/mp4'] },
  mov: { category: 'VIDEO', mime: ['video/quicktime'] },
  pdf: { category: 'DOCUMENT', mime: ['application/pdf'] },
  txt: { category: 'DOCUMENT', mime: ['text/plain'] },
  csv: { category: 'DOCUMENT', mime: ['text/csv', 'application/csv', 'text/plain'] },
  docx: { category: 'DOCUMENT', mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
  xlsx: { category: 'DOCUMENT', mime: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
  pptx: { category: 'DOCUMENT', mime: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'] },
  zip: { category: 'ARCHIVE', mime: ['application/zip', 'application/x-zip-compressed'] },
};

function extensionOf(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[. ]+$/g, '');
  const index = normalized.lastIndexOf('.');
  return index > 0 ? normalized.slice(index + 1) : '';
}

export function isDangerousFileName(name: string) {
  return /[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/.test(name) || DANGEROUS_EXTENSIONS.has(extensionOf(name));
}

export function executableFileBlockReason(file: { name: string; type?: string }) {
  const mime = String(file.type || '').trim().toLowerCase();
  if (isDangerousFileName(file.name) || DANGEROUS_MIME_TYPES.has(mime)) {
    return `${file.name || 'This file'} is executable or contains active content and cannot be selected.`;
  }
  return null;
}

export function safeDownloadName(name: string) {
  const sanitized = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 180);
  return sanitized && !isDangerousFileName(sanitized) ? sanitized : 'iris-attachment.download';
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function isText(bytes: Uint8Array) {
  return !bytes.subarray(0, Math.min(bytes.length, 8_192)).includes(0);
}

function contentMatches(extension: string, bytes: Uint8Array) {
  if (['csv', 'txt'].includes(extension)) return isText(bytes);
  if (extension === 'png') return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (['jpg', 'jpeg'].includes(extension)) return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (extension === 'gif') return new TextDecoder().decode(bytes.subarray(0, 4)) === 'GIF8';
  if (extension === 'webp') return new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP';
  if (extension === 'pdf') return new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-';
  if (['xlsx', 'docx', 'pptx', 'zip'].includes(extension)) return startsWith(bytes, [0x50, 0x4b]);
  if (extension === 'wav') return new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WAVE';
  if (extension === 'ogg') return new TextDecoder().decode(bytes.subarray(0, 4)) === 'OggS';
  if (extension === 'mp3') return new TextDecoder().decode(bytes.subarray(0, 3)) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  if (['mp4', 'm4a', 'mov', 'avif'].includes(extension)) return new TextDecoder().decode(bytes.subarray(4, 8)) === 'ftyp';
  if (extension === 'webm') return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
  return true;
}

export async function validateBrowserFile(
  file: FileLike,
  profile: UploadProfile,
  options: { maxBytes?: number } = {},
): Promise<FileValidationResult> {
  const extension = extensionOf(file.name);
  const mime = file.type.trim().toLowerCase();
  if (!file.name.trim() || file.name.length > 220 || executableFileBlockReason(file)) {
    return { ok: false, error: 'This file type is not permitted for security reasons.' };
  }
  if (file.size <= 0) return { ok: false, error: 'The selected file is empty.' };
  if (options.maxBytes && file.size > options.maxBytes) {
    return { ok: false, error: `The selected file exceeds the ${Math.ceil(options.maxBytes / 1024 / 1024)} MB limit.` };
  }

  let allowedExtensions: readonly string[];
  if (profile === 'invoice-logo') allowedExtensions = ['png', 'jpg', 'jpeg'];
  else if (profile === 'csv-import') allowedExtensions = ['csv'];
  else if (profile === 'spreadsheet-import') allowedExtensions = ['csv', 'xlsx'];
  else allowedExtensions = Object.keys(MESSAGE_TYPES);
  if (!allowedExtensions.includes(extension)) return { ok: false, error: 'This file type is not supported.' };

  if (profile === 'invoice-logo' && mime && !['image/png', 'image/jpeg'].includes(mime)) {
    return { ok: false, error: 'Invoice logos must be PNG or JPEG images.' };
  }
  if (profile === 'message-attachment') {
    const descriptor = MESSAGE_TYPES[extension];
    if (mime && !descriptor.mime.includes(mime)) return { ok: false, error: 'The file extension and reported file type do not match.' };
  }

  const bytes = new Uint8Array(await (file.slice
    ? file.slice(0, 8_192).arrayBuffer()
    : file.arrayBuffer()));
  if (!contentMatches(extension, bytes)) return { ok: false, error: 'The file contents do not match its extension.' };
  return profile === 'message-attachment'
    ? { ok: true, category: MESSAGE_TYPES[extension].category }
    : { ok: true };
}
