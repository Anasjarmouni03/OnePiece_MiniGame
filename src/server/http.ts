import { NextResponse } from 'next/server';

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export const unauthorized = () => json({ error: 'unauthorized' }, 401);
export class InvalidRequest extends Error {}

export async function readObject(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new InvalidRequest();
  const reader = req.body?.getReader();
  if (!reader) throw new InvalidRequest();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { await reader.cancel(); throw new InvalidRequest(); }
      chunks.push(value);
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidRequest();
    return value as Record<string, unknown>;
  } catch {
    throw new InvalidRequest();
  }
}

export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const origin = req.headers.get('origin');
        // Next may construct req.url with its internal server address behind a proxy.
        // The Host header identifies the browser-facing site; Vercel serves it over HTTPS.
        const url = new URL(req.url);
        const host = req.headers.get('host') || url.host;
        const protocol = process.env.VERCEL ? 'https:' : url.protocol;
        const expectedOrigin = `${protocol}//${host}`;
        if (req.headers.get('sec-fetch-site') === 'cross-site' ||
            (origin && origin !== expectedOrigin)) return json({ error: 'forbidden-origin' }, 403);
      }
      return await fn(req);
    } catch (error) {
      if (error instanceof InvalidRequest) return json({ error: 'invalid-request' }, 400);
      // Never log connection URLs, request bodies, PINs, or cookies.
      console.error('API request failed:', error instanceof Error ? error.name : 'UnknownError');
      return json({ error: 'server-error' }, 500);
    }
  };
}
