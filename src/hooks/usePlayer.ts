import { useCallback, useEffect, useState } from 'react'
import {
  FieldPath,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, ensureSignedIn } from '../lib/firebase'

const STORAGE_KEY = 'croatia-quiz.player'

interface StoredPlayer {
  name: string | null
  answers: Record<string, string>
}

export interface PlayerHandle extends StoredPlayer {
  uid: string | null
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

export function usePlayer(): PlayerHandle {
  const [uid, setUid] = useState<string | null>(null)
  const [player, setPlayer] = useState<StoredPlayer>(readStored)

  useEffect(() => {
    void ensureSignedIn().then((user) => setUid(user.uid))
  }, [])

  useEffect(() => {
    if (!uid) return
    return onSnapshot(doc(db, 'players', uid), (snapshot) => {
      if (!snapshot.exists()) return
      const data = snapshot.data() as { name: string; answers?: Record<string, string> }
      const next = { name: data.name, answers: data.answers ?? {} }
      setPlayer(next)
      writeStored(next)
    })
  }, [uid])

  const join = useCallback(
    async (name: string) => {
      if (!uid) return
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
      if (!uid) return
      // Show the tap immediately; the snapshot confirms it a moment later.
      setPlayer((current) => ({ ...current, answers: { ...current.answers, [questionId]: value } }))
      await updateDoc(doc(db, 'players', uid), new FieldPath('answers', questionId), value)
    },
    [uid],
  )

  return { uid, name: player.name, answers: player.answers, join, answer }
}
