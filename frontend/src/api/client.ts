import type { Session } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string>

  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

// The access token is kept in memory only. It is short-lived and is re-issued from the
// HttpOnly refresh cookie, so nothing an injected script could steal is ever stored.
let accessToken: string | null = null
let onSessionExpired: () => void = () => {}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json()
    return new ApiError(response.status, body.code ?? 'ERROR', body.message ?? 'Request failed', body.fieldErrors ?? {})
  } catch {
    return new ApiError(response.status, 'ERROR', 'Request failed')
  }
}

function send(path: string, method: string, body: unknown, withToken: boolean): Promise<Response> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (withToken && accessToken) headers['Authorization'] = `Bearer ${accessToken}`
  return fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })
}

let refreshInFlight: Promise<Session | null> | null = null

/**
 * Exchanges the refresh cookie for a new access token. Refresh tokens are single-use, so
 * concurrent callers share one request, and a cross-tab lock stops two tabs from spending
 * the same token at once (the server would treat that as theft and end the session).
 */
export function refreshSession(): Promise<Session | null> {
  if (!refreshInFlight) {
    const run = async (): Promise<Session | null> => {
      const response = await send('/api/auth/refresh', 'POST', undefined, false)
      if (!response.ok) {
        accessToken = null
        return null
      }
      const session = (await response.json()) as Session
      accessToken = session.accessToken
      return session
    }
    const locked = navigator.locks ? navigator.locks.request('subtrack-refresh', run) : run()
    refreshInFlight = locked.finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

interface RequestOptions {
  method?: string
  body?: unknown
  /** Public endpoints (sign in, register...) skip the token and the refresh-and-retry step. */
  auth?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  let response = await send(path, method, body, auth)

  if (response.status === 401 && auth) {
    const session = await refreshSession()
    if (!session) {
      onSessionExpired()
      throw new ApiError(401, 'UNAUTHORIZED', 'Your session has expired. Sign in again.')
    }
    response = await send(path, method, body, true)
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204 || response.status === 202) return undefined as T
  return (await response.json()) as T
}
