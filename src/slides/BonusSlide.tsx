import type { CSSProperties } from 'react'
import { bonus } from '../data/quiz'

interface BonusSlideProps {
  revealed: boolean
  onReveal: () => void
  onNext: () => void
}

export function BonusSlide({ revealed, onReveal, onNext }: BonusSlideProps) {
  return (
    <div className="question__column">
      <header className="question__head">
        <p className="micro stagger" style={{ '--i': 0 } as CSSProperties}>
          {bonus.label}
        </p>
        <h2 className="question__part stagger" style={{ '--i': 1 } as CSSProperties}>
          Sista ordet
        </h2>
      </header>

      <div className="rule stagger" style={{ '--i': 2 } as CSSProperties} />

      <h3 className="question__text stagger" style={{ '--i': 3 } as CSSProperties}>
        {bonus.prompt}
      </h3>

      {revealed && (
        <div className="verdict">
          <p className="micro">Rätt svar</p>
          <p className="verdict__answer">{bonus.answer}</p>
          <p className="verdict__text">Bonusfrågan ger två poäng.</p>
        </div>
      )}

      <div className="question__actions stagger" style={{ '--i': 4 } as CSSProperties}>
        <button type="button" className="btn" onClick={onNext}>
          Visa facit
        </button>
        <button type="button" className="btn btn--ghost" onClick={onReveal} disabled={revealed}>
          {revealed ? 'Svaret visas' : 'Visa svar'}
        </button>
      </div>
    </div>
  )
}
