import { useEffect, type ReactNode } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAccount } from '@/hooks/use-account';

/** Paths reachable without an account. Everything else requires sign-in. */
export const PUBLIC_PATHS = ['/login', '/signup'];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname.replace(/\/+$/, '') || '/');
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, ready } = useAccount();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const open = isPublicPath(pathname);

  useEffect(() => {
    if (!ready) return;
    if (!session && !open) navigate({ to: '/login', replace: true });
    if (session && open) navigate({ to: '/', replace: true });
  }, [ready, session, open, navigate]);

  if (open) return <>{children}</>;
  if (!ready || !session) {
    return <div className="grid h-dvh place-items-center bg-background text-sm text-muted-foreground">…</div>;
  }
  return <>{children}</>;
}
