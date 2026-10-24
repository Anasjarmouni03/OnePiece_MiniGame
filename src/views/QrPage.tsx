import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { setStaffUnlocked, StaffAuthError } from '../api/staffSession';
import { NavBar } from '../components/layout/NavBar';
import { CHECKPOINTS } from '../config/game';
import { useNow } from '../hooks/useNow';

// Public address of the site inside the QR codes. Default: the address this page was opened with.
const ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin).replace(/\/$/, '');
const HOST = new URL(ORIGIN).hostname;
const UNREACHABLE = ['localhost', '127.0.0.1', '0.0.0.0'].includes(HOST);

type Choice = 'app' | number;

/**
 * Staff screen: pick a checkpoint and show its QR to the team after a correct answer.
 * The checkpoint QR changes every minute (a photo shared with another team expires).
 */
export function QrPage() {
  const [choice, setChoice] = useState<Choice>(1);
  const [code, setCode] = useState<{ token: string; expiresAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(500);

  const load = useCallback(async (cp: number) => {
    try {
      const r = await api.getQrToken(cp);
      setCode({ token: r.token, expiresAt: Date.now() + r.expiresInMs });
      setError(null);
    } catch (e) {
      if (e instanceof StaffAuthError) { setStaffUnlocked(false); return; }
      setError('Serveur injoignable : le QR ne peut pas être généré.');
    }
  }, []);

  useEffect(() => {
    setCode(null);
    if (choice !== 'app') void load(choice);
  }, [choice, load]);

  // New code as soon as the current one rotates
  useEffect(() => {
    if (choice === 'app' || !code) return;
    const id = window.setTimeout(() => void load(choice), Math.max(500, code.expiresAt - Date.now() + 300));
    return () => window.clearTimeout(id);
  }, [choice, code, load]);

  const url = choice === 'app' ? `${ORIGIN}/checkin` : code ? `${ORIGIN}/checkin?cp=${choice}&t=${code.token}` : null;
  const secondsLeft = code ? Math.max(0, Math.ceil((code.expiresAt - now) / 1000)) : 0;

  return (
    <div className="page page-qr">
      <NavBar />
      {UNREACHABLE && (
        <div className="banner warn">
          Ce QR contient « {HOST} » : les téléphones ne pourront pas l'ouvrir. Ouvrez cette page avec l'adresse
          réseau de l'ordinateur (ex. http://192.168.1.90:3000/staff/qr) ou depuis le site déployé.
        </div>
      )}
      <div className="qr-picker" role="tablist" aria-label="Choix du QR code">
        {CHECKPOINTS.map((cp) => (
          <button key={cp.id} role="tab" aria-selected={choice === cp.id} className={`qr-tab${choice === cp.id ? ' active' : ''}`} onClick={() => setChoice(cp.id)}>
            {cp.label}
          </button>
        ))}
        <button role="tab" aria-selected={choice === 'app'} className={`qr-tab app${choice === 'app' ? ' active' : ''}`} onClick={() => setChoice('app')}>
          Accès à l'app
        </button>
      </div>

      <div className="qr-sheet card">
        <h1>{choice === 'app' ? 'Chasse au Trésor' : `Checkpoint ${choice}`}</h1>
        <div className="ribbon">
          {choice === 'app' ? "Ouvrir l'app de l'équipe (ne valide aucun checkpoint)" : 'Scannez pour valider ce checkpoint'}
        </div>
        <div className="qr-box">
          {url ? (
            <QRCodeSVG value={url} size={300} level="M" bgColor="#F2E3C0" fgColor="#2B1A0E" marginSize={2} />
          ) : (
            <div className="qr-placeholder">{error ?? 'Génération…'}</div>
          )}
        </div>
        {choice !== 'app' && code && (
          <div className="qr-timer" aria-live="off">
            <span className="qr-timer-bar" style={{ width: `${(secondsLeft / 60) * 100}%` }} />
            <span>Nouveau code dans {secondsLeft} s</span>
          </div>
        )}
        <p className="qr-note">
          {choice === 'app' ? 'À afficher à l’accueil.' : 'À montrer uniquement après une bonne réponse.'}
        </p>
        <p className="qr-url" data-testid="qr-url">{url}</p>
      </div>
    </div>
  );
}
