import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { PlayerRecord } from '../lib/scoring'

/** Everyone reads everyone, which is what lets each phone rank the round itself. */
export function usePlayers(): Record<string, PlayerRecord> {
  const [players, setPlayers] = useState<Record<string, PlayerRecord>>({})

  useEffect(
    () =>
      onSnapshot(collection(db, 'players'), (snapshot) => {
        const next: Record<string, PlayerRecord> = {}
        for (const document of snapshot.docs) {
          const data = document.data() as { name: string; answers?: Record<string, string> }
          next[document.id] = { name: data.name, answers: data.answers ?? {} }
        }
        setPlayers(next)
      }),
    [],
  )

  return players
}
