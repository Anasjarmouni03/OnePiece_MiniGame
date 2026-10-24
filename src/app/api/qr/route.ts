import { handle, json, unauthorized } from '@/server/http';
import { currentToken, WINDOW_MS } from '@/server/qr';
import { isStaff } from '@/server/staff';

export const dynamic = 'force-dynamic';

/** GET /api/qr?cp=3 (staff) → the current code for that checkpoint's QR (changes every minute). */
export const GET = handle(async (req) => {
  if (!isStaff(req)) return unauthorized();
  const cp = Number(new URL(req.url).searchParams.get('cp'));
  if (![1, 2, 3, 4, 5].includes(cp)) return json({ error: 'invalid-request' }, 400);
  return json({ cp, ...currentToken(cp), windowMs: WINDOW_MS });
});
