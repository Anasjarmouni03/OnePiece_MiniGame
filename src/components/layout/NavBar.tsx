import { NavLink } from '../../lib/router';
import { useStaff } from '../../hooks/useStaff';

const PUBLIC_LINKS = [
  { to: '/', label: 'Carte en direct' },
  { to: '/checkin', label: 'Check-in équipe' },
];
const STAFF_LINKS = [
  { to: '/staff', label: 'Espace staff' },
  { to: '/staff/qr', label: 'QR code' },
];

/** Tabs between pages. Staff tabs only appear on a device where the staff code was entered. */
export function NavBar() {
  const { unlocked, lock } = useStaff();
  const links = unlocked ? [...PUBLIC_LINKS, ...STAFF_LINKS] : PUBLIC_LINKS;
  return (
    <nav className="navbar" aria-label="Navigation">
      {links.map((l) => (
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
