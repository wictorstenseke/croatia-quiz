import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  FieldPath,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const HOST_KEY = 'test-key-not-the-real-one-0123456789'
let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'croatia-quiz-rules',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'control/secret'), { key: HOST_KEY })
  })
})

/** Move the session without going through the rules. */
async function setLive(phase: string, questionId: string | null, revealed: boolean) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'session/live'), { phase, questionId, revealed })
  })
}

async function claimHost(uid = 'host') {
  const db = testEnv.authenticatedContext(uid).firestore()
  await assertSucceeds(setDoc(doc(db, 'control/host'), { uid, key: HOST_KEY }))
  return db
}

/** A player who has joined but not answered anything. */
async function joinAs(uid: string, name = 'Anna') {
  const db = testEnv.authenticatedContext(uid).firestore()
  await assertSucceeds(
    setDoc(doc(db, `players/${uid}`), { name, answers: {}, joinedAt: serverTimestamp() }),
  )
  return db
}

describe('the host seat', () => {
  it('cannot be claimed with the wrong key', async () => {
    const db = testEnv.authenticatedContext('impostor').firestore()
    await assertFails(setDoc(doc(db, 'control/host'), { uid: 'impostor', key: 'wrong' }))
  })

  it('cannot be claimed for somebody else', async () => {
    const db = testEnv.authenticatedContext('impostor').firestore()
    await assertFails(setDoc(doc(db, 'control/host'), { uid: 'host', key: HOST_KEY }))
  })

  it('can be claimed with the right key, and then drives the session', async () => {
    const db = await claimHost()
    await assertSucceeds(
      setDoc(doc(db, 'session/live'), { phase: 'question', questionId: '01', revealed: false }),
    )
  })

  it('can be reclaimed from another device with the key', async () => {
    await claimHost('host')
    const second = testEnv.authenticatedContext('host-laptop').firestore()
    await assertSucceeds(
      setDoc(doc(second, 'control/host'), { uid: 'host-laptop', key: HOST_KEY }),
    )
  })

  it('refuses a key shorter than 32 characters, even if it matches the secret', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'control/secret'), { key: 'short-key' })
    })
    const db = testEnv.authenticatedContext('host').firestore()
    await assertFails(setDoc(doc(db, 'control/host'), { uid: 'host', key: 'short-key' }))
  })

  it('does not let a client read the host record', async () => {
    await claimHost()
    const db = testEnv.authenticatedContext('nosy').firestore()
    await assertFails(getDoc(doc(db, 'control/host')))
  })

  it('cannot be deleted, so the seat cannot be stolen by resetting it', async () => {
    await claimHost()
    const db = testEnv.authenticatedContext('nosy').firestore()
    await assertFails(deleteDoc(doc(db, 'control/host')))
  })
})

describe('the bootstrap door', () => {
  it('is shut even when the secret is missing', async () => {
    await testEnv.clearFirestore()
    const db = testEnv.authenticatedContext('anyone').firestore()
    await assertFails(setDoc(doc(db, 'control/secret'), { key: 'x'.repeat(32) }))
  })

  it('is shut for an unauthenticated client too', async () => {
    await testEnv.clearFirestore()
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, 'control/secret'), { key: 'x'.repeat(32) }))
  })
})

describe('the session', () => {
  it('is readable by anyone', async () => {
    await setLive('question', '01', false)
    const db = testEnv.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, 'session/live')))
  })

  it('cannot be moved by a player', async () => {
    await claimHost()
    const db = testEnv.authenticatedContext('player').firestore()
    await assertFails(
      setDoc(doc(db, 'session/live'), { phase: 'question', questionId: '15', revealed: true }),
    )
  })

  it('refuses a host write with an extra field', async () => {
    const db = await claimHost()
    await assertFails(
      setDoc(doc(db, 'session/live'), {
        phase: 'question',
        questionId: '01',
        revealed: false,
        extra: true,
      }),
    )
  })

  it('cannot be deleted by the host', async () => {
    const db = await claimHost()
    await setLive('question', '01', false)
    await assertFails(deleteDoc(doc(db, 'session/live')))
  })

  it('accepts the exact production shape from the host', async () => {
    const db = await claimHost()
    await assertSucceeds(
      setDoc(doc(db, 'session/live'), {
        phase: 'question',
        questionId: '01',
        revealed: false,
        updatedAt: serverTimestamp(),
      }),
    )
  })
})

describe('joining', () => {
  it('works in any phase', async () => {
    await setLive('question', '07', false)
    await joinAs('p1')
  })

  it('rejects a player who arrives with answers already filled in', async () => {
    const db = testEnv.authenticatedContext('p1').firestore()
    await assertFails(
      setDoc(doc(db, 'players/p1'), {
        name: 'Fuskaren',
        answers: { '01': 'B' },
        joinedAt: serverTimestamp(),
      }),
    )
  })

  it('rejects an empty name', async () => {
    const db = testEnv.authenticatedContext('p1').firestore()
    await assertFails(
      setDoc(doc(db, 'players/p1'), { name: '', answers: {}, joinedAt: serverTimestamp() }),
    )
  })

  it('rejects writing into somebody else’s record', async () => {
    await joinAs('p1')
    const other = testEnv.authenticatedContext('p2').firestore()
    await assertFails(updateDoc(doc(other, 'players/p1'), { name: 'Kapad' }))
  })

  it('rejects a name longer than 40 characters', async () => {
    const db = testEnv.authenticatedContext('p1').firestore()
    await assertFails(
      setDoc(doc(db, 'players/p1'), {
        name: 'x'.repeat(41),
        answers: {},
        joinedAt: serverTimestamp(),
      }),
    )
  })

  it('rejects joinedAt forged as a client timestamp instead of serverTimestamp()', async () => {
    const db = testEnv.authenticatedContext('p1').firestore()
    await assertFails(
      setDoc(doc(db, 'players/p1'), { name: 'Anna', answers: {}, joinedAt: new Date() }),
    )
  })

  it('rejects an extra field on create', async () => {
    const db = testEnv.authenticatedContext('p1').firestore()
    await assertFails(
      setDoc(doc(db, 'players/p1'), {
        name: 'Anna',
        answers: {},
        joinedAt: serverTimestamp(),
        score: 9999,
      }),
    )
  })

  it('cannot be done by an unauthenticated client', async () => {
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(doc(db, 'players/p1'), { name: 'Anna', answers: {}, joinedAt: serverTimestamp() }),
    )
  })
})

describe('answering', () => {
  it('accepts the open question and lets it be changed', async () => {
    const db = await joinAs('p1')
    await setLive('question', '01', false)

    await assertSucceeds(updateDoc(doc(db, 'players/p1'), new FieldPath('answers', '01'), 'A'))
    await assertSucceeds(updateDoc(doc(db, 'players/p1'), new FieldPath('answers', '01'), 'C'))
  })

  it('refuses once the answer is revealed', async () => {
    const db = await joinAs('p1')
    await setLive('question', '01', false)
    await assertSucceeds(updateDoc(doc(db, 'players/p1'), new FieldPath('answers', '01'), 'A'))

    await setLive('question', '01', true)
    await assertFails(updateDoc(doc(db, 'players/p1'), new FieldPath('answers', '01'), 'B'))
  })

  it('refuses a question that has already passed', async () => {
    const db = await joinAs('p1')
    await setLive('question', '01', false)
    await assertSucceeds(updateDoc(doc(db, 'players/p1'), new FieldPath('answers', '01'), 'A'))

    await setLive('question', '02', false)
    await assertFails(updateDoc(doc(db, 'players/p1'), new FieldPath('answers', '01'), 'B'))
  })

  it('refuses a question that is not open yet', async () => {
    const db = await joinAs('p1')
    await setLive('question', '01', false)
    await assertFails(updateDoc(doc(db, 'players/p1'), new FieldPath('answers', '02'), 'A'))
  })

  it('refuses outside the question phase', async () => {
    const db = await joinAs('p1')
    await setLive('lobby', null, false)
    await assertFails(updateDoc(doc(db, 'players/p1'), new FieldPath('answers', '01'), 'A'))
  })

  it('accepts the bonus as an ordinary answer', async () => {
    const db = await joinAs('p1')
    await setLive('question', 'bonus', false)
    await assertSucceeds(
      updateDoc(doc(db, 'players/p1'), new FieldPath('answers', 'bonus'), 'Zivjeli'),
    )
  })

  it('refuses an answer longer than 60 characters', async () => {
    const db = await joinAs('p1')
    await setLive('question', '01', false)
    await assertFails(
      updateDoc(doc(db, 'players/p1'), new FieldPath('answers', '01'), 'x'.repeat(61)),
    )
  })
})

describe('the name', () => {
  it('can be changed on its own at any time', async () => {
    const db = await joinAs('p1')
    await setLive('leaderboard', null, true)
    await assertSucceeds(updateDoc(doc(db, 'players/p1'), { name: 'Berit' }))
  })

  it('cannot ride along with an answer', async () => {
    const db = await joinAs('p1')
    await setLive('question', '01', false)
    await assertFails(
      updateDoc(doc(db, 'players/p1'), { name: 'Berit', answers: { '01': 'A' } }),
    )
  })

  it('rejects a rename longer than 40 characters', async () => {
    const db = await joinAs('p1')
    await setLive('leaderboard', null, true)
    await assertFails(updateDoc(doc(db, 'players/p1'), { name: 'x'.repeat(41) }))
  })
})

describe('other updates', () => {
  it('rejects an extra top-level field, such as a forged score', async () => {
    const db = await joinAs('p1')
    await setLive('leaderboard', null, true)
    await assertFails(updateDoc(doc(db, 'players/p1'), { score: 9999 }))
  })
})

describe('removing a player', () => {
  it('cannot be done by another player', async () => {
    await joinAs('p1')
    const other = testEnv.authenticatedContext('p2').firestore()
    await assertFails(deleteDoc(doc(other, 'players/p1')))
  })

  it('can be done by the host', async () => {
    await joinAs('p1')
    const db = await claimHost()
    await assertSucceeds(deleteDoc(doc(db, 'players/p1')))
  })
})

describe('the secret', () => {
  it('cannot be read by a client', async () => {
    const db = testEnv.authenticatedContext('anyone').firestore()
    await assertFails(getDoc(doc(db, 'control/secret')))
  })

  it('cannot be overwritten once it exists', async () => {
    const db = testEnv.authenticatedContext('anyone').firestore()
    await assertFails(setDoc(doc(db, 'control/secret'), { key: 'mine now' }))
  })
})
