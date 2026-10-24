import { createHmac, timingSafeEqual } from 'node:crypto';
import { sessionSecret } from './secrets';

/**
 * Rotating checkpoint codes. The staff screen shows a QR for one checkpoint; its code changes every
 * WINDOW_MS, and a code is accepted for the current and the previous window (60 to 120 s),
 * so a photo of the QR shared with another team stops working almost at once.
 */
export const WINDOW_MS = 60_000;

const sign = (cp: number, window: number) =>
  createHmac('sha256', sessionSecret()).update(`qr:cp${cp}:${window}`).digest('base64url').slice(0, 12);

export function currentToken(cp: number, now = Date.now()) {
  const window = Math.floor(now / WINDOW_MS);
  return { token: sign(cp, window), expiresInMs: (window + 1) * WINDOW_MS - now };
}

export function isValidToken(cp: number, token: string | null | undefined, now = Date.now()): boolean {
  if (!token || token.length !== 12) return false;
  const window = Math.floor(now / WINDOW_MS);
  const given = Buffer.from(token);
  return [window, window - 1].some((w) => {
    const expected = Buffer.from(sign(cp, w));
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}
