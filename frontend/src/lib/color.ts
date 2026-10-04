/** A stable hue for a name, so each subscription keeps the same avatar colour everywhere. */
export function hueFor(name: string): number {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) % 360
  return hash
}
