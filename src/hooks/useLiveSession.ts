import { useEffect, useState } from 'react'
import { doc, getDoc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { keepListenerAlive } from '../lib/resilientListener'
import { IDLE_SESSION, type LiveSession } from '../lib/session'

/** Follows whatever slide the presenter is on. */
export function useLiveSession(): LiveSession {
  const [session, setSession] = useState<LiveSession>(IDLE_SESSION)

  useEffect(() => {
    const ref = doc(db, 'session/live')
    function apply(snapshot: DocumentSnapshot) {
      setSession(snapshot.exists() ? (snapshot.data() as LiveSession) : IDLE_SESSION)
    }
    return keepListenerAlive({
      subscribe: (onNext, onError) => onSnapshot(ref, onNext, onError),
      onNext: apply,
      reconcile: () => getDoc(ref),
    })
  }, [])

  return session
}
