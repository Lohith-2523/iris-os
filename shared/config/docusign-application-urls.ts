/**
 * DocuSign application registration values.
 *
 * These constants are intentionally inert. No OAuth route, SDK client, token
 * exchange, CORS middleware, or DocuSign backend integration is implemented.
 * Register only the URLs needed for the environment being configured.
 */
export const DOCUSIGN_REDIRECT_URIS = [
  'https://irisos.app/integrations/docusign/callback',
  'https://www.irisos.app/integrations/docusign/callback',
  'http://localhost:3000/integrations/docusign/callback',
] as const;

export const DOCUSIGN_ALLOWED_ORIGINS = [
  'https://irisos.app',
  'https://www.irisos.app',
  'http://localhost:3000',
] as const;

export const DOCUSIGN_APPLICATION_URLS = {
  redirectUris: DOCUSIGN_REDIRECT_URIS,
  allowedOrigins: DOCUSIGN_ALLOWED_ORIGINS,
} as const;
