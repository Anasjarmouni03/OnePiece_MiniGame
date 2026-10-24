import { handle, json, readObject, unauthorized } from '@/server/http';
import { loginLimit } from '@/server/rateLimit';
import { setSession } from '@/server/session';
import { checkPin } from '@/server/staff';

export const dynamic = 'force-dynamic';
export const POST = handle(async (req) => {
  const body = await readObject(req);
  if (typeof body.pin !== 'string' || body.pin.length > 128) return json({ error: 'invalid-request' }, 400);
  const limited = await loginLimit(req, 'staff');
  if (limited) return limited;
  if (!checkPin(body.pin)) return unauthorized();
  return setSession(json({ ok: true }), req, { role: 'staff' });
});
