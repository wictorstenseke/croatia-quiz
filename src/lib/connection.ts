import { disableNetwork, doc, enableNetwork, getDocFromServer } from 'firebase/firestore'
import { db } from './firebase'
import { createConnectionWatchdog } from './connectionWatchdog'

/** How long the backend gets to answer the probe before we call the stream dead. */
const PROBE_TIMEOUT_MS = 8000

/** How often the watchdog looks; the silence window decides whether it acts. */
const TICK_MS = 10000

let cycling: Promise<void> | null = null

/**
 * Drop every Firestore stream and open fresh ones.
 *
 * This is the part resubscribing a listener cannot do. An identical query is
 * served from the view the SDK already holds, and its Listen request is written
 * onto the same stream — so a listener reattached over a dead connection is
 * still a listener over a dead connection. Only disabling and re-enabling the
 * network tears the transport down.
 *
 * Concurrent callers share one cycle: three listeners noticing the same outage
 * must not tear the connection down three times.
 */
export function cycleNetwork(): Promise<void> {
  if (cycling) return cycling
  cycling = disableNetwork(db)
    .then(() => enableNetwork(db))
    .catch(() => undefined)
    .finally(() => {
      cycling = null
    })
  return cycling
}

/**
 * Ask the backend for the session document and see whether it answers.
 *
 * The timeout is the whole point. A wedged stream does not reject this call —
 * `getDocFromServer` waits for a server snapshot that will never come, on a
 * promise that never settles either way. Silence is the signal.
 */
function probeAlive(): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), PROBE_TIMEOUT_MS)
    const settle = (alive: boolean) => {
      clearTimeout(timer)
      resolve(alive)
    }
    getDocFromServer(doc(db, 'session/live')).then(
      () => settle(true),
      () => settle(false),
    )
  })
}

const watchdog = createConnectionWatchdog({
  probe: probeAlive,
  cycle: cycleNetwork,
  now: () => Date.now(),
  isVisible: () => document.visibilityState === 'visible',
})

/** Called from every listener snapshot: proof the transport is still alive. */
export const noteActivity = watchdog.noteActivity

/**
 * Start watching the connection. Mounted once, for the whole app.
 *
 * The interval is what catches the case the old fix could not: a phone held in
 * a hand, screen on, never backgrounded, whose stream died between two
 * questions. Nothing about that phone changes visibility or fires `online`, so
 * only asking on a timer finds it. The event handlers skip the silence window —
 * a tab coming back from a locked screen is the likeliest moment of all to be
 * holding a dead connection.
 */
export function startConnectionWatchdog(): () => void {
  const timer = setInterval(() => watchdog.check(), TICK_MS)
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') watchdog.check({ ignoreSilence: true })
  }
  const onOnline = () => watchdog.check({ ignoreSilence: true })

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('online', onOnline)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('online', onOnline)
  }
}
