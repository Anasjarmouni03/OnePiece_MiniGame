import type { Checkpoint, CpId, Team } from '../types';
import teams from './teams.json';

/** Size of the treasure map drawing, in map units (SVG viewBox). */
export const MAP = { width: 1000, height: 620 } as const;

export const TOTAL_CPS = 5;
/** Step number of the arrival in the Salle du Trésor. */
export const SALLE_STEP = TOTAL_CPS + 1;
/** Number of teams that reach the final mini-game. */
export const FINALISTS = 2;

/** How often the app refreshes the data when connected to the backend. */
export const POLL_MS = 3000;

/**
 * Checkpoint positions on the map. Move x / y to match the real school layout.
 * (0,0) is the top-left corner of the map, (1000, 620) the bottom-right.
 */
export const CHECKPOINTS: Checkpoint[] = [
  { id: 1, label: 'CP1', x: 215, y: 175 },
  { id: 2, label: 'CP2', x: 520, y: 118 },
  { id: 3, label: 'CP3', x: 812, y: 214 },
  { id: 4, label: 'CP4', x: 735, y: 455 },
  { id: 5, label: 'CP5', x: 318, y: 452 },
];

/** Harbour where ships wait before their first checkpoint. */
export const DEPART = { x: 108, y: 548 };
/** Hidden-treasure box. It never shows the real place of the Salle. */
export const TREASURE = { x: 520, y: 300 };

/** One source shared with the database seed script. */
export const TEAMS: Team[] = teams.map((team) => ({
  ...team, startCp: team.startCp as CpId, route: team.route as CpId[],
}));

export const teamById = (id: number): Team | undefined => TEAMS.find((t) => t.id === id);
export const checkpointById = (id: CpId): Checkpoint => CHECKPOINTS.find((c) => c.id === id)!;
