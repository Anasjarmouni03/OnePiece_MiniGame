import { handle, json } from '@/server/http';
import { clearSession, requestSession } from '@/server/session';

export const dynamic = 'force-dynamic';
export const GET = handle(async (req) => {
  const session = requestSession(req, 'team');
  return json({ teamId: session?.role === 'team' ? session.teamId : null });
});
export const DELETE = handle(async (req) => clearSession(json({ ok: true }), req, 'team'));
