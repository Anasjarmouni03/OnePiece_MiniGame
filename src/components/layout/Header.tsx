import type { ReactNode } from 'react';

const LOGOS = ['uh2_enset', 'n7gd', 'aws_cloudclubs', 'jlm', 'n7geeks'];

export function Header({ subtitle, right, live = false }: { subtitle?: string; right?: ReactNode; live?: boolean }) {
  return (
    <header className="header">
      <div className="brand">
        <h1 className="brand-title">Chasse au Trésor</h1>
        {subtitle && <span className={`brand-sub${live ? ' live' : ''}`}>{subtitle}</span>}
      </div>
      <div className="header-logos" aria-label="Clubs organisateurs">
        {LOGOS.map((l) => <img key={l} src={`/logos/${l}_white.png`} alt="" className={`logo logo-${l}`} />)}
      </div>
      <div className="header-right">{right}</div>
    </header>
  );
}
