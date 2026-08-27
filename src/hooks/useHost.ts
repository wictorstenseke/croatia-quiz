import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db, ensureSignedIn } from '../lib/firebase'
import { IDLE_SESSION, type LiveSession } from '../lib/session'

/** The key lives only in the presenter's address bar, never in the bundle. */
function hostKeyFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('host')
}

export function useHost(): {
  isHost: boolean
  publish: (session: LiveSession) => void
  clearRound: () => Promise<void>
} {
  const [isHost, setIsHost] = useState(false)

  useEffect(() => {
    const key = hostKeyFromUrl()
    if (!key) return

    let cancelled = false
    void ensureSignedIn()
      .then((user) => setDoc(doc(db, 'control/host'), { uid: user.uid, key }))
      .then(() => {
        if (!cancelled) setIsHost(true)
      })
      .catch(() => {
        // A wrong key is refused by the rules; stay an ordinary viewer.
        if (!cancelled) setIsHost(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const publish = useCallback(
    (session: LiveSession) => {
      if (!isHost) return
      void setDoc(doc(db, 'session/live'), { ...session, updatedAt: serverTimestamp() })
    },
    [isHost],
  )

  const clearRound = useCallback(async () => {
    if (!isHost) return
    const players = await getDocs(collection(db, 'players'))
    await Promise.all(players.docs.map((player) => deleteDoc(player.ref)))
    await setDoc(doc(db, 'session/live'), { ...IDLE_SESSION, updatedAt: serverTimestamp() })
  }, [isHost])

  return { isHost, publish, clearRound }
}
