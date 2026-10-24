import type { Checkpoint } from '../../types';

export function CheckpointMarker({ cp, passed }: { cp: Checkpoint; passed: number }) {
  return (
    <g className="cp" transform={`translate(${cp.x} ${cp.y})`}>
      <circle r="36" className="cp-glow" />
      <circle r="30" className="cp-disc" />
      <circle r="26" className="cp-ring" />
      <text y="2" textAnchor="middle" className="cp-label">{cp.label}</text>
      <text y="17" textAnchor="middle" className="cp-count">{passed}/8</text>
    </g>
  );
}
