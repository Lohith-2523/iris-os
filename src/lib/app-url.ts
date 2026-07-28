type RequestWithUrl = {
  headers: Headers;
  nextUrl: { origin: string };
};

export function publicAppUrl(request: RequestWithUrl) {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    return `${forwardedProto}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}
