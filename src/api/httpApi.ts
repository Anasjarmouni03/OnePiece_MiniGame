import { POLL_MS } from '../config/game';
import type { CheckinResult, GameState } from '../types';
import type { GameApi } from './GameApi';
import { RateLimitError, StaffAuthError, setStaffUnlocked } from './staffSession';

/** Every request targets this Next.js app. No remote API URL or local game fallback. */
export function createHttpApi(): GameApi {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, {
      ...init, cache: 'no-store', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (response.status === 401) throw new StaffAuthError();
    if (response.status === 429) throw new RateLimitError();
    if (!response.ok && response.status !== 409 && response.status !== 422) throw new Error(`HTTP ${response.status}`);
    return await response.json() as T;
  }
  const getState = () => call<GameState>('/api/state');
  return {
    getState,
    subscribe(onChange, onError) {
      let stopped = false;
      let inFlight = false;
      const tick = async () => {
        if (inFlight || document.hidden) return;
        inFlight = true;
        try {
          const state = await getState();
          if (!stopped) onChange(state);
        } catch {
          if (!stopped) onError?.();
        } finally { inFlight = false; }
      };
      const id = window.setInterval(() => void tick(), POLL_MS);
      const onFocus = () => { void tick(); };
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onFocus);
      return () => {
        stopped = true;
        window.clearInterval(id);
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onFocus);
      };
    },
    async checkin(teamId, target, source, token) {
      try {
        return await call<CheckinResult>('/api/checkins', {
          method: 'POST', body: JSON.stringify({ teamId, target, source, token }),
        });
      } catch (error) {
        return { ok: false, reason: error instanceof StaffAuthError ? 'unauthorized' : 'network' };
      }
    },
    startGame: () => call<GameState>('/api/game/start', { method: 'POST' }),
    undoLast: (teamId) => call<GameState>(`/api/checkins/last?teamId=${teamId}`, { method: 'DELETE' }),
    reset: () => call<GameState>('/api/reset', { method: 'POST' }),
    getQrToken: (cp) => call<{ token: string; expiresInMs: number }>(`/api/qr?cp=${cp}`),
    async verifyTeam(teamId, pin) {
      try {
        await call('/api/teams/verify', { method: 'POST', body: JSON.stringify({ teamId, pin }) });
        return true;
      } catch (error) {
        if (error instanceof StaffAuthError) return false;
        throw error;
      }
    },
    async verifyStaff(pin) {
      try {
        await call('/api/staff/verify', { method: 'POST', body: JSON.stringify({ pin }) });
        setStaffUnlocked(true);
        return true;
      } catch (error) {
        if (error instanceof StaffAuthError) return false;
        throw error;
      }
    },
  };
}
