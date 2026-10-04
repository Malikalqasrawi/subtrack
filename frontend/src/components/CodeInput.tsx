import { useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'

const LENGTH = 6

/** Six single-digit boxes that behave like one field: typing advances, backspace goes back, paste fills. */
export default function CodeInput({ value, onChange, autoFocus }: { value: string; onChange: (code: string) => void; autoFocus?: boolean }) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const focus = (index: number) => boxes.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus()

  function onInput(index: number, typed: string) {
    const digits = typed.replace(/\D/g, '')
    if (!digits) return
    const next = (value.slice(0, index) + digits + value.slice(index + digits.length)).slice(0, LENGTH)
    onChange(next)
    focus(index + digits.length)
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const target = value[index] ? index : index - 1
      if (target >= 0) onChange(value.slice(0, target) + value.slice(target + 1))
      focus(target)
    } else if (event.key === 'ArrowLeft') focus(index - 1)
    else if (event.key === 'ArrowRight') focus(index + 1)
  }

  function onPaste(event: ClipboardEvent) {
    event.preventDefault()
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    onChange(digits)
    focus(digits.length)
  }

  return (
    <div className="code-boxes" onPaste={onPaste}>
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element
          }}
          className={value[index] ? 'filled' : ''}
          value={value[index] ?? ''}
          onChange={(event) => onInput(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          autoFocus={autoFocus && index === 0}
        />
      ))}
    </div>
  )
}
