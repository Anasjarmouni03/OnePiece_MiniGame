import { TOTAL_CPS } from '../../config/game';
import { formatDuration, formatHour, ordinalFr } from '../../lib/format';
import { isFinalist, targetLabel } from '../../lib/progress';
import type { Standing } from '../../types';
import { ProgressDots } from '../common/ProgressDots';

function TeamRow({ s, position }: { s: Standing; position: number }) {
  const finalist = isFinalist(s);
  return (
    <li className={`log-row${finalist ? ' finalist' : ''}`} style={{ ['--team' as string]: s.team.color }}>
      <span className="log-pos">{position}</span>
      <span className="log-flag" style={{ background: s.team.color, color: s.team.onColor }}>{s.team.id}</span>
      <div className="log-main">
        <div className="log-name">
          {s.team.colorName}
          <span className="log-last">{s.last ? `${s.last.target === 'SALLE' ? 'Trésor' : targetLabel(s.last.target)} à ${formatHour(s.last.at)}` : 'au port'}</span>
          {s.salleRank && <span className={`log-badge${finalist ? ' gold' : ''}`}>{ordinalFr(s.salleRank)} au trésor</span>}
        </div>
        <ProgressDots done={s.done} color={s.team.color} />
      </div>
      <div className="log-side">
        <span className="log-steps">{Math.min(s.done, TOTAL_CPS)}<small>/{TOTAL_CPS}</small></span>
        <span className="log-time">{formatDuration(s.elapsedMs)}</span>
      </div>
    </li>
  );
}

export function RankingPanel({ rows }: { rows: Standing[] }) {
  const finalists = rows.filter(isFinalist);
  return (
    <aside className="log">
      <div className="log-head">
        <h2>Journal de bord</h2>
        <span className="log-hint">Temps depuis le départ de chaque équipe</span>
      </div>
      {finalists.length > 0 && (
        <div className="finalists">
          <span className="finalists-label">Finale du mini-game</span>
          <span className="finalists-teams">
            {finalists.map((f) => (
              <span key={f.team.id} className="finalist-chip" style={{ background: f.team.color, color: f.team.onColor }}>
                Équipe {f.team.id}
              </span>
            ))}
          </span>
        </div>
      )}
      <ol className="log-list">
        {rows.map((s, i) => <TeamRow key={s.team.id} s={s} position={i + 1} />)}
      </ol>
    </aside>
  );
}
