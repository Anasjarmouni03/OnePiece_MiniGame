import { TOTAL_CPS } from '../../config/game';

/**
 * Voyage track: 5 knots for the checkpoints, then the chest for the Salle du Trésor.
 * The rope between knots fills with the team color as it progresses.
 */
export function ProgressDots({ done, color }: { done: number; color: string }) {
  const cps = Math.min(done, TOTAL_CPS);
  const pct = cps <= 1 ? 0 : ((cps - 1) / (TOTAL_CPS - 1)) * 100;
  return (
    <span className="voyage" style={{ ['--team' as string]: color }} aria-label={`${cps} checkpoints sur ${TOTAL_CPS}`}>
      <span className="voyage-rope">
        <span className="voyage-fill" style={{ width: `${pct}%` }} />
      </span>
      {Array.from({ length: TOTAL_CPS }, (_, i) => (
        <span key={i} className={`knot${i < done ? ' on' : ''}`} style={{ left: `${(i / (TOTAL_CPS - 1)) * 100}%` }} />
      ))}
      <span className={`voyage-chest${done > TOTAL_CPS ? ' on' : ''}`} aria-hidden>
        <svg viewBox="0 0 20 16" width="18" height="14"><path d="M2 7h16v8H2z M2 7a8 5 0 0 1 16 0" /><path d="M9 7h2v4H9z" className="lock" /></svg>
      </span>
    </span>
  );
}
