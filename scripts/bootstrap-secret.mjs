// Writes the host key exactly once. The rule that allows this only fires while
// the document is missing, so running it a second time is refused by design.
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { initializeApp } from 'firebase/app'
import { doc, getFirestore, setDoc } from 'firebase/firestore'

const config = JSON.parse(readFileSync('src/lib/firebase-config.json', 'utf8'))
const key = randomBytes(16).toString('hex')

const db = getFirestore(initializeApp(config))
await setDoc(doc(db, 'control/secret'), { key })

console.log('Host key — save it, it cannot be read back:')
console.log(key)
process.exit(0)
