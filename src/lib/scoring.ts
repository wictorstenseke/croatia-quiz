import { questions } from '../data/quiz'

const BONUS_TARGET = 'zivjeli'
/** Half the letters, rounded up: four of seven. */
const BONUS_THRESHOLD = Math.ceil(BONUS_TARGET.length / 2)

export interface PlayerRecord {
  name: string
  answers: Record<string, string>
}

export interface Standing {
  uid: string
  name: string
  score: number
  place: number
}

/** Fold away case, accents and punctuation so "Živjeli!" matches "zivjeli". */
export function normalise(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

/** Edit distance, carrying two rows instead of the whole matrix. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  let current = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    current[0] = i
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution)
    }
    const swap = previous
    previous = current
    current = swap
  }

  return previous[b.length]
}

/**
 * Half the letters right earns a point, all of them earn two. Edit distance
 * rather than position, so one inserted letter does not push everything after
 * it out of place.
 */
export function bonusPoints(guess: string): 0 | 1 | 2 {
  const distance = levenshtein(normalise(guess), BONUS_TARGET)
  const correct = Math.max(0, BONUS_TARGET.length - distance)
  if (correct === BONUS_TARGET.length) return 2
  return correct >= BONUS_THRESHOLD ? 1 : 0
}

export function scoreFor(player: PlayerRecord): number {
  const fromQuestions = questions.filter((q) => player.answers[q.id] === q.answer).length
  return fromQuestions + bonusPoints(player.answers.bonus ?? '')
}

/** Equal scores share a place, and the next place skips past them. */
export function leaderboard(players: Record<string, PlayerRecord>): Standing[] {
  const scored = Object.entries(players)
    .map(([uid, player]) => ({ uid, name: player.name, score: scoreFor(player) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'sv'))

  let place = 0
  let previousScore = Number.NaN

  return scored.map((entry, index) => {
    if (entry.score !== previousScore) {
      place = index + 1
      previousScore = entry.score
    }
    return { ...entry, place }
  })
}
