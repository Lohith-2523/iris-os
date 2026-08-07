# DocuSign application URLs

These values are reserved for a future Iris OS DocuSign integration. They are
configuration references only: no callback route, OAuth exchange, SDK client,
API call, webhook, or backend integration currently exists.

## Redirect URIs

- `https://irisos.app/integrations/docusign/callback`
- `https://www.irisos.app/integrations/docusign/callback`
- `http://localhost:3000/integrations/docusign/callback`

DocuSign requires the OAuth `redirect_uri` value to exactly match a redirect URI
registered against the integration key. Register the localhost URI only in the
developer/demo integration key.

## Allowed origins for CORS

- `https://irisos.app`
- `https://www.irisos.app`
- `http://localhost:3000`

Origins intentionally contain only the scheme, host, and port. Do not include a
path or trailing slash. Register localhost only for developer/demo use.

The source-of-truth constants are in
`src/config/docusign-application-urls.ts`.
