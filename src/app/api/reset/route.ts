import { callFn } from '@/server/db';
import { handle, json, unauthorized } from '@/server/http';
import { isStaff } from '@/server/staff';
import type { GameState } from '@/types';

export const dynamic = 'force-dynamic';

/** POST /api/reset (staff) → erases all check-ins and the start time. */
export const POST = handle(async (req) => (isStaff(req) ? json(await callFn<GameState>('reset_game')) : unauthorized()));
