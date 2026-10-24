import { CHECKPOINTS, DEPART, MAP, TEAMS, TREASURE, checkpointById } from '../../config/game';
import { positionOf, salleArrivals, teamCheckins, type Position } from '../../lib/progress';
import type { GameState, Team } from '../../types';
import { CheckpointMarker } from './CheckpointMarker';
import { CompassRose } from './CompassRose';
import { Ship } from './Ship';
import { TreasureBox } from './TreasureBox';

type Pt = { x: number; y: number };
interface Segment { d: string; mid: Pt; angle: number }

/** Smooth loop through the checkpoints (Catmull-Rom → Bézier), one segment per leg, with its middle point. */
function loopSegments(pts: Pt[]): Segment[] {
  const n = pts.length;
  return pts.map((_, i) => {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    const mid = {
      x: 0.125 * p1.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * p2.x,
      y: 0.125 * p1.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * p2.y,
    };
    const dx = 0.75 * (c2.x + p2.x - p1.x - c1.x), dy = 0.75 * (c2.y + p2.y - p1.y - c1.y);
    return {
      d: `M${p1.x} ${p1.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`,
      mid,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    };
  });
}

/** Each team has its own fixed slot around a place, so ships never overlap. */
function shipPoint(team: Team, pos: Position): { x: number; y: number } {
  const slot = team.id - 1;
  if (pos === 'DEPART') {
    return { x: DEPART.x - 66 + (slot % 4) * 44, y: DEPART.y - 74 + Math.floor(slot / 4) * 46 };
  }
  if (pos === 'SALLE') {
    const a = ((-180 + slot * (180 / 7)) * Math.PI) / 180;
    return { x: TREASURE.x + Math.cos(a) * 128, y: TREASURE.y + Math.sin(a) * 96 + 4 };
  }
  const cp = checkpointById(pos);
  const a = ((-90 + slot * 45) * Math.PI) / 180;
  return { x: cp.x + Math.cos(a) * 84, y: cp.y + Math.sin(a) * 70 + 6 };
}

export function TreasureMap({ state, ready = true }: { state: GameState; ready?: boolean }) {
  const discovered = salleArrivals(state).length > 0;
  const passed = (cpId: number) => state.checkins.filter((c) => c.target === cpId).length;

  return (
    <svg className="map" viewBox={`0 0 ${MAP.width} ${MAP.height}`} role="img" aria-label="Carte de la chasse au trésor">
      <defs>
      </defs>

      <image href="/parchment.jpg" x="0" y="0" width={MAP.width} height={MAP.height} preserveAspectRatio="none" />
      <g className="map-grid">
        {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={100 + i * 100} y1="20" x2={100 + i * 100} y2={MAP.height - 20} />)}
        {Array.from({ length: 5 }, (_, i) => <line key={`h${i}`} x1="20" y1={100 + i * 100} x2={MAP.width - 20} y2={100 + i * 100} />)}
      </g>

      <g className="loop">
        {loopSegments(CHECKPOINTS).map((seg, i) => (
          <g key={i}>
            <path d={seg.d} className="loop-path" />
            <path d="M-7 -6 L7 0 L-7 6 Z" className="loop-arrowhead" transform={`translate(${seg.mid.x} ${seg.mid.y}) rotate(${seg.angle})`} />
          </g>
        ))}
      </g>

      <g className="harbour" transform={`translate(${DEPART.x} ${DEPART.y})`}>
        <path d="M-100 -12 Q-50 -26 0 -12 T100 -12" className="wave" />
        <text y="28" textAnchor="middle" className="harbour-label">⚓ Départ</text>
      </g>

      <CompassRose x={905} y={530} />
      <TreasureBox x={TREASURE.x} y={TREASURE.y} discovered={discovered} />
      {CHECKPOINTS.map((cp) => <CheckpointMarker key={cp.id} cp={cp} passed={passed(cp.id)} />)}

      {TEAMS.map((team) => {
        const pos = positionOf(teamCheckins(state, team.id));
        const p = shipPoint(team, pos);
        return <Ship key={team.id} team={team} x={p.x} y={p.y} placeKey={String(pos)} ready={ready} />;
      })}
    </svg>
  );
}
