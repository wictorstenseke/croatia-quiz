import { questions } from '../data/quiz'

export type Phase = 'lobby' | 'question' | 'leaderboard'

export interface LiveSession {
  phase: Phase
  questionId: string | null
  revealed: boolean
}

/** The bonus is just another question id, in the data and in the rules alike. */
export const BONUS_QUESTION_ID = 'bonus'

export const IDLE_SESSION: LiveSession = {
  phase: 'lobby',
  questionId: null,
  revealed: false,
}

/**
 * The deck is cover, fifteen questions, the bonus, then the facit. Turn a
 * slide index into what the audience should be looking at.
 */
export function slideToSession(index: number, revealed: boolean): LiveSession {
  if (index <= 0) return { ...IDLE_SESSION }
  if (index <= questions.length) {
    return { phase: 'question', questionId: questions[index - 1].id, revealed }
  }
  if (index === questions.length + 1) {
    return { phase: 'question', questionId: BONUS_QUESTION_ID, revealed }
  }
  return { phase: 'leaderboard', questionId: null, revealed: true }
}
