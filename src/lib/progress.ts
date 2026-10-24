/**
 * Game rules, written as plain functions. The Next.js backend must apply the same rules
 * (validateCheckin) so that the app and the server always agree.
 */
import { FINALISTS, SALLE_STEP, TEAMS, TOTAL_CPS } from '../config/game';
import type { Checkin, CheckinError, CheckinSource, GameState, Standing, Target, Team } from '../types';

export const targetLabel = (t: Target): string => (t === 'SALLE' ? 'Salle du Trésor' : `CP${t}`);

export function teamCheckins(state: GameState, teamId: number): Checkin[] {
  return state.checkins.filter((c) => c.teamId === teamId).sort((a, b) => a.step - b.step);
}

/** Next place this team must validate, or null when it is already in the Salle du Trésor. */
export function nextTarget(team: Team, done: number): Target | null {
  if (done < TOTAL_CPS) return team.route[done];
  if (done === TOTAL_CPS) return 'SALLE';
  return null;
}

/** Where the ship is drawn on the map. */
export type Position = 'DEPART' | Target;
export function positionOf(checkins: Checkin[]): Position {
  const last = checkins[checkins.length - 1];
  return last ? last.target : 'DEPART';
}

/** Moment this team leaves (game start + its delay), in ms. */
export function teamStartMs(state: GameState, team: Team): number | null {
  if (!state.startedAt) return null;
  return Date.parse(state.startedAt) + team.offsetMin * 60_000;
}

/**
 * Checks a check-in request. Returns null when it is allowed.
 * - The game must be started.
 * - `target` must be exactly the team's next step (stops double taps and wrong checkpoints).
 * - Only staff (the volunteer at the door) can validate the arrival in the Salle du Trésor.
 */
export function validateCheckin(
  state: GameState, teamId: number, target: Target, source: CheckinSource,
): CheckinError | null {
  const team = TEAMS.find((t) => t.id === teamId);
  if (!team) return 'unknown-team';
  if (!state.startedAt) return 'not-started';
  const done = teamCheckins(state, teamId).length;
  const expected = nextTarget(team, done);
  if (expected === null) return 'finished';
  if (teamCheckins(state, teamId).some((c) => c.target === target)) return 'duplicate';
  if (target === 'SALLE' && source !== 'staff') return 'salle-too-early';
  if (target !== expected) return target === 'SALLE' ? 'salle-too-early' : 'wrong-checkpoint';
  return null;
}

export function buildCheckin(state: GameState, teamId: number, target: Target, source: CheckinSource, now = new Date()): Checkin {
  return {
    id: `${teamId}-${target}-${now.getTime()}`,
    teamId,
    target,
    step: teamCheckins(state, teamId).length + 1,
    at: now.toISOString(),
    source,
  };
}

/** Arrivals in the Salle du Trésor, first one first. */
export function salleArrivals(state: GameState): Checkin[] {
  return state.checkins.filter((c) => c.target === 'SALLE').sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** Ranking: most steps first, then the fastest time since each team's own start. */
export function standings(state: GameState, nowMs: number): Standing[] {
  const arrivals = salleArrivals(state);
  const rows: Standing[] = TEAMS.map((team) => {
    const list = teamCheckins(state, team.id);
    const last = list[list.length - 1] ?? null;
    const start = teamStartMs(state, team);
    const arrived = list.find((c) => c.target === 'SALLE');
    let elapsedMs: number | null = null;
    if (start !== null) {
      const end = arrived ? Date.parse(arrived.at) : nowMs;
      elapsedMs = Math.max(0, end - start);
    }
    const rank = arrived ? arrivals.findIndex((c) => c.id === arrived.id) + 1 : null;
    return { team, done: list.length, last, elapsedMs, salleRank: rank };
  });
  const lastSplit = (s: Standing) => {
    const start = teamStartMs(state, s.team);
    return s.last && start !== null ? Date.parse(s.last.at) - start : Number.MAX_SAFE_INTEGER;
  };
  return rows.sort((a, b) => {
    if (a.salleRank && b.salleRank) return a.salleRank - b.salleRank;
    if (b.done !== a.done) return b.done - a.done;
    const t = lastSplit(a) - lastSplit(b);
    return t !== 0 ? t : a.team.id - b.team.id;
  });
}

export const isFinalist = (s: Standing): boolean => s.salleRank !== null && s.salleRank <= FINALISTS;
export { SALLE_STEP };
