import type { Standing } from '../lib/scoring'

/** The deck's own standings — larger, and without the "you are here" marker. */
export function Leaderboard({ standings }: { standings: Standing[] }) {
  if (standings.length === 0) return null

  return (
    <div className="deck-standings">
      <p className="micro">Topplista · {standings.length} spelare</p>

      <ol className="standings standings--deck">
        {standings.map((standing) => (
          <li className="standing" key={standing.uid}>
            <span className="standing__place">{standing.place}</span>
            <span className="standing__name">{standing.name}</span>
            <span className="standing__score">{standing.score}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
