import { useEffect, useState } from 'react';
import { getStaffSession, lockStaff, onStaffSessionChange, refreshStaffSession } from '../api/staffSession';

export function useStaff() {
  const [authenticated, setAuthenticated] = useState(getStaffSession);
  useEffect(() => {
    const unsubscribe = onStaffSessionChange(() => setAuthenticated(getStaffSession()));
    void refreshStaffSession();
    return unsubscribe;
  }, []);
  return { unlocked: authenticated === true, loading: authenticated === null, lock: lockStaff };
}
