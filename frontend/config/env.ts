/**
 * Environment variable utilities with validation.
 */

function getEnvOrThrow(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  return value
}

function getEnvOrNull(key: string): string | null {
  return process.env[key] ?? null
}

/**
 * Server-side environment variables (not exposed to client).
 * Only use these in API routes or server components.
 */
export const serverEnv = {
  get BLOCKVISION_API_KEY() {
    return getEnvOrThrow('BLOCKVISION_API_KEY')
  },
}

/**
 * Public environment variables (exposed to client via NEXT_PUBLIC_ prefix).
 *
 * Next.js only inlines NEXT_PUBLIC_ values into the client bundle when they
 * are read as literal `process.env.NEXT_PUBLIC_*` expressions, so these
 * getters must not go through `getEnvOrThrow(key)`.
 */
export const publicEnv = {
  /**
   * Events WebSocket endpoints in priority order: the primary URL, then the
   * optional fallback.
   */
  get EVENTS_WS_URLS(): string[] {
    const primary = process.env.NEXT_PUBLIC_EVENTS_WS_URL
    if (!primary) {
      throw new Error(
        'Environment variable NEXT_PUBLIC_EVENTS_WS_URL is not set',
      )
    }
    const fallback = process.env.NEXT_PUBLIC_EVENTS_WS_FALLBACK_URL
    return fallback ? [primary, fallback] : [primary]
  },
  /** Defaults to false (banner hidden) unless set to "true". */
  get SHOW_MAINTENANCE_BANNER() {
    return process.env.NEXT_PUBLIC_SHOW_MAINTENANCE_BANNER === 'true'
  },
}

export { getEnvOrNull, getEnvOrThrow }
