import { useEffect, useState } from 'react'
import App from './App'
import { Audience } from './audience/Audience'

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

  return audience ? <Audience /> : <App />
}
