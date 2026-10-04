import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 900

/**
 * Counts up to `value` whenever it changes, so a total reads as "this is the number that moved".
 * Skipped for people who ask their system for reduced motion.
 */
export default function AnimatedNumber({ value, format }: { value: number; format: (value: number) => string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = value
      return
    }
    const start = performance.now()
    const startValue = from.current
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / DURATION_MS)
      const eased = 1 - Math.pow(1 - progress, 3)
      setShown(startValue + (value - startValue) * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    })
    return () => cancelAnimationFrame(frame)
  }, [value])

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return <>{format(reducedMotion ? value : shown)}</>
}
