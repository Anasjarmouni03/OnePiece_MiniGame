import { callFn } from '@/server/db';
import { handle, json, unauthorized } from '@/server/http';
import { isStaff } from '@/server/staff';
import type { GameState } from '@/types';

export const dynamic = 'force-dynamic';

/** POST /api/game/start (staff) → starts the game clock (no effect if already started). */
export const POST = handle(async (req) => (isStaff(req) ? json(await callFn<GameState>('start_game')) : unauthorized()));
