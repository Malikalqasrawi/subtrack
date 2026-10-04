import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { refreshSession, setAccessToken, setSessionExpiredHandler } from '../api/client'
import { authApi } from '../api/endpoints'
import type { Session, User } from '../api/types'
import { queryClient } from '../lib/queryClient'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear()
      setUser(null)
    })
    // On page load the access token is gone (memory only); the refresh cookie brings the session back.
    refreshSession()
      .then((session) => setUser(session?.user ?? null))
      .catch(() => setUser(null))
  }, [])

  const startSession = useCallback((session: Session) => {
    queryClient.clear()
    setAccessToken(session.accessToken)
    setUser(session.user)
  }, [])

  const clearSession = useCallback(() => {
    queryClient.clear()
    setAccessToken(null)
    setUser(null)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(
    () => ({ user, startSession, clearSession, updateUser: setUser, logout }),
    [user, startSession, clearSession, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
