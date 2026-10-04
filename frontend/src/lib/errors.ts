import { ApiError } from '../api/client'

/** The message to show for a failed request, preferring a specific field's message when there is one. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const [field, message] = Object.entries(err.fieldErrors)[0] ?? []
    if (field) return `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} ${message}`.replace(/^./, (c) => c.toUpperCase())
    return err.message
  }
  return err instanceof Error ? err.message : fallback
}
