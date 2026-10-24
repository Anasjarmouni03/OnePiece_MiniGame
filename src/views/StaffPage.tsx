import { api } from '../api';
import { setStaffUnlocked, StaffAuthError } from '../api/staffSession';
import { GameClock } from '../components/common/GameClock';
import { Header } from '../components/layout/Header';
import { NavBar } from '../components/layout/NavBar';
import { SALLE_STEP, TEAMS } from '../config/game';
import { useGameState } from '../hooks/useGameState';
import { useNow } from '../hooks/useNow';
import { errorMessage, formatHour } from '../lib/format';
import { nextTarget, targetLabel, teamCheckins } from '../lib/progress';

/** Organizers' page (link shared only with the staff). */
export function StaffPage() {
  const { state, setState } = useGameState();
  const now = useNow();

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setState(await api.getState());
    } catch (e) {
      if (e instanceof StaffAuthError) {
        window.alert('Code staff refusé. Entrez-le à nouveau.');
        setStaffUnlocked(false);
        return;
      }
      window.alert('Action impossible : serveur injoignable.');
    }
  };

  return (
    <div className="page page-staff">
      <Header subtitle="Espace staff" right={<GameClock startedAt={state.startedAt} now={now} />} />
      <NavBar />
      <main className="staff-main">
        <section className="panel staff-actions">
          <button className="btn-primary" disabled={!!state.startedAt} onClick={() => run(() => api.startGame())}>
            {state.startedAt ? `Jeu démarré à ${formatHour(state.startedAt)}` : 'Démarrer le jeu'}
          </button>
          <button
            className="btn-danger"
            onClick={() => window.confirm('Effacer TOUS les check-ins et l’heure de départ ?') && run(() => api.reset())}
          >
            Réinitialiser
          </button>
        </section>

        <section className="panel">
          <h2>Suivi des équipes</h2>
          <div className="table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Équipe</th>
                  {[1, 2, 3, 4, 5].map((s) => <th key={s}>Étape {s}</th>)}
                  <th>Salle</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {TEAMS.map((team) => {
                  const list = teamCheckins(state, team.id);
                  const next = nextTarget(team, list.length);
                  return (
                    <tr key={team.id}>
                      <td>
                        <span className="rank-chip" style={{ background: team.color, color: team.onColor }}>{team.id}</span>{' '}
                        {team.colorName}
                        {team.offsetMin > 0 && <span className="muted"> (+{team.offsetMin} min)</span>}
                      </td>
                      {Array.from({ length: SALLE_STEP }, (_, i) => {
                        const c = list.find((x) => x.step === i + 1);
                        const planned = i < 5 ? `CP${team.route[i]}` : 'Salle';
                        return (
                          <td key={i} className={c ? 'cell-done' : 'cell-todo'}>
                            <div>{planned}</div>
                            <div className="cell-time">{c ? `${formatHour(c.at)}${c.source === 'staff' ? ' ✎' : ''}` : '—'}</div>
                          </td>
                        );
                      })}
                      <td className="actions">
                        <button
                          className="btn-small"
                          disabled={!next || !state.startedAt}
                          onClick={() => run(async () => {
                            if (!next) return;
                            const res = await api.checkin(team.id, next, 'staff');
                            if (!res.ok) {
                              window.alert(errorMessage(res.reason));
                              if (res.reason === 'unauthorized') setStaffUnlocked(false);
                            }
                          })}
                        >
                          + {next ? targetLabel(next) : 'Terminé'}
                        </button>
                        <button
                          className="btn-small ghost"
                          disabled={list.length === 0}
                          onClick={() => window.confirm(`Annuler la dernière étape de l’${team.name} ?`) && run(() => api.undoLast(team.id))}
                        >
                          Annuler
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">« + » ajoute l'étape suivante à la main (CP sans réseau, ou arrivée à la Salle validée à la porte). ✎ = ajouté par le staff.</p>
        </section>
      </main>
    </div>
  );
}
