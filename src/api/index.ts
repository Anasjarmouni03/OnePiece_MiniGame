import { createHttpApi } from './httpApi';
import type { GameApi } from './GameApi';

/** The single data access point used by the whole app (same-site API routes under /api). */
export const api: GameApi = createHttpApi();
export type { GameApi } from './GameApi';
