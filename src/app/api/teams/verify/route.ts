import { TEAMS } from '@/config/game';
import { handle, json, readObject, unauthorized } from '@/server/http';
import { loginLimit } from '@/server/rateLimit';
import { setSession } from '@/server/session';
import { isTeamPin } from '@/server/teamPins';

export const dynamic = 'force-dynamic';
export const POST = handle(async (req) => {
  const body = await readObject(req);
  if (typeof body.teamId !== 'number' || !TEAMS.some((team) => team.id === body.teamId) ||
      typeof body.pin !== 'string' || body.pin.length > 128) return json({ error: 'invalid-request' }, 400);
  const limited = await loginLimit(req, `team:${body.teamId}`);
  if (limited) return limited;
  if (!isTeamPin(body.teamId, body.pin)) return unauthorized();
  return setSession(json({ ok: true }), req, { role: 'team', teamId: body.teamId });
});
