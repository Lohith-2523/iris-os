const CREATION_VERB = /\b(?:create|draft|generate|prepare|produce|write|build|develop)\b/i;
const DOCUMENT_NOUN = /\b(?:report|strategy|strategic plan)\b/i;

export function isDocumentGenerationRequest(query: string) {
  return CREATION_VERB.test(query) && DOCUMENT_NOUN.test(query);
}

export function isDetailedDocument(content: string, minimumWords: number, minimumHeadings: number) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const headings = content.split('\n').filter((line) => /^#{1,3}\s+\S/.test(line.trim())).length;
  return words >= minimumWords && headings >= minimumHeadings;
}
