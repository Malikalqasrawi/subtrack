import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, refreshSession, setAccessToken, setSessionExpiredHandler } from './client'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const session = (accessToken: string) => ({ accessToken, expiresInSeconds: 900, user: { id: 'user-1' } })

const fetchMock = vi.fn<typeof fetch>()

function authorization(call: number) {
  const headers = (fetchMock.mock.calls[call][1]?.headers ?? {}) as Record<string, string>
  return headers['Authorization']
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  setAccessToken(null)
  setSessionExpiredHandler(() => {})
})

describe('api', () => {
  it('sends the access token and returns the body', async () => {
    setAccessToken('token-1')
    fetchMock.mockResolvedValueOnce(json(200, [{ id: 'sub-1' }]))

    await expect(api('/api/subscriptions')).resolves.toEqual([{ id: 'sub-1' }])
    expect(authorization(0)).toBe('Bearer token-1')
  })

  it('sends no token to public endpoints', async () => {
    setAccessToken('token-1')
    fetchMock.mockResolvedValueOnce(json(200, {}))

    await api('/api/auth/login', { method: 'POST', body: { email: 'a@b.c' }, auth: false })
    expect(authorization(0)).toBeUndefined()
  })

  it('renews an expired session once and repeats the request', async () => {
    setAccessToken('expired')
    fetchMock
      .mockResolvedValueOnce(json(401, { code: 'UNAUTHORIZED', message: 'Sign in to continue' }))
      .mockResolvedValueOnce(json(200, session('fresh')))
      .mockResolvedValueOnce(json(200, { ok: true }))

    await expect(api('/api/users/me')).resolves.toEqual({ ok: true })
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/users/me', '/api/auth/refresh', '/api/users/me'])
    expect(authorization(2)).toBe('Bearer fresh')
  })

  it('reports the session as over when it cannot be renewed', async () => {
    const expired = vi.fn()
    setSessionExpiredHandler(expired)
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}))

    await expect(api('/api/users/me')).rejects.toMatchObject({ status: 401 })
    expect(expired).toHaveBeenCalledOnce()
  })

  it('does not try to renew after a wrong password', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' }))

    await expect(api('/api/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('turns an error answer into an ApiError with its field errors', async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, { code: 'VALIDATION_FAILED', message: 'Some fields are invalid', fieldErrors: { amount: 'must be positive' } }),
    )

    const error = await api('/api/subscriptions', { method: 'POST', body: {} }).catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', fieldErrors: { amount: 'must be positive' } })
  })

  it('returns nothing for answers without a body', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(api('/api/subscriptions/sub-1', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})

describe('refreshSession', () => {
  it('shares one request between callers, because a refresh token works only once', async () => {
    fetchMock.mockResolvedValueOnce(json(200, session('fresh')))

    const [first, second] = await Promise.all([refreshSession(), refreshSession()])
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(first).toEqual(second)
  })
})
