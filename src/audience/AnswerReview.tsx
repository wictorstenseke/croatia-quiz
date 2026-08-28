import { bonus } from '../data/quiz'
import { BONUS_QUESTION_ID } from '../lib/session'
import { bonusPoints, reviewRows, scoreFor, type ReviewRow } from '../lib/scoring'

interface AnswerReviewProps {
  name: string
  answers: Record<string, string>
}

/**
 * The recap on the audience's own phone, under the standings: every question
 * with what this person picked, and the right answer beside it wherever they
 * differ. The deck's facit is across the room and gone in a minute — this is
 * the copy they can hold still and check their own round against.
 */
export function AnswerReview({ name, answers }: AnswerReviewProps) {
  const rows = reviewRows(answers)
  const guess = answers[BONUS_QUESTION_ID] ?? ''
  const points = bonusPoints(guess)

  return (
    <section className="review">
      <header className="review__head">
        <h2 className="review__title">Dina svar</h2>
        <p className="review__total">{scoreFor({ name, answers })} p</p>
      </header>

      <ol className="review__list">
        {rows.map((row) => (
          <QuestionRow key={row.id} row={row} />
        ))}

        <li className="review__row" data-ok={points === 2}>
          <span className="review__nr">B</span>
          <Mark label={bonusMark(points)} />
          <span className="review__mine">
            {guess.trim() ? guess : <span className="review__blank">Inget svar</span>}
            <span className="review__points">{points} p</span>
          </span>
          {points < 2 && (
            <span className="review__correct">
              Rätt: <b className="review__letter">{bonus.answer}</b>
            </span>
          )}
        </li>
      </ol>
    </section>
  )
}

function QuestionRow({ row }: { row: ReviewRow }) {
  return (
    <li className="review__row" data-ok={row.ok}>
      <span className="review__nr">{row.id}</span>
      <Mark label={row.ok ? 'Rätt' : 'Fel'} />
      <span className="review__mine">
        {row.mine ? (
          <>
            <b className="review__letter">{row.mine}</b> {row.mineLabel}
          </>
        ) : (
          <span className="review__blank">Inget svar</span>
        )}
      </span>
      {!row.ok && (
        <span className="review__correct">
          Rätt: <b className="review__letter">{row.correct}</b> {row.correctLabel}
        </span>
      )}
    </li>
  )
}

/**
 * The tick and the cross are the whole verdict, so the word behind them has to
 * reach a screen reader — the glyph alone is read out as punctuation or not at
 * all.
 */
function Mark({ label }: { label: string }) {
  return (
    <span className="review__mark" data-mark={label}>
      <span className="sr-only">{label}</span>
    </span>
  )
}

function bonusMark(points: 0 | 1 | 2): string {
  if (points === 2) return 'Rätt'
  return points === 1 ? 'Nära' : 'Fel'
}
