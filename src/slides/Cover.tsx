import { asset } from '../lib/asset'
import { JoinCode } from '../components/JoinCode'

export function Cover({ onStart, showJoinCode }: { onStart: () => void; showJoinCode: boolean }) {
  return (
    <section className="slide cover">
      <img className="cover__photo" src={asset('img/dubrovnik-aerial.jpg')} alt="" />
      <div className="cover__veil" />

      <div className="cover__body">
        <p className="micro micro--light stagger" style={{ '--i': 0 } as React.CSSProperties}>
          Quiz · 15 frågor · Kroatien
        </p>

        <h1 className="cover__title stagger" style={{ '--i': 1 } as React.CSSProperties}>
          Dubrovnik
        </h1>

        <p className="cover__lede stagger" style={{ '--i': 2 } as React.CSSProperties}>
          Femton frågor om murarna, republiken och pärlan vid Adriatiska havet. Facit sist —
          inget fusk före landning.
        </p>

        <button
          type="button"
          className="btn btn--light stagger"
          style={{ '--i': 3 } as React.CSSProperties}
          onClick={onStart}
        >
          Börja quizet
        </button>
      </div>

      <p className="micro micro--light cover__footline">
        Adriatiska havet · Perla Jadrana · Livet bakom murarna
      </p>

      {showJoinCode && <JoinCode />}
    </section>
  )
}
