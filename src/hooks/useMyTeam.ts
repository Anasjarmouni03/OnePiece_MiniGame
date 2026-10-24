import { useEffect, useState } from 'react';
import { teamById } from '../config/game';

/** Restore identity from a server-validated cookie, without storing the team's PIN. */
export function useMyTeam() {
  const [teamId, setTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    try { localStorage.removeItem('chasse-tresor:my-team'); } catch { /* private mode */ }
    void fetch('/api/teams/session', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session unavailable');
        const result = await response.json() as { teamId: number | null };
        if (active) setTeamId(result.teamId);
      }).catch(() => { if (active) setTeamId(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const forget = async () => {
    try {
      const response = await fetch('/api/teams/session', { method: 'DELETE', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Logout failed');
      setTeamId(null);
    } catch {
      window.alert('Connexion impossible. Réessayez pour changer d’équipe.');
    }
  };
  return { team: teamId ? teamById(teamId) ?? null : null, choose: setTeamId, forget, loading };
}
