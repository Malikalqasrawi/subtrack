import { useEffect, useRef, useState } from 'react'
import { authApi } from '../api/endpoints'
import type { AuthResponse, PublicConfig } from '../api/types'

// The two providers' browser SDKs, declared only as far as this file uses them.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
    AppleID?: {
      auth: {
        init: (options: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void
        signIn: () => Promise<{
          authorization: { id_token: string }
          user?: { name?: { firstName?: string; lastName?: string } }
        }>
      }
    }
  }
}

const GOOGLE_SDK = 'https://accounts.google.com/gsi/client'
const APPLE_SDK = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'

const loadedScripts = new Map<string, Promise<void>>()
function loadScript(src: string): Promise<void> {
  if (!loadedScripts.has(src)) {
    loadedScripts.set(
      src,
      new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Could not load ${src}`))
        document.head.appendChild(script)
      }),
    )
  }
  return loadedScripts.get(src)!
}

let configRequest: Promise<PublicConfig> | undefined
const loadConfig = () => (configRequest ??= authApi.publicConfig())

interface Props {
  /** Called with whatever the server answers: a session, or a two-factor challenge. */
  onResult: (result: AuthResponse) => void
  onError: (message: string) => void
}

export default function SocialButtons({ onResult, onError }: Props) {
  const [config, setConfig] = useState<PublicConfig>()
  const googleSlot = useRef<HTMLDivElement>(null)
  // Kept in a ref so Google's long-lived callback always reaches the latest handlers.
  const handlers = useRef({ onResult, onError })
  useEffect(() => {
    handlers.current = { onResult, onError }
  })

  useEffect(() => {
    loadConfig()
      .then(setConfig)
      .catch(() => setConfig({ googleClientId: null, appleClientId: null }))
  }, [])

  // Google only issues ID tokens through a button it renders itself.
  useEffect(() => {
    const clientId = config?.googleClientId
    if (!clientId) return
    loadScript(GOOGLE_SDK)
      .then(() => {
        if (!window.google || !googleSlot.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) =>
            authApi
              .google(credential)
              .then((result) => handlers.current.onResult(result))
              .catch((err: Error) => handlers.current.onError(err.message)),
        })
        window.google.accounts.id.renderButton(googleSlot.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: googleSlot.current.offsetWidth,
        })
      })
      .catch(() => handlers.current.onError('Could not load Google sign-in'))
  }, [config])

  async function signInWithApple() {
    const clientId = config?.appleClientId
    if (!clientId) {
      onError('Sign in with Apple is not set up yet. Add APPLE_CLIENT_ID to .env (see the README).')
      return
    }
    try {
      await loadScript(APPLE_SDK)
      window.AppleID!.auth.init({ clientId, scope: 'name email', redirectURI: window.location.origin, usePopup: true })
      const response = await window.AppleID!.auth.signIn()
      const name = [response.user?.name?.firstName, response.user?.name?.lastName].filter(Boolean).join(' ')
      onResult(await authApi.apple(response.authorization.id_token, name || undefined))
    } catch (err) {
      // Closing the popup rejects with a plain object; only real failures are worth showing.
      if (err instanceof Error) onError(err.message)
    }
  }

  return (
    <div className="social">
      <div className="divider">
        <span>or</span>
      </div>
      {config?.googleClientId ? (
        <div className="google-slot" ref={googleSlot} />
      ) : (
        <button
          type="button"
          className="button social-button"
          onClick={() => onError('Sign in with Google is not set up yet. Add GOOGLE_CLIENT_ID to .env (see the README).')}
        >
          <GoogleLogo />
          Continue with Google
        </button>
      )}
      <button type="button" className="button social-button apple" onClick={signInWithApple}>
        <AppleLogo />
        Continue with Apple
      </button>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.7c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.3 1.3-2.7 1.3-2.7s-2.5-1-2.5-4zM14 5.7c.7-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.2 1.9-1 3 1.1 0 2.1-.6 2.8-1.4z" />
    </svg>
  )
}
