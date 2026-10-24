import { useEffect, useMemo, useState } from 'react';
import { TEAMS } from '../../config/game';

/** A burst of confetti. Change `burstKey` to fire again. */
export function Confetti({ burstKey, colors }: { burstKey: number; colors?: string[] }) {
  const [visible, setVisible] = useState(false);
  const palette = colors ?? [...TEAMS.map((t) => t.color), '#CE9C32', '#F6DA86'];

  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        rotate: Math.random() * 360,
        color: palette[i % palette.length],
        size: 7 + Math.random() * 7,
      })),
    [burstKey],
  );

  useEffect(() => {
    if (!burstKey) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(id);
  }, [burstKey]);

  if (!visible) return null;
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`, width: p.size, height: p.size * 0.45, background: p.color,
            animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
