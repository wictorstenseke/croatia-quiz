import { useEffect, useState } from 'react'
import App from './App'
import { Audience } from './audience/Audience'
import { startConnectionWatchdog } from './lib/connection'

const AUDIENCE_HASH = '#/spela'

function isAudienceRoute(): boolean {
  return window.location.hash.startsWith(AUDIENCE_HASH)
}

export function Root() {
  const [audience, setAudience] = useState(isAudienceRoute)

  useEffect(() => {
    const onHashChange = () => setAudience(isAudienceRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // One watchdog for the whole app, deck and phone alike — a projector on
  // venue wifi loses its connection the same way a phone does.
  useEffect(() => startConnectionWatchdog(), [])

  return audience ? <Audience /> : <App />
}
