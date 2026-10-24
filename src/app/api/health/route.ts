import { callFn } from '@/server/db';
import { handle, json } from '@/server/http';

export const dynamic = 'force-dynamic';
export const GET = handle(async () => {
  await callFn('get_state');
  return json({ ok: true });
});
