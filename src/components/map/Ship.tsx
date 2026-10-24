import { useRef } from 'react';
import type { Team } from '../../types';

interface Props {
  team: Team;
  x: number;
  y: number;
  /** Changes when the ship reaches a new place: replays the splash. */
  placeKey: string;
  /** False while the first data is loading (no splash for the initial placement). */
  ready: boolean;
}

/** A team's pirate ship. It sails smoothly to (x, y) when the position changes. */
export function Ship({ team, x, y, placeKey, ready }: Props) {
  // No splash on first display: only when the ship actually moves.
  const baseKey = useRef<string | null>(null);
  if (ready && baseKey.current === null) baseKey.current = placeKey;
  const moved = baseKey.current !== null && placeKey !== baseKey.current;
  return (
    <g className="ship" style={{ transform: `translate(${x}px, ${y}px)` }}>
      {moved && <circle key={placeKey} className="splash" r="18" />}
      <g className="ship-rock" style={{ animationDelay: `${-team.id * 0.37}s` }}>
        <ellipse cx="0" cy="17" rx="22" ry="4" className="ship-shadow" />
        <line x1="0" y1="8" x2="0" y2="-30" className="ship-mast" />
        <path d="M0 -30 L11 -27 L0 -24 Z" fill={team.color} />
        <path d="M-14 -24 Q0 -19 14 -24 L14 -2 Q0 2 -14 -2 Z" fill={team.color} className="ship-sail" />
        <text x="0" y="-8" textAnchor="middle" fill={team.onColor} className="ship-number">{team.id}</text>
        <path d="M-22 6 L22 6 L15 17 L-15 17 Z" className="ship-hull" />
        <line x1="-17" y1="10" x2="17" y2="10" className="ship-hull-line" />
      </g>
    </g>
  );
}
