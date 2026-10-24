export function CompassRose({ x, y, r = 46 }: { x: number; y: number; r?: number }) {
  const points = (angle: number, len: number, w: number) => {
    const a = (angle * Math.PI) / 180;
    const p = (ang: number, d: number) => `${Math.cos(ang) * d},${Math.sin(ang) * d}`;
    return [`0,0`, p(a - (w * Math.PI) / 180, r * 0.22), p(a, len)].join(' ');
  };
  return (
    <g className="compass" transform={`translate(${x} ${y})`}>
      <circle r={r} className="compass-ring" />
      <circle r={r * 0.9} className="compass-ring thin" />
      {[45, 135, 225, 315].map((a) => <polygon key={a} points={points(a, r * 0.66, 12)} className="compass-ink" />)}
      {[0, 90, 180, 270].map((a) => (
        <g key={a}>
          <polygon points={points(a, r, 14)} className="compass-ink" />
          <polygon points={points(a, r, -14)} className="compass-paper" />
        </g>
      ))}
      <text y={-r - 8} textAnchor="middle" className="compass-n">N</text>
    </g>
  );
}
