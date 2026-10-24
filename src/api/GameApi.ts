import type { CheckinResult, CheckinSource, GameState, Target } from '../types';

/** One contract for screens calling the same Next.js application's API. */
export interface GameApi {
  getState(): Promise<GameState>;
  subscribe(onChange: (state: GameState) => void, onError?: () => void): () => void;
  verifyStaff(pin: string): Promise<boolean>;
  checkin(teamId: number, target: Target, source: CheckinSource, token?: string): Promise<CheckinResult>;
  verifyTeam(teamId: number, pin: string): Promise<boolean>;
  getQrToken(cp: number): Promise<{ token: string; expiresInMs: number }>;
  startGame(): Promise<GameState>;
  undoLast(teamId: number): Promise<GameState>;
  reset(): Promise<GameState>;
}
export const EMPTY_STATE: GameState = { startedAt: null, checkins: [] };
