// Writes the host key to control/secret.
//
// The door this script used to walk through is shut: the deployed rules say
// `allow create: if false` for that document, so running this against them can
// only fail with permission-denied. It is now one step inside the manual
// rotation procedure — open the rule, delete the old document, run this, close
// the rule again — written down under "Värdnyckeln" in README.md. Read that
// first; running the script on its own does nothing but print an error.
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
