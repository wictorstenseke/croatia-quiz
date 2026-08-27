import { describe, expect, it } from 'vitest'
import { questions } from '../data/quiz'
import { bonusPoints, leaderboard, levenshtein, normalise, scoreFor } from './scoring'

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
