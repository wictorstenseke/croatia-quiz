/**
 * How long the transport may say nothing before we stop believing it.
 *
 * Long enough that an ordinary gap between slides costs nothing, short enough
 * that a phone is never more than half a question behind the room.
 */
export const SILENCE_MS = 25000

export interface WatchdogDeps {
  /** Resolves true if the backend answered, false if it hung or refused. */
  probe: () => Promise<boolean>
  /** Tear the transport down and build a new one. */
  cycle: () => Promise<void>
  now: () => number
  isVisible: () => boolean
}

export interface Watchdog {
  /** A snapshot arrived — the transport is demonstrably alive. */
  noteActivity: () => void
  /** Probe, and cycle the network if nothing answers. */
  check: (options?: { ignoreSilence?: boolean }) => void
}

/**
 * Decides when the Firestore transport has gone quiet in a way that means it is
 * dead rather than idle.
 *
 * The SDK cannot answer that question for us. A watch stream that stops
 * delivering without closing — which is what WebKit leaves behind after a radio
 * blip — looks identical from the inside to a stream on which nothing has
 * happened, so the SDK never restarts it and the listener is never told. The
 * only way to tell the two apart is to ask the backend something and see
 * whether an answer comes back.
 *
 * Every dependency is injected so the decision can be tested without a browser,
 * a network, or a clock.
 */
export function createConnectionWatchdog({
  probe,
  cycle,
  now,
  isVisible,
}: WatchdogDeps): Watchdog {
  let lastActivityAt = now()
  let probing = false

  function noteActivity() {
    lastActivityAt = now()
  }

  function check({ ignoreSilence = false } = {}) {
    // A probe costs a billed read on every phone in the room, so it is spent
    // only on a tab someone is actually looking at, and only once the stream
    // has had nothing to say for a while.
    if (probing || !isVisible()) return
    if (!ignoreSilence && now() - lastActivityAt < SILENCE_MS) return

    probing = true
    probe()
      .then((alive) => (alive ? undefined : cycle()))
      .catch(() => undefined)
      .finally(() => {
        probing = false
        // Whether it answered or we rebuilt the transport, we have just
        // established the truth: start the window again rather than probing
        // on every tick for as long as the room stays offline.
        lastActivityAt = now()
      })
  }

  return { noteActivity, check }
}
