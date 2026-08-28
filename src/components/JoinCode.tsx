import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** The audience address is fixed, so the code can be generated from the page itself. */
function joinUrl(): string {
  return `${window.location.origin}${window.location.pathname}#/spela`
}

export function JoinCode() {
  const [svg, setSvg] = useState('')
  const url = joinUrl()

  useEffect(() => {
    let cancelled = false
    // A 2-module quiet zone and opaque dark-on-paper modules: the code sits over a
    // drifting, scaling photograph, so contrast can never be left to depend on
    // whatever happens to be behind it — the panel in the markup below supplies the
    // paper, this just has to stay legible against it.
    void QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      color: { dark: '#0b0b0b', light: '#ffffff' },
    }).then((markup) => {
      if (!cancelled) setSvg(markup)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  if (!svg) return null

  return (
    <aside className="join-code">
      <div className="join-code__panel">
        <div className="join-code__svg" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <p className="micro micro--light">Skanna för att vara med</p>
    </aside>
  )
}
