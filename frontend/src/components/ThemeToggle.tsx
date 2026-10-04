import { useState } from 'react'
import { applyTheme, loadTheme } from '../lib/theme'
import type { Theme } from '../lib/theme'
import Icon from './Icon'
import type { IconName } from './Icon'

const OPTIONS: { theme: Theme; icon: IconName; label: string }[] = [
  { theme: 'light', icon: 'sun', label: 'Light' },
  { theme: 'system', icon: 'monitor', label: 'Match system' },
  { theme: 'dark', icon: 'moon', label: 'Dark' },
]

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  function choose(next: Theme) {
    setTheme(next)
    applyTheme(next)
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      {OPTIONS.map((option) => (
        <button
          key={option.theme}
          className={theme === option.theme ? 'selected' : ''}
          aria-pressed={theme === option.theme}
          aria-label={option.label}
          title={option.label}
          onClick={() => choose(option.theme)}
        >
          <Icon name={option.icon} size={16} />
        </button>
      ))}
    </div>
  )
}
