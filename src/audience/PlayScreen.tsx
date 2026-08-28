import { useEffect, useRef, useState } from 'react'
import { bonus, questions, type Choice } from '../data/quiz'
import { BONUS_QUESTION_ID, type LiveSession } from '../lib/session'
import { bonusPoints, leaderboard, type PlayerRecord, type Standing } from '../lib/scoring'
import { AnswerReview } from './AnswerReview'

const LETTERS: Choice[] = ['A', 'B', 'C']

interface PlayScreenProps {
  session: LiveSession
  name: string
  uid: string | null
  answers: Record<string, string>
  players: Record<string, PlayerRecord>
  onAnswer: (questionId: string, value: string) => Promise<void>
}

export function PlayScreen({
  session,
  name,
  uid,
  answers,
  players,
  onAnswer,
}: PlayScreenProps) {
  if (session.phase === 'lobby') {
    return <Lobby name={name} uid={uid} players={players} />
  }

  if (session.phase === 'leaderboard') {
    return (
      <Standings standings={leaderboard(players)} uid={uid} name={name} answers={answers} />
    )
  }

  if (session.questionId === BONUS_QUESTION_ID) {
    return (
      <BonusAnswer
        value={answers[BONUS_QUESTION_ID] ?? ''}
        revealed={session.revealed}
        onAnswer={(value) => onAnswer(BONUS_QUESTION_ID, value)}
      />
    )
  }

  const question = questions.find((q) => q.id === session.questionId)
  if (!question) {
    return (
      <section className="audience">
        <p className="micro">Väntar…</p>
      </section>
    )
  }

  const chosen = answers[question.id]

  return (
    <section className="audience">
      <p className="micro">
        Fråga {question.id} {session.revealed && '· rättad'}
      </p>
      <h1 className="audience__question">{question.prompt}</h1>

      <ul className="options">
        {LETTERS.map((letter) => (
          <li key={letter}>
            <button
              type="button"
              className="option option--tappable"
              onClick={() => {
                onAnswer(question.id, letter).catch(() => {})
              }}
              disabled={session.revealed}
              aria-pressed={chosen === letter}
              data-state={optionState(letter, chosen, question.answer, session.revealed)}
            >
              <span className="option__letter">{letter}</span>
              <span className="option__label">{question.options[letter]}</span>
            </button>
          </li>
        ))}
      </ul>

      {session.revealed ? (
        <p className="audience__verdict" data-correct={chosen === question.answer}>
          {chosen === question.answer
            ? 'Rätt · 1 poäng'
            : `Rätt svar var ${question.answer}`}
        </p>
      ) : (
        <p className="micro audience__hint">
          {chosen ? 'Du kan ändra dig tills svaret visas' : 'Välj ett alternativ'}
        </p>
      )}
    </section>
  )
}

function optionState(
  letter: Choice,
  chosen: string | undefined,
  answer: Choice,
  revealed: boolean,
): string {
  if (!revealed) return chosen === letter ? 'selected' : 'idle'
  if (letter === answer) return 'correct'
  if (letter === chosen) return 'wrong'
  return 'muted'
}

function Lobby({
  name,
  uid,
  players,
}: {
  name: string
  uid: string | null
  players: Record<string, PlayerRecord>
}) {
  const roster = Object.entries(players)
    .map(([playerUid, record]) => ({ uid: playerUid, name: record.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'))

  return (
    <section className="audience">
      <p className="micro">Hej {name}</p>
      <h1 className="audience__title">Väntar på första frågan…</h1>
      {roster.length > 0 ? (
        <ul className="roster">
          {roster.map((player) => (
            <li className="roster__name" key={player.uid} data-you={player.uid === uid}>
              {player.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="audience__lede">Du är först i rummet. Håll telefonen framme.</p>
      )}
    </section>
  )
}

/**
 * Long enough that a typed word costs one write instead of one per letter,
 * short enough that little is ever owed: anything still pending when the slide
 * changes is flushed rather than dropped, and this is the width of the window
 * in which that flush can be refused.
 */
const BONUS_DEBOUNCE_MS = 300

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function BonusAnswer({
  value,
  revealed,
  onAnswer,
}: {
  value: string
  revealed: boolean
  onAnswer: (value: string) => Promise<void>
}) {
  // What the person is typing, held locally so every keystroke paints at once
  // without a write behind it. `sent` is the last value we handed to onAnswer,
  // which is what the record should be echoing back; the record staying the
  // source of truth means anything else it says — a refused write reverting —
  // is adopted here, in render, before the stale draft can paint.
  const [draft, setDraft] = useState(value)
  const [sent, setSent] = useState(value)
  // Only the explicit "Spara svar" button drives this — the debounced autosave
  // stays invisible by design, so it must never claim a save this state didn't
  // itself request.
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flush = useRef<() => void>(() => {})

  if (value !== sent) {
    setSent(value)
    setDraft(value)
  }

  // Refreshed every render so the cleanup below, which is registered once, can
  // still reach the current draft and the current onAnswer.
  useEffect(() => {
    flush.current = () => {
      if (!timer.current) return
      clearTimeout(timer.current)
      timer.current = null
      const next = draft
      setSent(next)
      onAnswer(next).catch(() => {})
    }
  })

  // The presenter moving off the bonus slide unmounts this. Send what is owed
  // instead of discarding it: two points the person believes they have already
  // given. A flush the rules refuse reverts and explains itself the same way
  // any late answer does.
  useEffect(() => {
    return () => flush.current()
  }, [])

  // The presenter can reveal mid-keystroke, before the debounce has fired.
  // Flush immediately so the score shown below is graded on what was actually
  // typed, not on whatever happened to be saved a moment earlier.
  useEffect(() => {
    if (revealed) flush.current()
  }, [revealed])

  function onType(next: string) {
    setDraft(next)
    setSaveState('idle')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      setSent(next)
      onAnswer(next).catch(() => {})
    }, BONUS_DEBOUNCE_MS)
  }

  function handleSave() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const toSave = draft
    setSent(toSave)
    setSaveState('saving')
    onAnswer(toSave)
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('error'))
  }

  const points = bonusPoints(value)

  return (
    <section className="audience">
      <p className="micro">Bonusfråga · 2 poäng</p>
      <h1 className="audience__question">{bonus.prompt}</h1>

      <input
        className="audience__input"
        value={draft}
        onChange={(event) => onType(event.target.value)}
        placeholder="Skriv ditt svar"
        maxLength={60}
        autoComplete="off"
        disabled={revealed}
      />

      {!revealed && (
        <button type="button" className="btn btn--ghost audience__save" onClick={handleSave}>
          {saveLabel(saveState)}
        </button>
      )}

      {revealed ? (
        <>
          <p className="audience__verdict" data-correct={verdictTone(points)}>
            {verdictLabel(points)}
          </p>
          <p className="micro audience__hint">Rätt svar: {bonus.answer}</p>
        </>
      ) : (
        <p className="micro audience__hint">Hälften rätt ger 1 poäng, allt rätt ger 2</p>
      )}
    </section>
  )
}

function saveLabel(state: SaveState): string {
  if (state === 'saving') return 'Sparar…'
  if (state === 'saved') return 'Sparat'
  if (state === 'error') return 'Kunde inte spara — försök igen'
  return 'Spara svar'
}

/**
 * Edit distance rather than a right/wrong split, so the wording has to carry
 * three outcomes instead of two: full marks, a genuine near miss, and nothing.
 */
function verdictTone(points: 0 | 1 | 2): 'true' | 'partial' | 'false' {
  if (points === 2) return 'true'
  if (points === 1) return 'partial'
  return 'false'
}

function verdictLabel(points: 0 | 1 | 2): string {
  if (points === 2) return `Helt rätt · ${points} poäng`
  if (points === 1) return `Nära nog · ${points} poäng`
  return 'Inga poäng den här gången'
}

function Standings({
  standings,
  uid,
  name,
  answers,
}: {
  standings: Standing[]
  uid: string | null
  name: string
  answers: Record<string, string>
}) {
  return (
    // The recap below runs past the fold on any phone, so this screen scrolls
    // from the top rather than centring what no longer fits.
    <section className="audience audience--scroll">
      <p className="micro">Facit</p>
      <h1 className="audience__title">Topplistan</h1>

      <ol className="standings">
        {standings.map((standing) => (
          <li className="standing" key={standing.uid} data-you={standing.uid === uid}>
            <span className="standing__place">{standing.place}</span>
            <span className="standing__name">{standing.name}</span>
            <span className="standing__score">{standing.score}</span>
          </li>
        ))}
      </ol>

      <AnswerReview name={name} answers={answers} />
    </section>
  )
}
