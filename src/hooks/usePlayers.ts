import { useEffect, useState } from 'react'
import { collection, onSnapshot, type QuerySnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { keepListenerAlive } from '../lib/resilientListener'
import type { PlayerRecord } from '../lib/scoring'

/**
 * Everyone reads everyone, which is what lets each phone rank the round itself.
 *
 * The listener is worth its cost only where the roster is on screen — the lobby
 * count and the standings. Every write fans out to every open listener as a
 * billed read, so keeping it open through the question phase costs one read per
 * player per tap per client: quadratic, and a fifty-player round would run the
 * free daily quota dry. Pass `enabled: false` outside those phases; the last
 * snapshot is kept, so re-enabling shows the previous roster until the fresh
 * one lands a moment later.
 */
export function usePlayers(enabled: boolean): Record<string, PlayerRecord> {
  const [players, setPlayers] = useState<Record<string, PlayerRecord>>({})

  useEffect(() => {
    if (!enabled) return
    const ref = collection(db, 'players')
    function apply(snapshot: QuerySnapshot) {
      const next: Record<string, PlayerRecord> = {}
      for (const document of snapshot.docs) {
        const data = document.data() as { name: string; answers?: Record<string, string> }
        next[document.id] = { name: data.name, answers: data.answers ?? {} }
      }
      setPlayers(next)
    }
    return keepListenerAlive({
      subscribe: (onNext, onError) => onSnapshot(ref, onNext, onError),
      onNext: apply,
    })
  }, [enabled])

  return players
}
