import type { CSSProperties } from 'react'
import type { Choice, Question } from '../data/quiz'

const LETTERS: Choice[] = ['A', 'B', 'C']

interface QuestionSlideProps {
  question: Question
  position: number
  total: number
  revealed: boolean
  onReveal: () => void
  onNext: () => void
}

export function QuestionSlide({
  question,
  position,
  total,
  revealed,
  onReveal,
  onNext,
}: QuestionSlideProps) {
  return (
    /* Keyed on the question so the text re-animates while the photo stays put. */
    <div className="question__column" key={question.id}>
      <header className="question__head">
        <p className="micro stagger" style={{ '--i': 0 } as CSSProperties}>
          {question.part.label}
        </p>
        <h2 className="question__part stagger" style={{ '--i': 1 } as CSSProperties}>
          {question.part.title}
        </h2>
      </header>

      <div className="rule stagger" style={{ '--i': 2 } as CSSProperties} />

      <h3 className="question__text stagger" style={{ '--i': 3 } as CSSProperties}>
        {question.prompt}
      </h3>

      <ul className="options stagger" style={{ '--i': 4 } as CSSProperties}>
        {LETTERS.map((letter) => (
          <li
            className="option"
            key={letter}
            data-state={!revealed ? 'idle' : letter === question.answer ? 'correct' : 'muted'}
          >
            <span className="option__letter">{letter}</span>
            <span className="option__label">{question.options[letter]}</span>
          </li>
        ))}
      </ul>

      {revealed && (
        <div className="verdict">
          <p className="micro">Rätt svar · {question.answer}</p>
          <p className="verdict__text">{question.explanation}</p>
        </div>
      )}

      <div className="question__actions stagger" style={{ '--i': 5 } as CSSProperties}>
        <button type="button" className="btn" onClick={onNext}>
          {position === total ? 'Till bonusfrågan' : 'Nästa fråga'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onReveal} disabled={revealed}>
          {revealed ? 'Svaret visas' : 'Visa svar'}
        </button>
      </div>
    </div>
  )
}
