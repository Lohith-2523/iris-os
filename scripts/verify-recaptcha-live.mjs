import { createServer } from 'node:http';

const host = '127.0.0.1';
const port = 3847;
const projectId = 'gen-lang-client-0335126976';
const siteKey = '6LeHV_AtAAAAAJ0j7voXH7Bc03WE2HXytR9pg_27';
const expectedAction = 'CONTACT';
const apiKey = process.env.RECAPTCHA_ENTERPRISE_API_KEY?.trim();

if (!apiKey) throw new Error('RECAPTCHA_ENTERPRISE_API_KEY is missing from .env.');

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>IrisOS reCAPTCHA verification</title>
    <script src="https://www.google.com/recaptcha/enterprise.js" async defer></script>
    <style>
      :root { color-scheme: dark; font-family: Arial, sans-serif; }
      body { min-height: 100vh; display: grid; place-items: center; margin: 0; background: #09090b; color: #f4f4f5; }
      main { width: min(90vw, 30rem); padding: 2rem; border: 1px solid #29292d; border-radius: 1.5rem; background: #141416; }
      h1 { margin-top: 0; font-size: 1.35rem; }
      p, pre { color: #a1a1aa; line-height: 1.6; }
      pre { overflow-wrap: anywhere; white-space: pre-wrap; }
      .g-recaptcha { margin-top: 1.5rem; }
    </style>
    <script>
      async function onVerified(token) {
        const result = document.getElementById('result');
        result.textContent = 'Creating assessment…';
        const response = await fetch('/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        result.textContent = JSON.stringify(await response.json(), null, 2);
      }
    </script>
  </head>
  <body>
    <main>
      <h1>Live reCAPTCHA verification</h1>
      <p>Complete the Google verification once. The token is assessed immediately and is not used to send a contact request.</p>
      <div class="g-recaptcha" data-sitekey="${siteKey}" data-action="${expectedAction}" data-callback="onVerified"></div>
      <pre id="result" role="status">Waiting for a genuine browser token…</pre>
    </main>
  </body>
</html>`;

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(page);
    return;
  }

  if (request.method === 'POST' && request.url === '/verify') {
    try {
      const { token } = await readJson(request);
      if (typeof token !== 'string' || token.length < 20) throw new Error('A valid response token was not received.');
      const googleResponse = await fetch(
        `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            event: { token, siteKey, expectedAction },
          }),
        },
      );
      const assessment = await googleResponse.json();
      const result = {
        httpStatus: googleResponse.status,
        assessment: assessment.name,
        valid: assessment.tokenProperties?.valid ?? false,
        invalidReason: assessment.tokenProperties?.invalidReason,
        action: assessment.tokenProperties?.action,
        hostname: assessment.tokenProperties?.hostname,
        score: assessment.riskAnalysis?.score,
        reasons: assessment.riskAnalysis?.reasons || [],
        error: assessment.error,
      };
      console.log(JSON.stringify(result, null, 2));
      response.writeHead(googleResponse.ok ? 200 : googleResponse.status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(400, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Verification failed.' }));
    }
    return;
  }

  response.writeHead(404).end();
});

server.listen(port, host, () => {
  console.log(`Open http://${host}:${port} to complete live reCAPTCHA verification.`);
});
