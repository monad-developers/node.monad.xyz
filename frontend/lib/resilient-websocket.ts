/**
 * A WebSocket wrapper that fails over across a list of endpoints.
 *
 * It switches to the next URL when the current socket:
 * - does not open within `connectTimeoutMs`
 * - errors or closes
 * - stays open but delivers no message for `idleTimeoutMs` (a stalled backend)
 *
 * After a failure it stays on the new endpoint until that one fails too, so a
 * healthy fallback is not dropped just to retry the primary. Every retry waits
 * a random delay within a window that starts at `baseRetryDelayMs` for the
 * first pass over the endpoints and doubles on each pass after that, up to
 * `maxRetryDelayMs`. The failure count resets on the first message received,
 * not on open, so a server that accepts connections but never sends data still
 * counts as down.
 */

export type ConnectionStatus = 'connecting' | 'open' | 'closed'

export interface ResilientWebSocketOptions {
  urls: readonly string[]
  onMessage: (event: MessageEvent) => void
  onStatusChange?: (status: ConnectionStatus, url: string) => void
  connectTimeoutMs?: number
  idleTimeoutMs?: number
  baseRetryDelayMs?: number
  maxRetryDelayMs?: number
}

const DEFAULT_CONNECT_TIMEOUT_MS = 5_000
const DEFAULT_IDLE_TIMEOUT_MS = 10_000
const DEFAULT_BASE_RETRY_DELAY_MS = 1_000
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000

export class ResilientWebSocket {
  private readonly urls: readonly string[]
  private readonly options: ResilientWebSocketOptions
  private socket: WebSocket | null = null
  private urlIndex = 0
  private consecutiveFailures = 0
  private connectTimer: ReturnType<typeof setTimeout> | null = null
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private disposed = false

  constructor(options: ResilientWebSocketOptions) {
    if (options.urls.length === 0) {
      throw new Error('ResilientWebSocket requires at least one URL')
    }
    this.urls = options.urls
    this.options = options
    this.connect()
  }

  get url(): string {
    return this.urls[this.urlIndex]
  }

  close(): void {
    this.disposed = true
    this.clearTimers()
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.teardownSocket()
  }

  private connect(): void {
    if (this.disposed) return

    const url = this.url
    this.options.onStatusChange?.('connecting', url)

    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch (error) {
      // Thrown synchronously for malformed URLs or CSP violations.
      this.fail(`failed to construct WebSocket: ${String(error)}`)
      return
    }
    this.socket = ws

    const connectTimeoutMs =
      this.options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS
    this.connectTimer = setTimeout(() => {
      this.fail(`no open after ${connectTimeoutMs}ms`)
    }, connectTimeoutMs)

    ws.onopen = () => {
      if (this.connectTimer) {
        clearTimeout(this.connectTimer)
        this.connectTimer = null
      }
      this.resetIdleTimer()
      this.options.onStatusChange?.('open', url)
    }

    ws.onmessage = (event) => {
      this.consecutiveFailures = 0
      this.resetIdleTimer()
      this.options.onMessage(event)
    }

    ws.onerror = () => {
      this.fail('socket error')
    }

    ws.onclose = (event) => {
      this.fail(`socket closed (code ${event.code})`)
    }
  }

  /**
   * Abandons the current socket, advances to the next endpoint, and schedules
   * a reconnect.
   */
  private fail(reason: string): void {
    if (this.disposed) return

    const failedUrl = this.url
    this.clearTimers()
    this.teardownSocket()
    this.options.onStatusChange?.('closed', failedUrl)

    this.consecutiveFailures += 1
    this.urlIndex = (this.urlIndex + 1) % this.urls.length

    const delay = this.retryDelay()
    console.warn(
      `[ws] ${failedUrl}: ${reason}; connecting to ${this.url} in ${delay}ms`,
    )
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect()
    }, delay)
  }

  private retryDelay(): number {
    // A backend restart drops every client at once. A random delay spreads
    // them out so they don't all hit the next endpoint at the same instant.
    // Each endpoint gets one try within the base window, so the switch to the
    // fallback and the return to the primary use the same window; it doubles
    // on every pass after that.
    const pass = Math.floor((this.consecutiveFailures - 1) / this.urls.length)
    const base = this.options.baseRetryDelayMs ?? DEFAULT_BASE_RETRY_DELAY_MS
    const max = this.options.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS
    const window = Math.min(max, base * 2 ** pass)
    return Math.round(Math.random() * window)
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    const idleTimeoutMs = this.options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS
    this.idleTimer = setTimeout(() => {
      this.fail(`no message for ${idleTimeoutMs}ms`)
    }, idleTimeoutMs)
  }

  private clearTimers(): void {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  private teardownSocket(): void {
    const ws = this.socket
    if (!ws) return
    this.socket = null
    // Detach handlers first so the close below doesn't re-enter fail().
    ws.onopen = null
    ws.onmessage = null
    ws.onerror = null
    ws.onclose = null
    if (
      ws.readyState === WebSocket.CONNECTING ||
      ws.readyState === WebSocket.OPEN
    ) {
      ws.close()
    }
  }
}
