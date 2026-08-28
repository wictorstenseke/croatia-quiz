import type { Unsubscribe } from 'firebase/firestore'
import { noteActivity } from './connection'

const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000

export interface ResilientListenerOptions<T> {
  /** Attach a fresh Firestore listener; return its unsubscribe. */
  subscribe: (onNext: (value: T) => void, onError: (error: unknown) => void) => Unsubscribe
  /** Applies one snapshot to component state. */
  onNext: (value: T) => void
}

/**
 * Wraps a Firestore `onSnapshot` listener.
 *
 * Two jobs, and it is worth being precise about which is which, because an
 * earlier version of this file claimed both and did neither.
 *
 * Every snapshot is reported to the connection watchdog as proof the transport
 * is alive. That is the important one: recovering a dead connection happens in
 * `connection.ts`, by rebuilding the transport, because reattaching a listener
 * to a dead stream achieves nothing — the SDK serves the identical query from
 * the view it already holds and writes the Listen request onto the same stream.
 *
 * The error callback covers the narrow case it actually fires for. Network
 * faults never reach it: the SDK classifies `unavailable`, `unknown`,
 * `cancelled` and the rest as retryable and restarts the watch stream itself.
 * A listener is only ever failed when the server removes its target with a
 * cause — the rules refusing the read. Resubscribing with capped backoff is the
 * right response to that and costs nothing the rest of the time.
 */
export function keepListenerAlive<T>({
  subscribe,
  onNext,
}: ResilientListenerOptions<T>): () => void {
  let unsubscribe: Unsubscribe | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  let stopped = false

  // A snapshot arriving is the signal the stream is healthy — reset backoff
  // so a later, unrelated error does not inherit an old, longer delay.
  function handleNext(value: T) {
    attempt = 0
    noteActivity()
    onNext(value)
  }

  function attach() {
    if (stopped) return
    unsubscribe?.()
    unsubscribe = subscribe(handleNext, handleError)
  }

  function handleError() {
    if (stopped) return
    unsubscribe = null
    if (retryTimer !== null) clearTimeout(retryTimer)
    const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS)
    attempt += 1
    retryTimer = setTimeout(() => {
      retryTimer = null
      attach()
    }, delay)
  }

  attach()

  return () => {
    stopped = true
    if (retryTimer !== null) clearTimeout(retryTimer)
    retryTimer = null
    unsubscribe?.()
    unsubscribe = null
  }
}
