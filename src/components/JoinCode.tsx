import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { JOIN_URL } from '../lib/joinUrl'

/** How long the button keeps announcing an outcome before it goes quiet again. */
const STATUS_WINDOW_MS = 3000

type CopyStatus = 'idle' | 'copied' | 'failed'

export function JoinCode() {
  const [svg, setSvg] = useState('')
  const [status, setStatus] = useState<CopyStatus>('idle')
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    // A 2-module quiet zone and opaque dark-on-paper modules: the code sits over a
    // drifting, scaling photograph, so contrast can never be left to depend on
    // whatever happens to be behind it — the panel in the markup below supplies the
    // paper, this just has to stay legible against it.
    void QRCode.toString(JOIN_URL, {
      type: 'svg',
      margin: 2,
      color: { dark: '#0b0b0b', light: '#ffffff' },
    }).then((markup) => {
      if (!cancelled) setSvg(markup)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (statusTimer.current) clearTimeout(statusTimer.current)
    }
  }, [])

  function announce(next: CopyStatus) {
    setStatus(next)
    if (statusTimer.current) clearTimeout(statusTimer.current)
    statusTimer.current = setTimeout(() => setStatus('idle'), STATUS_WINDOW_MS)
  }

  /**
   * The deprecated path, and the only one left when the modern API is missing:
   * a field off-screen holds the URL long enough to be selected and copied.
   * The URL is no longer printed under the code, so there is nothing on screen
   * to fall back to selecting by hand.
   */
  function copyByExecCommand(): boolean {
    const field = document.createElement('textarea')
    field.value = JOIN_URL
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    field.style.pointerEvents = 'none'
    document.body.appendChild(field)
    field.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      field.remove()
    }
  }

  async function handleCopy() {
    // navigator.clipboard needs a secure context. That is true on the deployed
    // HTTPS site and on localhost, but not on a plain-http LAN address like
    // http://192.168.1.19:5173 — exactly how the presenter tests with a real
    // phone. Never leave the button doing nothing.
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(JOIN_URL)
      announce('copied')
    } catch {
      announce(copyByExecCommand() ? 'copied' : 'failed')
    }
  }

  if (!svg) return null

  return (
    <aside className="join-code">
      <div className="join-code__panel">
        <div className="join-code__svg" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <button type="button" className="join-code__copy" onClick={() => void handleCopy()}>
        {status === 'idle' && 'Kopiera länk'}
        {status === 'copied' && 'Kopierat'}
        {status === 'failed' && 'Kunde inte kopiera'}
      </button>
    </aside>
  )
}
