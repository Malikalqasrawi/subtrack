import { API_URL } from '@/api/config';
import type { Session } from '@/api/types';
import { sessionStorage } from '@/session/session-storage';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

// The access token is short-lived and kept in memory only. It is re-issued from the refresh token.
let accessToken: string | null = null;
let onSessionExpired: () => void = () => {};

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    return new ApiError(response.status, body.code ?? 'ERROR', body.message ?? 'Request failed', body.fieldErrors ?? {});
  } catch {
    return new ApiError(response.status, 'ERROR', 'Request failed');
  }
}

async function send(path: string, method: string, body: unknown, withToken: boolean): Promise<Response> {
  // Tells the API to answer with the refresh token instead of setting a browser cookie.
  const headers: Record<string, string> = { 'X-Subtrack-Client': 'app' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withToken && accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  try {
    return await fetch(API_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.');
  }
}

let refreshInFlight: Promise<Session | null> | null = null;

/**
 * Exchanges the stored refresh token for a new session. Refresh tokens work once, so
 * concurrent callers share one request and the replacement is saved before anyone continues.
 */
export function refreshSession(): Promise<Session | null> {
  refreshInFlight ??= (async () => {
    const refreshToken = await sessionStorage.read();
    if (!refreshToken) return null;
    const response = await send('/api/auth/refresh', 'POST', { refreshToken }, false);
    if (!response.ok) {
      accessToken = null;
      await sessionStorage.clear();
      return null;
    }
    const session = (await response.json()) as Session;
    accessToken = session.accessToken;
    await sessionStorage.write(session.refreshToken);
    return session;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Public endpoints (sign in, register...) skip the token and the refresh-and-retry step. */
  auth?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  let response = await send(path, method, body, auth);

  if (response.status === 401 && auth) {
    const session = await refreshSession();
    if (!session) {
      onSessionExpired();
      throw new ApiError(401, 'UNAUTHORIZED', 'Your session has expired. Sign in again.');
    }
    response = await send(path, method, body, true);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204 || response.status === 202) return undefined as T;
  return (await response.json()) as T;
}
