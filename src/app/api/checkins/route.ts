import { TEAMS } from '@/config/game';
import { callFn } from '@/server/db';
import { handle, json, readObject, unauthorized } from '@/server/http';
import { isValidToken } from '@/server/qr';
import { requestSession } from '@/server/session';
import { isStaff } from '@/server/staff';
import type { CheckinResult } from '@/types';

export const dynamic = 'force-dynamic';
export const POST = handle(async (req) => {
  const { teamId, target, source, token } = await readObject(req);
  if (typeof teamId !== 'number' || !TEAMS.some((team) => team.id === teamId) ||
      ![1, 2, 3, 4, 5, 'SALLE'].includes(target as number | string) ||
      (source !== 'staff' && source !== 'team')) return json({ error: 'invalid-request' }, 400);

  if (source === 'staff') {
    if (!isStaff(req)) return unauthorized();
  } else {
    const session = requestSession(req, 'team');
    if (session?.role !== 'team' || session.teamId !== teamId) return json({ ok: false, reason: 'wrong-pin' }, 409);
    if (target === 'SALLE') return json({ ok: false, reason: 'salle-too-early' }, 409);
    if (typeof token !== 'string' || !isValidToken(Number(target), token)) return json({ ok: false, reason: 'expired-qr' }, 409);
  }

  const result = await callFn<CheckinResult>('register_checkin', [teamId, String(target), source]);
  return json(result, result.ok ? 200 : 409);
});
