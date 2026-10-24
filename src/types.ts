export type CpId = 1 | 2 | 3 | 4 | 5;

/** Where a team can check in: one of the 5 checkpoints, or the treasure room. */
export type Target = CpId | 'SALLE';

export type CheckinSource = 'team' | 'staff';

export interface Team {
  id: number;
  name: string;
  colorName: string;
  color: string;
  /** Text color that stays readable on top of `color`. */
  onColor: string;
  startCp: CpId;
  /** Minutes after the game start when this team leaves. */
  offsetMin: number;
  /** The 5 checkpoints in the order this team must visit them. */
  route: CpId[];
}

export interface Checkpoint {
  id: CpId;
  label: string;
  /** Position on the map, in map units (see MAP in config/game.ts). */
  x: number;
  y: number;
}

export interface Checkin {
  id: string;
  teamId: number;
  target: Target;
  /** 1 to 5 = checkpoints in route order, 6 = Salle du Trésor. */
  step: number;
  /** ISO date string. */
  at: string;
  source: CheckinSource;
}

export interface GameState {
  startedAt: string | null;
  checkins: Checkin[];
}

export type CheckinError =
  | 'not-started'
  | 'unknown-team'
  | 'duplicate'
  | 'wrong-checkpoint'
  | 'salle-too-early'
  | 'finished'
  | 'unauthorized'
  | 'expired-qr'
  | 'wrong-pin'
  | 'network';

export type CheckinResult =
  | { ok: true; checkin: Checkin }
  | { ok: false; reason: CheckinError };

export interface Standing {
  team: Team;
  /** Number of validated steps: 0 to 6 (6 = arrived at the Salle du Trésor). */
  done: number;
  last: Checkin | null;
  /** Time since the team's own start (frozen when it reaches the Salle). */
  elapsedMs: number | null;
  /** 1 for the first team in the Salle du Trésor, 2 for the second… */
  salleRank: number | null;
}
