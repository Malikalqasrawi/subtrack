import type { CSSProperties } from 'react'
import { hueFor } from '../lib/color'

/** A coloured tile with the first letter of the name. */
export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const style = { '--hue': hueFor(name), width: size, height: size, fontSize: size * 0.42 } as CSSProperties
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
