import { Link } from '../lib/router';

export function NotFound() {
  return (
    <div className="page page-checkin">
      <main className="checkin-main">
        <section className="card">
          <h2>Cap perdu, moussaillon !</h2>
          <p>Cette page n'existe pas.</p>
          <Link to="/" className="btn-primary">Retour à la carte</Link>
        </section>
      </main>
    </div>
  );
}
