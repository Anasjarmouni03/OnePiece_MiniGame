import { formatDuration } from '../../lib/format';

/** Brass chronometer: game time since the start signal. */
export function GameClock({ startedAt, now }: { startedAt: string | null; now: number }) {
  const running = !!startedAt;
  return (
    <div className={`clock${running ? '' : ' waiting'}`} role="timer" aria-live="off">
      <span className="clock-face" aria-hidden>
        <span className="clock-hand" />
      </span>
      <span className="clock-text">
        <span className="clock-value">{running ? formatDuration(now - Date.parse(startedAt)) : '00:00'}</span>
        <span className="clock-label">{running ? 'Temps de jeu' : 'En attente du départ'}</span>
      </span>
    </div>
  );
}
