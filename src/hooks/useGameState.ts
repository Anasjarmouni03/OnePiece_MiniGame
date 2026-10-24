import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { EMPTY_STATE } from '../api/GameApi';
import type { GameState } from '../types';

/** Current game state, kept up to date live. */
export function useGameState() {
  const [state, setState] = useState<GameState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setState(await api.getState());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return api.subscribe(
      (s) => { setState(s); setError(false); setLoading(false); },
      () => setError(true),
    );
  }, [refresh]);

  return { state, setState, loading, error, refresh };
}
