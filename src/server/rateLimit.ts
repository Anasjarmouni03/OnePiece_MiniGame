import { createHmac } from 'node:crypto';
import { pool } from './db';
import { json } from './http';
import { sessionSecret } from './secrets';

/** Shared across Vercel instances; no Redis or in-memory counter. */
export async function loginLimit(req: Request, scope: string): Promise<Response | null> {
  const address = process.env.VERCEL
    ? req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    : req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = createHmac('sha256', sessionSecret()).update(`${scope}:${address}`).digest('hex');
  const { rows } = await pool().query<{ attempts: number; retry_after: number }>(`
    insert into auth_attempts (key, attempts, expires_at) values ($1, 1, now() + interval '15 minutes')
    on conflict (key) do update set
      attempts = case when auth_attempts.expires_at <= now() then 1 else least(auth_attempts.attempts + 1, 21) end,
      expires_at = case when auth_attempts.expires_at <= now() then now() + interval '15 minutes' else auth_attempts.expires_at end
    returning attempts, greatest(1, ceil(extract(epoch from (expires_at - now()))))::int as retry_after
  `, [key]);
  await pool().query('delete from auth_attempts where expires_at < now()');
  if (rows[0].attempts <= 20) return null;
  const response = json({ error: 'too-many-attempts' }, 429);
  response.headers.set('Retry-After', String(rows[0].retry_after));
  return response;
}
