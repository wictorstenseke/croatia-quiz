import { useCallback, useEffect, useState } from 'react'
import { questions } from './data/quiz'
import { asset } from './lib/asset'
import { useSlideNav } from './hooks/useSlideNav'
import { useHost } from './hooks/useHost'
import { usePlayers } from './hooks/usePlayers'
import { leaderboard } from './lib/scoring'
import { BONUS_QUESTION_ID, slideToSession } from './lib/session'
import { Cover } from './slides/Cover'
import { QuestionLayout } from './slides/QuestionLayout'
import { QuestionSlide } from './slides/QuestionSlide'
import { BonusSlide } from './slides/BonusSlide'
import { ResultSlide } from './slides/ResultSlide'
import { Deck } from './components/Deck'

/** Cover + 15 questions + bonus + facit. */
const TOTAL_SLIDES = questions.length + 3
const BONUS_INDEX = TOTAL_SLIDES - 2
const FACIT_INDEX = TOTAL_SLIDES - 1

/** The bonus keeps part three's photo, so the pan carries straight over. */
const BONUS_PHOTO = {
  image: asset('img/dubrovnik-aerial.jpg'),
  caption: 'Adriatiska havet · Två poäng kvar att ta',
}

/** Which answers the presenter has uncovered, keyed by question id (bonus uses BONUS_QUESTION_ID). */
type Revealed = Record<string, true>

export default function App() {
  const nav = useSlideNav(TOTAL_SLIDES)
  const [revealed, setRevealed] = useState<Revealed>({})

  const reveal = useCallback((id: string) => {
    setRevealed((current) => ({ ...current, [id]: true }))
  }, [])

  const question = nav.index >= 1 && nav.index <= questions.length ? questions[nav.index - 1] : null
  const photo = question ? question.part : nav.index === BONUS_INDEX ? BONUS_PHOTO : null

  const { isHost, publish, clearRound } = useHost()
  const players = usePlayers()
  const target = slideToSession(nav.index, false)
  const targetRevealed = target.questionId
    ? Boolean(revealed[target.questionId])
    : target.revealed

  useEffect(() => {
    if (!isHost) return
    publish(slideToSession(nav.index, targetRevealed))
  }, [isHost, nav.index, targetRevealed, publish])

  return (
    <Deck nav={nav} isHost={isHost} onClearRound={() => void clearRound()}>
      {nav.index === 0 && <Cover onStart={nav.next} showJoinCode={isHost} />}

      {photo && (
        <QuestionLayout image={photo.image} caption={photo.caption}>
          {question ? (
            <QuestionSlide
              question={question}
              position={nav.index}
              total={questions.length}
              revealed={Boolean(revealed[question.id])}
              onReveal={() => reveal(question.id)}
              onNext={nav.next}
            />
          ) : (
            <BonusSlide
              revealed={Boolean(revealed[BONUS_QUESTION_ID])}
              onReveal={() => reveal(BONUS_QUESTION_ID)}
              onNext={nav.next}
            />
          )}
        </QuestionLayout>
      )}

      {nav.index === FACIT_INDEX && (
        <ResultSlide
          standings={leaderboard(players)}
          onRestart={() => {
            setRevealed({})
            nav.go(0)
          }}
        />
      )}
    </Deck>
  )
}
