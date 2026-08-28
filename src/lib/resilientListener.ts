import type { Unsubscribe } from 'firebase/firestore'

const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 30000

export interface ResilientListenerOptions<T> {
  /** Attach a fresh Firestore listener; return its unsubscribe. */
  subscribe: (onNext: (value: T) => void, onError: (error: unknown) => void) => Unsubscribe
  /** Applies one snapshot to component state — called for every listener snapshot and every reconcile. */
  onNext: (value: T) => void
  /** A one-shot direct read (getDoc/getDocs), used to update state immediately on recovery rather than waiting for the new listener's first snapshot. */
  reconcile: () => Promise<T>
}

/**
 * Keeps a Firestore `onSnapshot` listener alive.
 *
 * The Firestore JS SDK terminates a listener permanently the moment its
 * stream errors — a token refresh, a network blip, wifi switching to
 * cellular — unless the caller resubscribes. Without an error callback the
 * page carries on looking normal while receiving nothing further, which is
 * silent data loss on a room full of phones. This resubscribes on error with
 * exponential backoff (capped, so a persistently broken stream does not
 * hammer Firestore), and also resubscribes — paired with a direct read that
 * updates state immediately — whenever the tab regains visibility or the
 * browser reports it is back online. That second path is the one that
 * matters most here: a locked screen or a backgrounded tab can suspend the
 * connection without the listener ever noticing on its own, so a periodic
 * glance at the phone is what has to trigger recovery, not a timer.
 *
 * Returns a cleanup function. Calling it cancels any pending retry and
 * removes the visibility/online listeners, so an unmounted component never
 * resubscribes into thin air.
 */
export function keepListenerAlive<T>({
  subscribe,
  onNext,
  reconcile,
}: ResilientListenerOptions<T>): () => void {
  let unsubscribe: Unsubscribe | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  let stopped = false

  function clearRetryTimer() {
    if (retryTimer !== null) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  // A snapshot arriving is the signal the stream is healthy — reset backoff
  // so a later, unrelated error does not inherit an old, longer delay.
  function handleNext(value: T) {
    attempt = 0
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
    clearRetryTimer()
    const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS)
    attempt += 1
    retryTimer = setTimeout(() => {
      retryTimer = null
      attach()
    }, delay)
  }

  // Visibility/online recovery: drop any pending backoff, fetch once so the
  // UI is right immediately, and attach a fresh listener regardless of
  // whether the old one looks alive — there is no reliable way to probe
  // that, so replacing it unconditionally is the safe move.
  function resync() {
    if (stopped) return
    clearRetryTimer()
    attempt = 0
    reconcile().then(handleNext).catch(() => undefined)
    attach()
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') resync()
  }

  attach()
  window.addEventListener('online', resync)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    stopped = true
    clearRetryTimer()
    unsubscribe?.()
    unsubscribe = null
    window.removeEventListener('online', resync)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
