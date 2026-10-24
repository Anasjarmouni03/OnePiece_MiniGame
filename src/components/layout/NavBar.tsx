import { NavLink } from '../../lib/router';
import { useStaff } from '../../hooks/useStaff';

const LINKS = [
  { to: '/', label: 'Carte en direct' },
  { to: '/checkin', label: 'Check-in équipe' },
  { to: '/staff', label: 'Espace staff' },
  { to: '/staff/qr', label: 'QR code' },
];

/** All pages stay discoverable; StaffGate and the API protect staff access. */
export function NavBar() {
  const { unlocked, lock } = useStaff();
  return (
    <nav className="navbar" aria-label="Navigation">
      {LINKS.map((l) => (
        <NavLink key={l.to} to={l.to} end className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}>
          {l.label}
        </NavLink>
      ))}
      {unlocked && (
        <button type="button" className="nav-btn nav-lock" onClick={lock}>Verrouiller le staff</button>
      )}
    </nav>
  );
}
