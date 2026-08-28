import { useCallback, useEffect, useState } from 'react'
import {
  FieldPath,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db, ensureSignedIn } from '../lib/firebase'
import { keepListenerAlive } from '../lib/resilientListener'

const STORAGE_KEY = 'croatia-quiz.player'

interface StoredPlayer {
  name: string | null
  answers: Record<string, string>
}

export interface PlayerHandle extends StoredPlayer {
  uid: string | null
  /** True once anonymous sign-in has failed; the phone cannot write anything. */
  signInFailed: boolean
  /** Try the sign-in again after a failure. */
  retrySignIn: () => void
  join: (name: string) => Promise<void>
  answer: (questionId: string, value: string) => Promise<void>
}

const EMPTY: StoredPlayer = { name: null, answers: {} }

/** A private window or a cleared site can make this throw or come back empty. */
function readStored(): StoredPlayer {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredPlayer) : EMPTY
  } catch {
    return EMPTY
  }
}

function writeStored(player: StoredPlayer): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player))
  } catch {
    // Nothing to recover; Firestore is still the source of truth.
  }
}

function clearStored(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Same as above: the mirror is a convenience, not the truth.
  }
}

export function usePlayer(): PlayerHandle {
  const [uid, setUid] = useState<string | null>(null)
  const [signInFailed, setSignInFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [player, setPlayer] = useState<StoredPlayer>(readStored)

  useEffect(() => {
    let cancelled = false
    ensureSignedIn()
      .then((user) => {
        if (cancelled) return
        setUid(user.uid)
        setSignInFailed(false)
      })
      // Venue wifi refuses the sign-in often enough that swallowing it leaves a
      // dead join button with nothing on screen to explain it.
      .catch(() => {
        if (!cancelled) setSignInFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retrySignIn = useCallback(() => {
    setSignInFailed(false)
    setAttempt((current) => current + 1)
  }, [])

  useEffect(() => {
    if (!uid) return
    const ref = doc(db, 'players', uid)
    function apply(snapshot: DocumentSnapshot) {
      if (!snapshot.exists()) {
        // The host cleared the round: drop the name so the phone falls back to
        // the join screen and writes a fresh record. Guarded on fromCache —
        // an offline first snapshot also reports "not exists", and wiping a
        // returning player's name because the wifi blinked would be its own bug.
        if (snapshot.metadata.fromCache) return
        setPlayer(EMPTY)
        clearStored()
        return
      }
      const data = snapshot.data() as { name: string; answers?: Record<string, string> }
      const next = { name: data.name, answers: data.answers ?? {} }
      setPlayer(next)
      writeStored(next)
    }
    return keepListenerAlive({
      subscribe: (onNext, onError) => onSnapshot(ref, onNext, onError),
      onNext: apply,
    })
  }, [uid])

  const join = useCallback(
    async (name: string) => {
      // Rejecting rather than returning is what lets the caller say something;
      // a silent return leaves the button looking broken.
      if (!uid) throw new Error('not signed in')
      const ref = doc(db, 'players', uid)
      const existing = await getDoc(ref)
      // A returning player already has a record; only the name may change.
      if (existing.exists()) await updateDoc(ref, { name })
      else await setDoc(ref, { name, answers: {}, joinedAt: serverTimestamp() })
    },
    [uid],
  )

  const answer = useCallback(
    async (questionId: string, value: string) => {
      if (!uid) throw new Error('not signed in')
      // Show the tap immediately; the snapshot confirms it a moment later.
      setPlayer((current) => ({ ...current, answers: { ...current.answers, [questionId]: value } }))
      await updateDoc(doc(db, 'players', uid), new FieldPath('answers', questionId), value)
    },
    [uid],
  )

  return { uid, name: player.name, answers: player.answers, signInFailed, retrySignIn, join, answer }
}
