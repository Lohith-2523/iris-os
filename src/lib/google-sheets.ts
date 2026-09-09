import 'server-only';

import { prisma } from '@/lib/db';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integration-secrets';
import type { GoogleCalendarCredentials } from '@/lib/google-oauth';

type SheetValue = string | number | boolean;

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

async function accessToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('Google OAuth client credentials are not configured.');

  const ownerEmail = (process.env.GOOGLE_SHEETS_OAUTH_USER_EMAIL || 'cto.admin@irisos.app').trim().toLowerCase();
  const connections = await prisma.googleCalendarConnection.findMany({
    where: {
      status: { not: 'DISCONNECTED' },
      credentialCiphertext: { not: null },
      externalAccountId: { equals: ownerEmail, mode: 'insensitive' },
    },
    orderBy: { updatedAt: 'desc' },
  });

  for (const connection of connections) {
    try {
      const credentials = decryptIntegrationCredentials<GoogleCalendarCredentials>(connection.credentialCiphertext!);
      if (!credentials.scopes.includes(SHEETS_SCOPE) || !credentials.refreshToken) continue;
      if (credentials.accessToken && credentials.expiresAt && new Date(credentials.expiresAt).getTime() > Date.now() + 60_000) {
        return credentials.accessToken;
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: credentials.refreshToken,
          grant_type: 'refresh_token',
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      const payload = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error_description?: string };
      if (!response.ok || !payload.access_token) {
        console.error('Google Sheets OAuth refresh failed:', payload.error_description || response.status);
        continue;
      }

      credentials.accessToken = payload.access_token;
      credentials.expiresAt = new Date(Date.now() + (payload.expires_in || 3_600) * 1_000).toISOString();
      await prisma.googleCalendarConnection.update({
        where: { id: connection.id },
        data: { status: 'CONNECTED', credentialCiphertext: encryptIntegrationCredentials(credentials) },
      });
      return payload.access_token;
    } catch (error) {
      console.error('Unable to use a connected Google account for Sheets:', error);
    }
  }

  throw new Error(`Reconnect ${ownerEmail} and approve Google Sheets access.`);
}

async function sheetTitle(spreadsheetId: string, token: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({})) as { sheets?: Array<{ properties?: { title?: string } }>; error?: { message?: string } };
  const title = body.sheets?.[0]?.properties?.title;
  if (!response.ok || !title) throw new Error(body.error?.message || 'The Google Sheet has no writable worksheet.');
  return title;
}

function quotedRange(title: string, cells: string) {
  return `'${title.replace(/'/g, "''")}'!${cells}`;
}

export async function appendSheetRecord(input: {
  spreadsheetId: string;
  headers: string[];
  values: SheetValue[];
  idempotencyValue?: string;
}) {
  const token = await accessToken();
  const title = await sheetTitle(input.spreadsheetId, token);
  const headerRange = quotedRange(title, `A1:${String.fromCharCode(64 + Math.min(input.headers.length, 26))}1`);
  const headerResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(headerRange)}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const headerBody = await headerResponse.json().catch(() => ({})) as { values?: SheetValue[][]; error?: { message?: string } };
  if (!headerResponse.ok) throw new Error(headerBody.error?.message || 'Google Sheet headers could not be read.');

  if (!headerBody.values?.[0]?.some((value) => String(value).trim())) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ values: [input.headers] }),
      cache: 'no-store',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(body.error?.message || 'Google Sheet headers could not be created.');
    }
  }

  if (input.idempotencyValue) {
    const keyRange = quotedRange(title, 'A:A');
    const keyResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(keyRange)}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    const keyBody = await keyResponse.json().catch(() => ({})) as { values?: SheetValue[][] };
    if (keyResponse.ok && keyBody.values?.some((row) => String(row[0] || '').toLowerCase() === input.idempotencyValue?.toLowerCase())) return;
  }

  const appendRange = quotedRange(title, 'A:Z');
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ values: [input.values] }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(body.error?.message || 'Google Sheet row could not be appended.');
  }
}
