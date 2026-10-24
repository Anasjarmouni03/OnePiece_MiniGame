import { useEffect, useRef, useState } from 'react';
import { Confetti } from '../components/common/Confetti';
import { GameClock } from '../components/common/GameClock';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { NavBar } from '../components/layout/NavBar';
import { TreasureMap } from '../components/map/TreasureMap';
import { RankingPanel } from '../components/ranking/RankingPanel';
import { useGameState } from '../hooks/useGameState';
import { useNow } from '../hooks/useNow';
import { salleArrivals, standings } from '../lib/progress';

/** Live map + ranking, made for a big screen at the reception. */
export function MapPage() {
  const { state, error, loading } = useGameState();
  const now = useNow();
  const arrivals = salleArrivals(state).length;
  const seen = useRef<number | null>(null);
  const [burst, setBurst] = useState(0);

  // Confetti only for a NEW arrival, not for the ones already there when the page opens.
  useEffect(() => {
    if (loading) return;
    if (seen.current !== null && arrivals > seen.current) setBurst(Date.now());
    seen.current = arrivals;
  }, [arrivals, loading]);

  return (
    <div className="page page-map">
      <Header live subtitle="Suivi en direct" right={<GameClock startedAt={state.startedAt} now={now} />} />
      <NavBar />
      {error && <div className="banner warn">Connexion perdue… la carte se met à jour dès le retour du réseau.</div>}
      <main className="map-layout">
        <section className="map-panel">
          <TreasureMap state={state} ready={!loading} />
        </section>
        <RankingPanel rows={standings(state, now)} />
      </main>
      <Footer />
      <Confetti burstKey={burst} />
    </div>
  );
}
