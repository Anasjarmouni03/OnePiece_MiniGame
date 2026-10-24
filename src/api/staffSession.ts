/** Only authentication status lives in JS; the credential is an HttpOnly cookie. */
let authenticated: boolean | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

export const getStaffSession = () => authenticated;
export function setStaffUnlocked(value: boolean) {
  authenticated = value;
  listeners.forEach((listener) => listener());
}
export function onStaffSessionChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function refreshStaffSession(): Promise<void> {
  if (!pending) {
    // Remove credentials retained by the original app, if this domain hosted it before.
    try { localStorage.removeItem('chasse-tresor:staff-pin'); } catch { /* private mode */ }
    pending = fetch('/api/staff/session', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session unavailable');
        const result = await response.json() as { authenticated: boolean };
        setStaffUnlocked(result.authenticated);
      }).catch(() => setStaffUnlocked(false)).finally(() => { pending = null; });
  }
  return pending;
}
export async function lockStaff() {
  try {
    const response = await fetch('/api/staff/session', { method: 'DELETE', credentials: 'same-origin' });
    if (!response.ok) throw new Error('Logout failed');
    setStaffUnlocked(false);
  } catch {
    window.alert('Impossible de verrouiller la session. Vérifiez la connexion et réessayez.');
  }
}
export class StaffAuthError extends Error {
  constructor() { super('Session staff expirée. Déverrouillez à nouveau l’espace staff.'); }
}
export class RateLimitError extends Error {
  constructor() { super('Trop de tentatives. Réessayez dans 15 minutes.'); }
}
