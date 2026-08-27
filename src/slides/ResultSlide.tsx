import type { CSSProperties } from 'react'
import { bonus, questions, tiers } from '../data/quiz'
import type { Standing } from '../lib/scoring'
import { Leaderboard } from './Leaderboard'

interface ResultSlideProps {
  onRestart: () => void
  standings: Standing[]
}

export function ResultSlide({ onRestart, standings }: ResultSlideProps) {
  return (
    <section className="slide result">
      <header className="result__head">
        <p className="micro stagger" style={{ '--i': 0 } as CSSProperties}>
          Facit
        </p>
        <h2 className="result__title stagger" style={{ '--i': 1 } as CSSProperties}>
          Rätta svar
        </h2>
      </header>

      <Leaderboard standings={standings} />

      <div className="facit stagger" style={{ '--i': 2 } as CSSProperties}>
        <div className="facit__header micro">
          <span>Nr</span>
          <span>Svar</span>
          <span>Förklaring</span>
        </div>

        {questions.map((question) => (
          <div className="facit__row" key={question.id}>
            <span className="facit__nr">{question.id}</span>
            <span className="facit__answer">{question.answer}</span>
            <span className="facit__explanation">{question.explanation}</span>
          </div>
        ))}

        <div className="facit__row">
          <span className="facit__nr">B</span>
          <span className="facit__answer">–</span>
          <span className="facit__explanation">{bonus.explanation}</span>
        </div>
      </div>

      <p className="micro stagger" style={{ '--i': 3 } as CSSProperties}>
        Poängskala · ett poäng per fråga, två för bonusen
      </p>

      <div className="result__tiers stagger" style={{ '--i': 4 } as CSSProperties}>
        {tiers.map((tier) => (
          <div className="result__tier-card" key={tier.range}>
            <p className="micro">{tier.range}</p>
            <p>{tier.text}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn stagger"
        style={{ '--i': 5 } as CSSProperties}
        onClick={onRestart}
      >
        Börja om
      </button>
    </section>
  )
}
