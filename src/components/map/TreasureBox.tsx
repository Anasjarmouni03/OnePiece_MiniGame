/** The treasure. Its real place stays secret: it only says when it has been found. */
export function TreasureBox({ x, y, discovered }: { x: number; y: number; discovered: boolean }) {
  return (
    <g className={`treasure ${discovered ? 'found' : ''}`} transform={`translate(${x} ${y})`}>
      {discovered && <circle r="70" className="treasure-glow" />}
      <g className="treasure-chest" transform="translate(0 -6)">
        {[-60, -35, -10, 15, 40, 65, 90, 115, 140, 165, 190, 215].map((a) => (
          <line key={a} x1={Math.cos((a * Math.PI) / 180) * 30} y1={Math.sin((a * Math.PI) / 180) * 30 - 4}
            x2={Math.cos((a * Math.PI) / 180) * 42} y2={Math.sin((a * Math.PI) / 180) * 42 - 4} className="chest-ray" />
        )).slice(0, discovered ? 12 : 0)}
        <rect x="-26" y="-6" width="52" height="26" rx="3" className="chest-body" />
        <path d="M-26 -6 L-26 -12 A26 12 0 0 1 26 -12 L26 -6 Z" className="chest-lid" />
        <rect x="-28" y="-8" width="56" height="4" className="chest-band" />
        <rect x="-18" y="-22" width="5" height="42" className="chest-band" />
        <rect x="13" y="-22" width="5" height="42" className="chest-band" />
        <rect x="-5" y="-6" width="10" height="12" rx="1.5" className="chest-lock" />
      </g>
      <text y="42" textAnchor="middle" className="treasure-title">{discovered ? 'Salle du Trésor' : '? ? ?'}</text>
      <text y="60" textAnchor="middle" className="treasure-sub">{discovered ? 'découverte !' : 'Lieu secret'}</text>
    </g>
  );
}
