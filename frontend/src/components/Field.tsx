import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

/** A labelled form control with optional hint and validation message. */
export default function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
