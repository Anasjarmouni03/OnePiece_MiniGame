import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

function prepare(values: Record<string, string>) {
  const env: NodeJS.ProcessEnv = { ...process.env, VERCEL: '1', NODE_ENV: 'production' };
  // Explicit empty values prevent Next's dotenv loader from importing local credentials.
  for (const name of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL', 'STAFF_PIN', 'TEAM_PINS', 'SESSION_SECRET']) env[name] = '';
  return spawnSync(process.execPath, ['scripts/prepare-build.mjs'], { env: { ...env, ...values }, encoding: 'utf8' });
}

test('a Vercel build refuses missing Neon configuration', () => {
  const result = prepare({});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is missing/);
});

test('a Vercel build validates application secrets before connecting to a database', () => {
  const base = { DATABASE_URL: 'postgresql://invalid.example/test' };
  assert.match(prepare(base).stderr, /SESSION_SECRET/);
  const secret = { ...base, SESSION_SECRET: 'a-test-secret-that-is-more-than-thirty-two-characters' };
  assert.match(prepare(secret).stderr, /STAFF_PIN/);
  assert.match(prepare({ ...secret, STAFF_PIN: '112233' }).stderr, /TEAM_PINS/);
  assert.match(prepare({ ...secret, STAFF_PIN: '112233', TEAM_PINS: '1:1234' }).stderr, /TEAM_PINS/);
});
