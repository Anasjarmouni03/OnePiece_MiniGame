'use client';
/**
 * Tiny adapter: same API as the React Router pieces the screens use (Link, NavLink, useSearchParams),
 * implemented with Next.js. Lets the screens stay unchanged.
 */
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';

export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return <NextLink href={to} className={className}>{children}</NextLink>;
}

export function NavLink({ to, end, className, children }: {
  to: string;
  end?: boolean;
  className: (s: { isActive: boolean }) => string;
  children: ReactNode;
}) {
  const path = usePathname() ?? '/';
  const isActive = end ? path === to : path === to || path.startsWith(`${to}/`);
  return <NextLink href={to} className={className({ isActive })} aria-current={isActive ? 'page' : undefined}>{children}</NextLink>;
}

export function useSearchParams(): [URLSearchParams, (next: Record<string, string>, opts?: { replace?: boolean }) => void] {
  const [params, setParams] = useState(() => new URLSearchParams(window.location.search));
  const update = useCallback((next: Record<string, string>) => {
    const p = new URLSearchParams(next);
    const qs = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    setParams(p);
  }, []);
  return [params, update];
}
