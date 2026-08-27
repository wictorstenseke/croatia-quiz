import { useState } from 'react'
import { isPermissionDenied } from '../lib/firebase'
import { useLiveSession } from '../hooks/useLiveSession'
import { usePlayer } from '../hooks/usePlayer'
import { usePlayers } from '../hooks/usePlayers'
import { JoinScreen } from './JoinScreen'
import { PlayScreen } from './PlayScreen'

export function Audience() {
  const session = useLiveSession()
  // The whole collection is only needed for the lobby count and the standings.
  // Holding the listener open through the question phase turns every player's
  // write into a read on every phone — quadratic, and the round runs on the
  // free quota.
  const players = usePlayers(session.phase !== 'question')
  const { uid, name, answers, signInFailed, retrySignIn, join, answer } = usePlayer()
  const [joinError, setJoinError] = useState<string | null>(null)
  const [answerNotice, setAnswerNotice] = useState<string | null>(null)
  const [noticeQuestionId, setNoticeQuestionId] = useState(session.questionId)

  // join() rejects when two joins race, when a record appears between the read
  // and the write, and when the phone never got signed in at all. Surface that
  // instead of leaving the button dead.
  function handleJoin(chosen: string) {
    setJoinError(null)
    join(chosen).catch(() => {
      setJoinError('Det gick inte att gå med just nu. Försök igen.')
    })
  }

  // A tap that lands just after the presenter reveals is applied to the
  // local cache first (the option flashes selected), then refused by the
  // rules; the SDK drops the mutation from the pending queue and a second
  // snapshot reverts it on its own. That revert is correct and must stand —
  // this only explains it instead of leaving the tap to vanish unexplained.
  function handleAnswer(questionId: string, value: string) {
    setAnswerNotice(null)
    answer(questionId, value).catch((error: unknown) => {
      setAnswerNotice(
        isPermissionDenied(error)
          ? 'Svaret hann stänga.'
          : 'Ingen kontakt med servern. Svaret sparades inte.',
      )
    })
  }

  // A notice belongs to the question it happened on — reset it the moment
  // the presenter moves to a new one, before this render paints. (React's
  // "adjusting state when a prop changes" pattern, not an effect: an effect
  // here would commit the stale notice for a frame first.)
  if (noticeQuestionId !== session.questionId) {
    setNoticeQuestionId(session.questionId)
    setAnswerNotice(null)
  }

  if (!name) {
    return (
      <JoinScreen
        onJoin={handleJoin}
        error={
          signInFailed
            ? 'Ingen kontakt med servern. Kontrollera nätet och försök igen.'
            : joinError
        }
        onRetry={signInFailed ? retrySignIn : null}
      />
    )
  }

  return (
    <>
      <PlayScreen
        session={session}
        name={name}
        uid={uid}
        answers={answers}
        players={players}
        onAnswer={handleAnswer}
      />
      {answerNotice && (
        <p className="audience__notice" role="status">
          {answerNotice}
        </p>
      )}
    </>
  )
}
