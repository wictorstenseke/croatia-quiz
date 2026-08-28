import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import config from './firebase-config.json'

const app = initializeApp(config)

export const db = getFirestore(app)
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
