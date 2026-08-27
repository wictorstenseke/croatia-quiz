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
    void QRCode.toString(url, {
      type: 'svg',
      margin: 0,
      color: { dark: '#ffffff', light: '#00000000' },
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
      <div className="join-code__svg" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="micro micro--light">Skanna för att vara med</p>
    </aside>
  )
}
