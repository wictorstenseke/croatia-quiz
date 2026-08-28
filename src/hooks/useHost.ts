import { useCallback, useEffect, useRef, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, ensureSignedIn, isPermissionDenied } from '../lib/firebase'
import { IDLE_SESSION, type LiveSession } from '../lib/session'

/**
 * Where this deck stands in relation to the room.
 *
 * - `viewer`: no key in the address, an ordinary deck that drives nothing.
 * - `claiming`: taking, or taking back, the seat.
 * - `host`: the phones follow this deck.
 * - `refused`: the key was not accepted, or the claim never got through.
 * - `lost`: another tab holds the seat and this deck could not take it back.
 *
 * `refused` and `lost` both mean the same thing on the projector — the slides
 * move and the room does not follow — which is exactly what has to be visible.
 */
export type HostStatus = 'viewer' | 'claiming' | 'host' | 'refused' | 'lost'

/** The key lives only in the presenter's address bar, never in the bundle. */
function hostKeyFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('host')
}

export function useHost(): {
  isHost: boolean
  status: HostStatus
  publish: (session: LiveSession) => void
  /** Resolves with the number of players that failed to delete (0 = clean). */
  clearRound: () => Promise<number>
} {
  const [status, setStatus] = useState<HostStatus>(() =>
    hostKeyFromUrl() ? 'claiming' : 'viewer',
  )
  // One re-claim, ever. Two decks open on the same key would otherwise take
  // the seat from each other in a loop, each republishing as it wins.
  const reclaimed = useRef(false)

  const claim = useCallback(async () => {
    const key = hostKeyFromUrl()
    if (!key) return false
    try {
      const user = await ensureSignedIn()
      await setDoc(doc(db, 'control/host'), { uid: user.uid, key })
      return true
    } catch {
      // A wrong key is refused by the rules; a dead network fails here too.
      return false
    }
  }, [])

  useEffect(() => {
    if (!hostKeyFromUrl()) return

    let cancelled = false
    void claim().then((claimed) => {
      if (!cancelled) setStatus(claimed ? 'host' : 'refused')
    })

    return () => {
      cancelled = true
    }
  }, [claim])

  const publish = useCallback(
    (session: LiveSession) => {
      if (status !== 'host') return
      setDoc(doc(db, 'session/live'), { ...session, updatedAt: serverTimestamp() }).catch(
        (error: unknown) => {
          // Offline writes are queued, not rejected: a refusal here means the
          // seat is gone. Stop pretending to drive the room, and try once to
          // take it back — the publish effect fires again the moment we do.
          if (!isPermissionDenied(error)) return
          if (reclaimed.current) {
            setStatus('lost')
            return
          }
          reclaimed.current = true
          setStatus('claiming')
          void claim().then((claimed) => setStatus(claimed ? 'host' : 'lost'))
        },
      )
    },
    [status, claim],
  )

  const clearRound = useCallback(async () => {
    if (status !== 'host') return 0
    const players = await getDocs(collection(db, 'players'))
    // allSettled, not all: one player's delete failing must not abandon the rest,
    // and the session must still return to the lobby below regardless of the count.
    const results = await Promise.allSettled(players.docs.map((player) => deleteDoc(player.ref)))
    const failed = results.filter((result) => result.status === 'rejected').length
    // Through publish(), so a seat lost mid-reset is reported the same way as
    // any other refused write instead of rejecting into a caller that has no
    // way to explain it.
    publish(IDLE_SESSION)
    return failed
  }, [status, publish])

  return { isHost: status === 'host', status, publish, clearRound }
}
