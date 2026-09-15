export type ChatFileArtifact = {
  href: string;
  fileName: string;
};

const MARKDOWN_LINK = /\[([^\]]+)]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const FILE_EXTENSION = /\.(?:avif|csv|docx|gif|jpe?g|m4a|mov|mp3|mp4|ogg|pdf|png|pptx|txt|wav|webm|webp|xlsx|zip)$/i;
const DOCUMENT_API_PATH = /^\/api\/(?:document-signing|generated-documents|invoices|reports|strategies)\//i;

function extensionForHref(href: string) {
  const url = new URL(href, 'https://atlas.local');
  const format = url.searchParams.get('format')?.toLowerCase();
  if (format && ['pdf', 'docx', 'zip'].includes(format)) return format;
  if (/\/pdf\/?$/i.test(url.pathname)) return 'pdf';
  const match = url.pathname.match(FILE_EXTENSION);
  return match?.[0].slice(1).toLowerCase() || '';
}

function isFileHref(href: string) {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  try {
    const url = new URL(href, 'https://atlas.local');
    return FILE_EXTENSION.test(url.pathname) || (DOCUMENT_API_PATH.test(url.pathname) && /\/(?:download|pdf)\/?$/i.test(url.pathname));
  } catch {
    return false;
  }
}

function fallbackFileName(href: string, label: string) {
  const url = new URL(href, 'https://atlas.local');
  const pathName = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) || 'document');
  if (FILE_EXTENSION.test(pathName)) return pathName;
  const extension = extensionForHref(href) || 'download';
  const usefulLabel = label
    .replace(/\b(?:open|or|download|the|file|document|pdf|docx|zip)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${usefulLabel || 'Atlas document'}.${extension}`;
}

export function extractChatFileArtifacts(markdown: string) {
  const artifacts: ChatFileArtifact[] = [];
  const seen = new Set<string>();
  let displayText = markdown.replace(MARKDOWN_LINK, (whole, label: string, href: string) => {
    if (!isFileHref(href)) return whole;
    if (!seen.has(href)) {
      seen.add(href);
      artifacts.push({ href, fileName: fallbackFileName(href, label) });
    }
    return '';
  });

  displayText = displayText
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/([.!?])\1+/g, '$1')
    .replace(/^[ \t]*[.,;:]+[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { displayText, artifacts };
}
