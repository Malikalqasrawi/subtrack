import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { refreshSession, setAccessToken, setSessionExpiredHandler } from '@/api/client';
import { authApi } from '@/api/endpoints';
import type { Session, User } from '@/api/types';
import { queryClient } from '@/lib/query-client';
import { sessionStorage } from '@/session/session-storage';

interface SessionState {
  /** `undefined` while the saved session is still being restored. */
  user: User | null | undefined;
  signIn: (session: Session) => Promise<void>;
  /** Ends this device's session on the server, then forgets it here. */
  signOut: () => Promise<void>;
  /** Forgets the session on this device only, for when the server has already ended it. */
  clearSession: () => Promise<void>;
  /** Swaps in the tokens the server issues after a password change. The loaded data stays. */
  replaceSession: (session: Session) => Promise<void>;
  updateUser: (user: User) => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      setUser(null);
    });
    // The access token is gone when the app restarts; the stored refresh token brings the session back.
    refreshSession()
      .then((session) => setUser(session?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const signIn = useCallback(async (session: Session) => {
    queryClient.clear();
    setAccessToken(session.accessToken);
    await sessionStorage.write(session.refreshToken);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(async () => {
    await sessionStorage.clear();
    queryClient.clear();
    setAccessToken(null);
    setUser(null);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await sessionStorage.read();
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    await clearSession();
  }, [clearSession]);

  const replaceSession = useCallback(async (session: Session) => {
    setAccessToken(session.accessToken);
    await sessionStorage.write(session.refreshToken);
    setUser(session.user);
  }, []);

  const value = useMemo(
    () => ({ user, signIn, signOut, clearSession, replaceSession, updateUser: setUser }),
    [user, signIn, signOut, clearSession, replaceSession],
  );
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionState {
  const context = use(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}

/** The signed-in user. Only call from screens behind the sign-in guard. */
export function useCurrentUser(): User {
  const { user } = useSession();
  if (!user) throw new Error('No signed-in user');
  return user;
}
