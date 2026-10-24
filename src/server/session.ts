import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { sessionSecret, staffPin } from './secrets';
import { teamPin } from './teamPins';

type Identity = { role: 'staff' } | { role: 'team'; teamId: number };
type Session = Identity & { expiresAt: number };
const MAX_AGE_SECONDS = 12 * 60 * 60;
const cookieName = (role: Identity['role']) => `treasure-${role}`;

function signature(payload: string, identity: Identity): string {
  // Rotating a PIN or SESSION_SECRET also revokes existing sessions.
  const credential = identity.role === 'staff' ? staffPin() : teamPin(identity.teamId);
  if (!credential) return '';
  return createHmac('sha256', sessionSecret())
    .update(JSON.stringify([identity.role, credential, payload])).digest('base64url');
}

export function createSession(identity: Identity, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...identity, expiresAt: now + MAX_AGE_SECONDS * 1000 })).toString('base64url');
  return `${payload}.${signature(payload, identity)}`;
}

export function readSession(value: string | undefined, role: Identity['role'], now = Date.now()): Session | null {
  if (!value || value.length > 1024) return null;
  try {
    const parts = value.split('.');
    if (parts.length !== 2) return null;
    const [payload, supplied] = parts;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session;
    if (session.role !== role || !Number.isFinite(session.expiresAt) || session.expiresAt <= now ||
        session.expiresAt > now + MAX_AGE_SECONDS * 1000 ||
        (session.role === 'team' && !Number.isInteger(session.teamId))) return null;
    const expected = signature(payload, session);
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    return b.length > 0 && a.length === b.length && timingSafeEqual(a, b) ? session : null;
  } catch {
    return null;
  }
}

export function requestSession(req: Request, role: Identity['role']): Session | null {
  const raw = req.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName(role)}=`))?.slice(cookieName(role).length + 1);
  return readSession(raw, role);
}

export function setSession(response: NextResponse, req: Request, identity: Identity): NextResponse {
  response.cookies.set(cookieName(identity.role), createSession(identity), {
    httpOnly: true, secure: process.env.VERCEL === '1' || new URL(req.url).protocol === 'https:', sameSite: 'strict',
    path: '/', maxAge: MAX_AGE_SECONDS,
  });
  return response;
}

export function clearSession(response: NextResponse, req: Request, role: Identity['role']): NextResponse {
  response.cookies.set(cookieName(role), '', {
    httpOnly: true, secure: process.env.VERCEL === '1' || new URL(req.url).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 0,
  });
  return response;
}
