import { describe, expect, it } from 'vitest'
import { bonus, questions } from '../data/quiz'
import {
  bonusPoints,
  leaderboard,
  levenshtein,
  normalise,
  reviewRows,
  scoreFor,
} from './scoring'

describe('normalise', () => {
  it('folds away case, accents and punctuation', () => {
    expect(normalise('Živjeli!')).toBe('zivjeli')
    expect(normalise('  ŽIVJELI  ')).toBe('zivjeli')
    expect(normalise('Ziv-jeli')).toBe('zivjeli')
  })
})

describe('levenshtein', () => {
  it('is zero for identical strings', () => {
    expect(levenshtein('zivjeli', 'zivjeli')).toBe(0)
  })

  it('counts a single inserted letter as one edit', () => {
    expect(levenshtein('zivjelli', 'zivjeli')).toBe(1)
  })

  it('counts missing letters against an empty string', () => {
    expect(levenshtein('', 'zivjeli')).toBe(7)
  })

  it('is symmetric', () => {
    expect(levenshtein('ziv', 'zivjeli')).toBe(levenshtein('zivjeli', 'ziv'))
  })

  it('counts a substituted letter as one edit', () => {
    expect(levenshtein('zivjeli', 'zivjelo')).toBe(1)
    expect(levenshtein('cat', 'bat')).toBe(1)
  })

  it('counts a substitution and an insertion together', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
  })
})

describe('bonusPoints', () => {
  it('gives two points for the exact answer, however it is written', () => {
    expect(bonusPoints('Živjeli!')).toBe(2)
    expect(bonusPoints('zivjeli')).toBe(2)
    expect(bonusPoints('ŽIVJELI')).toBe(2)
  })

  it('gives one point for half the letters or more', () => {
    // one edit away: six of seven letters right
    expect(bonusPoints('zivjelli')).toBe(1)
    // three edits away: exactly four of seven, the threshold
    expect(bonusPoints('zivj')).toBe(1)
  })

  it('grades against the answer in the quiz data, whatever it says', () => {
    // The guard on the constant: change bonus.answer and this still holds,
    // because the target is derived from it rather than written down twice.
    expect(bonusPoints(bonus.answer)).toBe(2)
    expect(normalise(bonus.answer)).toBe('zivjeli')
  })

  it('gives nothing below half', () => {
    // four edits away: three of seven, one under the threshold
    expect(bonusPoints('ziv')).toBe(0)
    expect(bonusPoints('')).toBe(0)
  })
})

describe('scoreFor', () => {
  it('gives a point per correct question', () => {
    expect(scoreFor({ name: 'Anna', answers: { '01': 'B', '02': 'C' } })).toBe(2)
  })

  it('ignores wrong and missing answers', () => {
    expect(scoreFor({ name: 'Anna', answers: { '01': 'A', '02': 'C' } })).toBe(1)
    expect(scoreFor({ name: 'Anna', answers: {} })).toBe(0)
  })

  it('adds the bonus on top', () => {
    expect(scoreFor({ name: 'Anna', answers: { '01': 'B', bonus: 'Živjeli' } })).toBe(3)
  })

  it('reaches seventeen on a perfect round', () => {
    const answers: Record<string, string> = { bonus: 'Živjeli!' }
    for (const question of questions) answers[question.id] = question.answer
    expect(scoreFor({ name: 'Anna', answers })).toBe(17)
  })
})

describe('leaderboard', () => {
  it('sorts by score, then by name', () => {
    const standings = leaderboard({
      u1: { name: 'Cesar', answers: { '01': 'B' } },
      u2: { name: 'Anna', answers: { '01': 'B' } },
      u3: { name: 'Berit', answers: { '01': 'B', '02': 'C' } },
    })

    expect(standings.map((s) => s.name)).toEqual(['Berit', 'Anna', 'Cesar'])
    expect(standings.map((s) => s.score)).toEqual([2, 1, 1])
  })

  it('lets equal scores share a place and skips the next', () => {
    const standings = leaderboard({
      u1: { name: 'Anna', answers: { '01': 'B' } },
      u2: { name: 'Berit', answers: { '01': 'B' } },
      u3: { name: 'Cesar', answers: {} },
    })

    expect(standings.map((s) => s.place)).toEqual([1, 1, 3])
  })

  it('is empty when nobody has joined', () => {
    expect(leaderboard({})).toEqual([])
  })
})

describe('reviewRows', () => {
  it('gives one row per question, in the order they were asked', () => {
    const rows = reviewRows({})
    expect(rows).toHaveLength(questions.length)
    expect(rows.map((row) => row.id)).toEqual(questions.map((q) => q.id))
  })

  it('carries the picked letter and its wording on a correct answer', () => {
    const [row] = reviewRows({ '01': 'B' })
    expect(row).toMatchObject({
      id: '01',
      mine: 'B',
      mineLabel: 'Kroatien',
      correct: 'B',
      correctLabel: 'Kroatien',
      ok: true,
    })
  })

  it('keeps both sides on a wrong answer', () => {
    const [row] = reviewRows({ '01': 'A' })
    expect(row).toMatchObject({
      mine: 'A',
      mineLabel: 'Slovenien',
      correct: 'B',
      correctLabel: 'Kroatien',
      ok: false,
    })
  })

  it('reports an unanswered question as nothing picked', () => {
    const [row] = reviewRows({ '02': 'C' })
    expect(row).toMatchObject({ id: '01', mine: null, mineLabel: null, ok: false })
  })

  it('treats a letter outside A–C as nothing picked', () => {
    const [row] = reviewRows({ '01': 'Z' })
    expect(row).toMatchObject({ mine: null, mineLabel: null, ok: false })
  })

  it('leaves the bonus out — it is answered in words, not letters', () => {
    const rows = reviewRows({ bonus: 'Živjeli' })
    expect(rows.some((row) => row.id === 'bonus')).toBe(false)
  })
})
