import { handle, json } from '@/server/http';
import { clearSession } from '@/server/session';
import { isStaff } from '@/server/staff';

export const dynamic = 'force-dynamic';
export const GET = handle(async (req) => json({ authenticated: isStaff(req) }));
export const DELETE = handle(async (req) => clearSession(json({ ok: true }), req, 'staff'));
