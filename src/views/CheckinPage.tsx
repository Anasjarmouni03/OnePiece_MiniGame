import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from '../lib/router';
import { api } from '../api';
import { RateLimitError } from '../api/staffSession';
import { Confetti } from '../components/common/Confetti';
import { ProgressDots } from '../components/common/ProgressDots';
import { Footer } from '../components/layout/Footer';
import { TEAMS, TOTAL_CPS } from '../config/game';
import { useGameState } from '../hooks/useGameState';
import { useMyTeam } from '../hooks/useMyTeam';
import { errorMessage, formatHour, ordinalFr } from '../lib/format';
import { nextTarget, salleArrivals, targetLabel, teamCheckins } from '../lib/progress';
import type { Checkin, CpId, Team } from '../types';

/** Reads the checkpoint QR from the address: /checkin?cp=3&t=CODE */
function useScannedQr() {
  const [params, setParams] = useSearchParams();
  const cp = Number(params.get('cp'));
  const token = params.get('t');
  const scanned = [1, 2, 3, 4, 5].includes(cp) && token ? { cp: cp as CpId, token } : null;
  const clear = () => setParams({}, { replace: true });
  return { scanned, clear };
}

/** Page opened by a checkpoint QR code, on the team's phone. */
export function CheckinPage() {
  const { team, choose, forget, loading } = useMyTeam();
  const { scanned, clear } = useScannedQr();
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="page page-checkin">
      <header className="mini-header">
        <h1>Chasse au Trésor</h1>
        <Link to="/" className="link-quiet">Voir la carte en direct</Link>
      </header>
      <main className="checkin-main">
        {loading ? <div className="info">Vérification de la session…</div> : team ? (
          <TeamCheckin
            team={team}
            scanned={scanned}
            clearScan={clear}
            onChangeTeam={() => { setNotice(null); forget(); }}
            onWrongPin={() => { setNotice('Code PIN refusé : choisissez votre équipe et retapez votre PIN.'); forget(); }}
          />
        ) : (
          <TeamPicker onConfirm={(id) => { setNotice(null); choose(id); }} scannedCp={scanned?.cp ?? null} notice={notice} />
        )}
      </main>
      <Footer />
    </div>
  );
}

interface PickerProps {
  onConfirm: (id: number) => void;
  scannedCp: CpId | null;
  notice: string | null;
}

/** Step 1: pick the team color. Step 2: type the team PIN (checked by the server). */
function TeamPicker({ onConfirm, scannedCp, notice }: PickerProps) {
  const [picked, setPicked] = useState<Team | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!picked || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (await api.verifyTeam(picked.id, pin.trim())) onConfirm(picked.id);
      else { setError('Code PIN incorrect.'); setPin(''); }
    } catch (error) {
      setError(error instanceof RateLimitError ? error.message : 'Connexion au serveur impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  if (picked) {
    return (
      <form className="card team-card" style={{ borderColor: picked.color }} onSubmit={submit}>
        <div className="team-card-head" style={{ background: picked.color, color: picked.onColor }}>
          <span>{picked.name} · {picked.colorName}</span>
          <button type="button" className="link-small" style={{ color: picked.onColor }} onClick={() => { setPicked(null); setPin(''); setError(null); }}>
            Retour
          </button>
        </div>
        <div className="team-card-body">
          <h2>Code PIN de l'équipe</h2>
          <p className="muted">Le code à 4 chiffres reçu à l'accueil.</p>
          <input
            className="gate-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            aria-label="Code PIN de l'équipe"
          />
          {error && <div className="error">{error}</div>}
          <button className="btn-primary pin-submit" disabled={busy || pin.length !== 4}>
            {busy ? 'Vérification…' : 'Confirmer'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <section className="card">
      <h2>Quelle est votre équipe ?</h2>
      <p className="muted">
        {scannedCp ? `QR du CP${scannedCp} scanné. ` : ''}Choisissez votre couleur, puis tapez votre code PIN.
      </p>
      {notice && <div className="error picker-notice">{notice}</div>}
      <div className="team-grid">
        {TEAMS.map((t) => (
          <button key={t.id} className="team-btn" style={{ background: t.color, color: t.onColor }} onClick={() => setPicked(t)}>
            <span className="team-btn-num">{t.id}</span>
            <span>{t.colorName}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

interface CheckinProps {
  team: Team;
  onWrongPin: () => void;
  scanned: { cp: CpId; token: string } | null;
  clearScan: () => void;
  onChangeTeam: () => void;
}

function TeamCheckin({ team, scanned, clearScan, onChangeTeam, onWrongPin }: CheckinProps) {
  const { state, setState, refresh, loading, error: offline } = useGameState();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<Checkin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  const done = teamCheckins(state, team.id).length;
  const next = nextTarget(team, done);
  const arrivedRank = salleArrivals(state).findIndex((c) => c.teamId === team.id) + 1;

  async function validate() {
    if (!scanned || busy) return;
    setBusy(true);
    setError(null);
    const res = await api.checkin(team.id, scanned.cp, 'team', scanned.token);
    setBusy(false);
    if (res.ok) {
      setSuccess(res.checkin);
      setBurst(Date.now());
      setState({ ...state, checkins: [...state.checkins, res.checkin] });
      clearScan(); // the code can't be reused from this page
    } else if (res.reason === 'wrong-pin') {
      onWrongPin(); // PIN changed or typed for another team: ask again (the scanned QR stays in the address)
    } else {
      setError(errorMessage(res.reason, next && next !== 'SALLE' ? targetLabel(next) : undefined));
      if (res.reason === 'expired-qr' || res.reason === 'duplicate') clearScan();
      void refresh();
    }
  }

  let body;
  if (loading) {
    body = <div className="info">Chargement…</div>;
  } else if (!state.startedAt) {
    body = (
      <div className="info">
        Le jeu n'a pas encore commencé. Attendez le signal de départ !
        <div><button className="link-small" onClick={() => void refresh()}>Actualiser</button></div>
      </div>
    );
  } else if (next === null) {
    body = (
      <div className="info big">
        Vous êtes dans la Salle du Trésor{arrivedRank ? ` : ${ordinalFr(arrivedRank)} équipe arrivée` : ''} !
        {arrivedRank > 0 && arrivedRank <= 2 && <div>Préparez-vous pour le mini-game final.</div>}
      </div>
    );
  } else if (next === 'SALLE') {
    body = (
      <div className="info big">
        Les 5 checkpoints sont validés ! Suivez l'Énigme Finale jusqu'à la Salle du Trésor.
        <div className="muted">Votre arrivée sera validée par le bénévole à la porte.</div>
      </div>
    );
  } else if (scanned && scanned.cp === next) {
    body = (
      <div className="validate">
        <div className="next-label">QR scanné</div>
        <div className="next-cp" style={{ color: team.color }}>CP{scanned.cp}</div>
        <button className="btn-primary" disabled={busy} onClick={validate}>
          {busy ? 'Validation…' : `Valider notre arrivée au CP${scanned.cp}`}
        </button>
      </div>
    );
  } else {
    body = (
      <div className="validate">
        {scanned && (
          <div className="error">
            Ce QR est celui du CP{scanned.cp}, mais votre prochain checkpoint est le {targetLabel(next)}.
          </div>
        )}
        <div className="next-label">Votre prochain checkpoint</div>
        <div className="next-cp" style={{ color: team.color }}>{targetLabel(next)}</div>
        <div className="info">
          Une fois sur place, répondez au bénévole. S'il valide, il vous montre son QR code : scannez-le pour valider.
        </div>
      </div>
    );
  }

  return (
    <section className="card team-card" style={{ borderColor: team.color }}>
      <div className="team-card-head" style={{ background: team.color, color: team.onColor }}>
        <span>{team.name} · {team.colorName}</span>
        <button className="link-small" style={{ color: team.onColor }} onClick={() => window.confirm('Changer d’équipe sur ce téléphone ?') && onChangeTeam()}>
          Changer
        </button>
      </div>
      <div className="team-card-body">
        <ProgressDots done={done} color={team.color} />
        <p className="muted">{Math.min(done, TOTAL_CPS)} checkpoint{done > 1 ? 's' : ''} sur {TOTAL_CPS}</p>
        {offline && (
          <div className="error">Connexion au serveur impossible. Vérifiez internet, puis réessayez. Sinon, prévenez le bénévole.</div>
        )}
        {success && (
          <div className="success">
            <div className="success-title">Bravo ! {targetLabel(success.target)} validé à {formatHour(success.at)}</div>
            <div>Demandez votre énigme au bénévole.</div>
          </div>
        )}
        {error && <div className="error">{error}</div>}
        {body}
      </div>
      <Confetti burstKey={burst} colors={[team.color, '#CE9C32', '#F6DA86', '#FFFFFF']} />
    </section>
  );
}
