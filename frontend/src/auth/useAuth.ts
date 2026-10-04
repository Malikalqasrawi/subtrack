import { createContext, useContext } from 'react'
import type { Session, User } from '../api/types'

export interface AuthState {
  /** `undefined` while the saved session is still being restored. */
  user: User | null | undefined
  startSession: (session: Session) => void
  /** Forgets the session locally, for when the server has already ended it. */
  clearSession: () => void
  updateUser: (user: User) => void
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

/** The signed-in user. Only call from pages rendered inside the protected layout. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('No signed-in user')
  return user
}
