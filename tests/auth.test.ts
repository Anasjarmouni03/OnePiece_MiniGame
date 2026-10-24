import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createSession, readSession, requestSession, setSession, clearSession } from '../src/server/session';
import { currentToken, isValidToken, WINDOW_MS } from '../src/server/qr';
import { json, handle, readObject } from '../src/server/http';
import { isTeamPin } from '../src/server/teamPins';

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
  process.env.STAFF_PIN = '112233';
  process.env.TEAM_PINS = '1:1234,2:2345,3:3456,4:4567,5:5678,6:6789,7:7890,8:8901';
});

test('sessions reject tampering, expired tokens, the wrong role, and changed credentials', () => {
  const now = Date.now();
  const value = createSession({ role: 'staff' }, now);
  assert.equal(readSession(value, 'staff', now)?.role, 'staff');
  assert.equal(readSession(value + 'x', 'staff', now), null);
  assert.equal(readSession(value, 'team', now), null);
  assert.equal(readSession(value, 'staff', now + 12 * 60 * 60 * 1000), null);
  assert.equal(readSession(value + '.extra', 'staff', now), null);
  process.env.STAFF_PIN = '445566';
  assert.equal(readSession(value, 'staff', now), null);
});

test('team sessions are bound to their team and revoked by a PIN rotation', () => {
  const value = createSession({ role: 'team', teamId: 2 });
  const session = requestSession(new Request('https://game.example/checkin', {
    headers: { cookie: `unrelated=value; treasure-team=${value}` },
  }), 'team');
  assert.equal(session?.role === 'team' ? session.teamId : null, 2);
  process.env.TEAM_PINS = process.env.TEAM_PINS!.replace('2:2345', '2:9999');
  assert.equal(readSession(value, 'team'), null);
  assert.equal(isTeamPin(2, '9999'), true);
  assert.equal(isTeamPin(2, '2345'), false);
});

test('HTTPS cookies are HttpOnly, Secure and SameSite=Strict; logout expires the cookie', () => {
  const request = new Request('https://game.example/api/staff/verify');
  const response = setSession(json({ ok: true }), request, { role: 'staff' });
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=strict/i);
  assert.doesNotMatch(cookie, /112233/);
  const logout = clearSession(json({ ok: true }), request, 'staff');
  assert.match(logout.headers.get('set-cookie')!, /Max-Age=0/i);
});

test('rotating QR tokens accept only the correct checkpoint and two time windows', () => {
  const now = 10 * WINDOW_MS + 1000;
  const { token, expiresInMs } = currentToken(3, now);
  assert.equal(expiresInMs, 59_000);
  assert.equal(isValidToken(3, token, now), true);
  assert.equal(isValidToken(3, token, now + WINDOW_MS), true);
  assert.equal(isValidToken(3, token, now + 2 * WINDOW_MS), false);
  assert.equal(isValidToken(4, token, now), false);
  assert.equal(isValidToken(3, token.slice(1), now), false);
});

test('JSON handlers reject cross-site writes, arrays, null, malformed and oversized bodies', async () => {
  const handler = handle(async (req) => json(await readObject(req)));
  const request = (body: string, extra: Record<string, string> = {}) => new Request('https://game.example/api/test', {
    method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body,
  });
  assert.equal((await handler(request('{}', { origin: 'https://attacker.example' }))).status, 403);
  assert.equal((await handler(request('{}', { 'sec-fetch-site': 'cross-site' }))).status, 403);
  for (const body of ['null', '[]', '{', JSON.stringify({ value: 'x'.repeat(4096) })]) {
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal((await handler(request('{"ok":true}', { origin: 'https://game.example' }))).status, 200);
});


test('same-origin browser requests work when Next uses an internal request URL', async () => {
  const handler = handle(async (req) => json(await readObject(req)));
  const request = new Request('http://internal-server:3000/api/test', {
    method: 'POST', body: '{}',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:3100', origin: 'http://127.0.0.1:3100' },
  });
  assert.equal((await handler(request)).status, 200);
});
