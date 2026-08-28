import { describe, expect, it } from 'vitest'
import { BONUS_QUESTION_ID, slideToSession } from './session'

describe('slideToSession', () => {
  it('maps the cover to the lobby', () => {
    expect(slideToSession(0, false)).toEqual({
      phase: 'lobby',
      questionId: null,
      revealed: false,
    })
  })

  it('maps the first and last question to their ids', () => {
    expect(slideToSession(1, false)).toEqual({
      phase: 'question',
      questionId: '01',
      revealed: false,
    })
    expect(slideToSession(15, false)).toEqual({
      phase: 'question',
      questionId: '15',
      revealed: false,
    })
  })

  it('carries the revealed flag through', () => {
    expect(slideToSession(7, true).revealed).toBe(true)
  })

  it('maps the bonus slide to its own id', () => {
    expect(slideToSession(16, false)).toEqual({
      phase: 'question',
      questionId: BONUS_QUESTION_ID,
      revealed: false,
    })
  })

  it('maps the facit slide to the leaderboard, always revealed', () => {
    expect(slideToSession(17, false)).toEqual({
      phase: 'leaderboard',
      questionId: null,
      revealed: true,
    })
  })

  it('returns a fresh object each time, so callers cannot corrupt the default', () => {
    const first = slideToSession(0, false)
    first.revealed = true
    expect(slideToSession(0, false).revealed).toBe(false)
  })

  it('forces revealed false in the lobby, whatever it is given', () => {
    expect(slideToSession(0, true).revealed).toBe(false)
  })
})
