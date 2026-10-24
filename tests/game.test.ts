import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { migrate } from '../scripts/migrate.mjs';
import { TEAMS } from '../src/config/game';
import { validateCheckin } from '../src/lib/progress';
import { createSession } from '../src/server/session';
import { currentToken } from '../src/server/qr';
import type { CheckinResult, GameState, Target } from '../src/types';
import { POST as checkin } from '../src/app/api/checkins/route';
import { POST as verifyStaff } from '../src/app/api/staff/verify/route';
import { POST as verifyTeam } from '../src/app/api/teams/verify/route';
import { GET as staffSession, DELETE as staffLogout } from '../src/app/api/staff/session/route';
import { GET as teamSession } from '../src/app/api/teams/session/route';
import { POST as start } from '../src/app/api/game/start/route';
import { POST as reset } from '../src/app/api/reset/route';
import { DELETE as undo } from '../src/app/api/checkins/last/route';
import { GET as qr } from '../src/app/api/qr/route';

const db = new PGlite();
const adapter = {
  async query(sql: string, params?: unknown[]) {
    if (params) return db.query(sql, params);
    const results = await db.exec(sql);
    return results[results.length - 1] ?? { rows: [] };
  },
};
const testGlobal = globalThis as unknown as { treasurePool?: unknown };
const fn = async <T>(name: string, params: unknown[] = []): Promise<T> => {
  const placeholders = params.map((_, i) => `$${i + 1}`).join(',');
  const result = await db.query<{ value: T }>(`select ${name}(${placeholders}) as value`, params);
  return result.rows[0].value;
};
const state = () => fn<GameState>('get_state');
const staffCookie = () => `treasure-staff=${createSession({ role: 'staff' })}`;
const teamCookie = (teamId = 1) => `treasure-team=${createSession({ role: 'team', teamId })}`;
function req(path: string, method = 'GET', body?: unknown, cookie = '') {
  return new Request(`https://game.example/api${path}`, {
    method, headers: { 'content-type': 'application/json', cookie, origin: 'https://game.example' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(async () => {
  process.env.SESSION_SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';
  process.env.STAFF_PIN = '112233';
  process.env.TEAM_PINS = '1:1234,2:2345,3:3456,4:4567,5:5678,6:6789,7:7890,8:8901';
  await db.waitReady;
  await migrate(adapter);
  testGlobal.treasurePool = adapter;
});
beforeEach(async () => {
  await fn('reset_game');
  await db.query('delete from auth_attempts');
});
after(async () => { delete testGlobal.treasurePool; await db.close(); });

test('fresh migrations seed eight matching routes; repeated deployment preserves game progress', async () => {
  assert.deepEqual(await state(), { startedAt: null, checkins: [] });
  const rows = await db.query<{ id: number; route: number[] }>('select id, route from teams order by id');
  assert.deepEqual(rows.rows, TEAMS.map((team) => ({ id: team.id, route: team.route })));
  await fn('start_game');
  await fn('register_checkin', [1, '1', 'staff']);
  const previous = await state();
  await migrate(adapter);
  assert.deepEqual(await state(), previous);
});

test('a changed team configuration is refused during a game and rolled back safely', async () => {
  await fn('start_game');
  await db.query("update teams set color_name = 'Changed' where id = 1");
  await assert.rejects(migrate(adapter), /active game/);
  await db.query("update teams set color_name = 'Rouge' where id = 1");
  assert.ok((await state()).startedAt);
});

test('database enforces start, route order, duplicates, staff-only finish, undo and reset', async () => {
  assert.deepEqual(await fn('register_checkin', [1, '1', 'team']), { ok: false, reason: 'not-started' });
  await fn('start_game');
  assert.deepEqual(await fn('register_checkin', [1, '2', 'team']), { ok: false, reason: 'wrong-checkpoint' });
  assert.deepEqual(await fn('register_checkin', [1, 'SALLE', 'staff']), { ok: false, reason: 'salle-too-early' });
  for (const cp of [1, 2, 3, 4, 5]) assert.equal((await fn<CheckinResult>('register_checkin', [1, String(cp), 'team'])).ok, true);
  assert.deepEqual(await fn('register_checkin', [1, '5', 'team']), { ok: false, reason: 'duplicate' });
  assert.deepEqual(await fn('register_checkin', [1, 'SALLE', 'team']), { ok: false, reason: 'salle-too-early' });
  assert.equal((await fn<CheckinResult>('register_checkin', [1, 'SALLE', 'staff'])).ok, true);
  assert.deepEqual(await fn('register_checkin', [1, '1', 'staff']), { ok: false, reason: 'finished' });
  await fn('undo_last', [1]);
  assert.equal((await state()).checkins.length, 5);
  await fn('reset_game');
  assert.deepEqual(await state(), { startedAt: null, checkins: [] });
});

test('all eight team routes agree with the UI validator at every step', async () => {
  await fn('start_game');
  const targets: Target[] = [1, 2, 3, 4, 5, 'SALLE'];
  for (const team of TEAMS) {
    for (const next of [...team.route, 'SALLE' as const]) {
      const previous = await state();
      for (const source of ['team', 'staff'] as const) {
        for (const target of targets) {
          const expected = validateCheckin(previous, team.id, target, source);
          if (!expected) continue;
          assert.deepEqual(await fn('register_checkin', [team.id, String(target), source]), { ok: false, reason: expected });
        }
      }
      assert.deepEqual(await state(), previous, 'rejected attempts must not mutate progress');
      assert.equal((await fn<CheckinResult>('register_checkin', [team.id, String(next), next === 'SALLE' ? 'staff' : 'team'])).ok, true);
    }
  }
  assert.equal((await state()).checkins.length, 48);
});

test('API staff operations require a valid cookie and reject a forged source', async () => {
  assert.equal((await start(req('/game/start', 'POST'))).status, 401);
  assert.equal((await reset(req('/reset', 'POST'))).status, 401);
  assert.equal((await undo(req('/checkins/last?teamId=1', 'DELETE'))).status, 401);
  assert.equal((await qr(req('/qr?cp=1'))).status, 401);
  assert.equal((await checkin(req('/checkins', 'POST', { teamId: 1, target: 1, source: 'staff' }, teamCookie()))).status, 401);
  assert.equal((await start(req('/game/start', 'POST', undefined, staffCookie()))).status, 200);
  assert.equal((await qr(req('/qr?cp=1', 'GET', undefined, staffCookie()))).status, 200);
});

test('API login sets cookies and rate limits persist in PostgreSQL, isolated per team', async () => {
  for (let i = 0; i < 20; i++) assert.equal((await verifyStaff(req('/staff/verify', 'POST', { pin: '000000' }))).status, 401);
  const blocked = await verifyStaff(req('/staff/verify', 'POST', { pin: '112233' }));
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  const team = await verifyTeam(req('/teams/verify', 'POST', { teamId: 1, pin: '1234' }));
  assert.equal(team.status, 200);
  assert.match(team.headers.get('set-cookie')!, /treasure-team=.*HttpOnly/);
  const buckets = await db.query<{ key: string }>('select key from auth_attempts');
  assert.equal(buckets.rows.length, 2);
  assert.ok(buckets.rows.every((row) => /^[a-f0-9]{64}$/.test(row.key)));
  await db.query("update auth_attempts set expires_at = now() - interval '1 second'");
  const login = await verifyStaff(req('/staff/verify', 'POST', { pin: '112233' }));
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie')!, /treasure-staff=.*HttpOnly/);
});

test('API validates sessions and QR tokens across a full phone check-in and staff correction', async () => {
  assert.deepEqual(await (await staffSession(req('/staff/session'))).json(), { authenticated: false });
  assert.deepEqual(await (await staffSession(req('/staff/session', 'GET', undefined, staffCookie()))).json(), { authenticated: true });
  assert.deepEqual(await (await teamSession(req('/teams/session', 'GET', undefined, teamCookie(2)))).json(), { teamId: 2 });
  await start(req('/game/start', 'POST', undefined, staffCookie()));
  const payload = { teamId: 1, target: 1, source: 'team', token: currentToken(1).token };
  assert.equal((await checkin(req('/checkins', 'POST', payload))).status, 409);
  assert.equal((await checkin(req('/checkins', 'POST', payload, teamCookie(2)))).status, 409);
  const expired = await checkin(req('/checkins', 'POST', { ...payload, token: currentToken(1, Date.now() - 180_000).token }, teamCookie()));
  assert.deepEqual(await expired.json(), { ok: false, reason: 'expired-qr' });
  assert.equal((await checkin(req('/checkins', 'POST', payload, teamCookie()))).status, 200);
  assert.deepEqual(await (await checkin(req('/checkins', 'POST', payload, teamCookie()))).json(), { ok: false, reason: 'duplicate' });
  assert.equal((await state()).checkins.length, 1);
  await undo(req('/checkins/last?teamId=1', 'DELETE', undefined, staffCookie()));
  assert.equal((await state()).checkins.length, 0);
  assert.match((await staffLogout(req('/staff/session', 'DELETE'))).headers.get('set-cookie')!, /Max-Age=0/);
});

test('API rejects malformed payloads and invalid team IDs without writing state', async () => {
  for (const body of [null, [], { teamId: 99, target: 1, source: 'team' }, { teamId: 1, target: '1', source: 'team' }, { teamId: 1, target: 1, source: 'other' }]) {
    assert.equal((await checkin(req('/checkins', 'POST', body))).status, 400);
  }
  assert.equal((await undo(req('/checkins/last?teamId=', 'DELETE', undefined, staffCookie()))).status, 400);
  assert.deepEqual(await state(), { startedAt: null, checkins: [] });
});
