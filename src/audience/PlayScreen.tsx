import { bonus, questions, type Choice } from '../data/quiz'
import { BONUS_QUESTION_ID, type LiveSession } from '../lib/session'
import { leaderboard, type PlayerRecord, type Standing } from '../lib/scoring'

const LETTERS: Choice[] = ['A', 'B', 'C']

interface PlayScreenProps {
  session: LiveSession
  name: string
  uid: string | null
  answers: Record<string, string>
  players: Record<string, PlayerRecord>
  onAnswer: (questionId: string, value: string) => void
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
    return (
      <section className="audience">
        <p className="micro">Hej {name}</p>
        <h1 className="audience__title">Väntar på första frågan…</h1>
        <p className="audience__lede">
          {Object.keys(players).length} med i rummet. Håll telefonen framme.
        </p>
      </section>
    )
  }

  if (session.phase === 'leaderboard') {
    return <Standings standings={leaderboard(players)} uid={uid} />
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
              onClick={() => onAnswer(question.id, letter)}
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

function BonusAnswer({
  value,
  revealed,
  onAnswer,
}: {
  value: string
  revealed: boolean
  onAnswer: (value: string) => void
}) {
  return (
    <section className="audience">
      <p className="micro">Bonusfråga · 2 poäng</p>
      <h1 className="audience__question">{bonus.prompt}</h1>

      <input
        className="audience__input"
        value={value}
        onChange={(event) => onAnswer(event.target.value)}
        placeholder="Skriv ditt svar"
        maxLength={60}
        autoComplete="off"
        disabled={revealed}
      />

      {revealed ? (
        <p className="audience__verdict" data-correct={true}>
          Rätt svar: {bonus.answer}
        </p>
      ) : (
        <p className="micro audience__hint">Hälften rätt ger 1 poäng, allt rätt ger 2</p>
      )}
    </section>
  )
}

function Standings({ standings, uid }: { standings: Standing[]; uid: string | null }) {
  return (
    <section className="audience">
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
    </section>
  )
}
