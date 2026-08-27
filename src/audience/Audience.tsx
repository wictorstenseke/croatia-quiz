import { useState } from 'react'
import { useLiveSession } from '../hooks/useLiveSession'
import { usePlayer } from '../hooks/usePlayer'
import { usePlayers } from '../hooks/usePlayers'
import { JoinScreen } from './JoinScreen'
import { PlayScreen } from './PlayScreen'

export function Audience() {
  const session = useLiveSession()
  const players = usePlayers()
  const { uid, name, answers, join, answer } = usePlayer()
  const [joinError, setJoinError] = useState<string | null>(null)

  // join() rejects when two joins race, or when a record appears between the
  // read and the write. Surface that instead of leaving the button dead.
  function handleJoin(chosen: string) {
    setJoinError(null)
    join(chosen).catch(() => {
      setJoinError('Det gick inte att gå med just nu. Försök igen.')
    })
  }

  if (!name) return <JoinScreen onJoin={handleJoin} error={joinError} />

  return (
    <PlayScreen
      session={session}
      name={name}
      uid={uid}
      answers={answers}
      players={players}
      onAnswer={(questionId, value) => void answer(questionId, value)}
    />
  )
}
