export type Theme = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'subtrack-theme'

export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage can be unavailable (private mode); fall through to the system setting.
  }
  return 'system'
}

/** Sets or clears the `data-theme` attribute that the stylesheet keys its colours on. */
export function applyTheme(theme: Theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
  try {
    if (theme === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Not being able to remember the choice is harmless.
  }
}
