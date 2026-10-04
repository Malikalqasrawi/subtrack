import { useState } from 'react'
import { PASSWORD_RULES } from '../lib/password'
import Field from './Field'
import Icon from './Icon'

interface Props {
  label: string
  value: string
  onChange: (password: string) => void
  autoComplete: 'current-password' | 'new-password'
  error?: string
  /** Shows the password rules and ticks each one off as it is met. */
  showRules?: boolean
  autoFocus?: boolean
}

export default function PasswordField({ label, value, onChange, autoComplete, error, showRules, autoFocus }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <Field label={label} error={error}>
      <span className="password-input">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          maxLength={72}
          required
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          <Icon name="eye" size={17} />
        </button>
      </span>
      {showRules && (
        <ul className="password-rules">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(value)
            return (
              <li key={rule.label} className={met ? 'met' : ''}>
                <span className="rule-mark">{met && <Icon name="check" size={11} />}</span>
                {rule.label}
              </li>
            )
          })}
        </ul>
      )}
    </Field>
  )
}
