import { timingSafeEqual } from 'node:crypto';
import teams from '../config/teams.json';

/** All team PINs are server environment variables, with no built-in defaults. */
export function teamPin(teamId: number): string | undefined {
  const entries = (process.env.TEAM_PINS ?? '').split(',').filter(Boolean).map((entry) => entry.trim().split(':'));
  const pins = new Map(entries.map(([id, pin]) => [Number(id), pin?.trim()]));
  if (entries.length !== teams.length || pins.size !== teams.length ||
      teams.some((team) => !/^\d{4}$/.test(pins.get(team.id) ?? ''))) {
    throw new Error('TEAM_PINS must define a four-digit PIN for each of the eight teams (1:1234,2:5678,...).');
  }
  return pins.get(teamId);
}

export function equalSecret(given: unknown, expected: string | undefined): boolean {
  if (typeof given !== 'string' || !expected || given.length > 128) return false;
  const a = Buffer.from(given.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const isTeamPin = (teamId: number, given: unknown): boolean => equalSecret(given, teamPin(teamId));
