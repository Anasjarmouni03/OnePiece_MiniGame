const pad = (n: number) => String(n).padStart(2, '0');

/** 3725000 → "1:02:05", 125000 → "02:05". */
export function formatDuration(ms: number | null): string {
  if (ms === null) return '--:--';
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** ISO date → "10:42". */
export function formatHour(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 1 → "1re", 2 → "2e" (feminine: "1re équipe"). */
export const ordinalFr = (n: number): string => (n === 1 ? '1re' : `${n}e`);

export const errorMessage = (reason: string, expected?: string): string => {
  switch (reason) {
    case 'not-started': return "Le jeu n'a pas encore commencé. Attendez le signal de départ !";
    case 'duplicate': return 'Ce checkpoint est déjà validé pour votre équipe.';
    case 'wrong-checkpoint': return expected ? `Ce n'est pas votre prochain checkpoint : votre prochain est le ${expected}.` : "Ce n'est pas votre prochain checkpoint.";
    case 'salle-too-early': return "L'arrivée dans la Salle du Trésor est validée par le bénévole à la porte.";
    case 'finished': return 'Votre équipe a déjà terminé le parcours. Bravo !';
    case 'unknown-team': return 'Équipe inconnue.';
    case 'expired-qr': return 'Ce QR code a expiré : demandez au bénévole de vous le montrer à nouveau, puis rescannez-le.';
    case 'wrong-pin': return 'Code PIN de l’équipe incorrect. Choisissez à nouveau votre équipe.';
    case 'unauthorized': return 'Code staff refusé. Déverrouillez à nouveau l’espace staff.';
    default: return 'Problème de connexion. Réessayez, ou prévenez le bénévole.';
  }
};
