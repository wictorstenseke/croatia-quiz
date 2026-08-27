import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { IDLE_SESSION, type LiveSession } from '../lib/session'

/** Follows whatever slide the presenter is on. */
export function useLiveSession(): LiveSession {
  const [session, setSession] = useState<LiveSession>(IDLE_SESSION)

  useEffect(
    () =>
      onSnapshot(doc(db, 'session/live'), (snapshot) => {
        setSession(snapshot.exists() ? (snapshot.data() as LiveSession) : IDLE_SESSION)
      }),
    [],
  )

  return session
}
