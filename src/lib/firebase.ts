import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { initializeFirestore, type FirestoreSettings } from 'firebase/firestore'
import config from './firebase-config.json'

const app = initializeApp(config)

/**
 * Long polling, not the default bidirectional stream.
 *
 * By default the SDK holds a single long-lived `fetch()` response open for the
 * Listen stream. WebKit leaves that response open but silently dead after the
 * radio drops for a moment — a screen lock, wifi handing over to cellular, a
 * lift going down. No bytes arrive and no error is raised, so the SDK sees a
 * healthy stream, never restarts it, and never tells the listener anything: the
 * phone sits on whichever question was on screen when the connection died, and
 * only a reload brings it back. Firestore has shipped this transport, withdrawn
 * it twice for “hanging and incomplete queries”, and shipped it again; the
 * reports against the current release are still open. Long polling makes every
 * round trip a discrete request that fails loudly and is retried.
 *
 * `useFetchStreams` is not part of the public settings type. It is read at
 * runtime all the same, and it is what keeps the write stream off fetch too.
 */
const TRANSPORT = {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
} as FirestoreSettings

export const db = initializeFirestore(app, TRANSPORT)
export const auth = getAuth(app)

/**
 * Everyone gets an anonymous uid — the presenter to hold the host seat, the
 * audience to own their answers. The uid survives reloads on the same browser.
 */
/**
 * The rules refusing a write. Everything else the SDK can reject with is a
 * different story: offline writes are queued rather than rejected, so a
 * permission-denied is always a deliberate "no" from the rules.
 */
export function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'permission-denied'
  )
}

export function ensureSignedIn(): Promise<User> {
  return new Promise((resolve, reject) => {
    // onAuthStateChanged's error callback never fires in this SDK version, so
    // the only failure route is signInAnonymously rejecting.
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) {
        stop()
        resolve(user)
        return
      }
      signInAnonymously(auth).catch((error) => {
        stop()
        reject(error)
      })
    })
  })
}
