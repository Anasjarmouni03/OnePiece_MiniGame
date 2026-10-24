import { callFn } from '@/server/db';
import { handle, json } from '@/server/http';
import type { GameState } from '@/types';

export const dynamic = 'force-dynamic';

/** GET /api/state → whole game state (polled every 3 s by the screens). */
export const GET = handle(async () => json(await callFn<GameState>('get_state')));
