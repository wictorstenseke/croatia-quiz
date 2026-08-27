import { useCallback, useEffect, useState } from 'react'

/** Safari still ships the prefixed Fullscreen API, so both spellings are needed. */
interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>
}

function currentElement(): Element | null {
  const doc = document as FullscreenDocument
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

/**
 * Fullscreen on "F", the shortcut every video player and presentation tool
 * already uses. Escape leaves it, handled by the browser.
 */
export function useFullscreen(): { isFullscreen: boolean; toggle: () => void } {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(currentElement()))

  const toggle = useCallback(() => {
    const doc = document as FullscreenDocument
    const root = document.documentElement as FullscreenElement
    const request = root.requestFullscreen ?? root.webkitRequestFullscreen
    const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen
    // A rejection just means the browser declined; there is nothing to recover.
    if (currentElement()) void exit?.call(doc).catch(() => {})
    else void request?.call(root).catch(() => {})
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(currentElement()))
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'f' && event.key !== 'F') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      event.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  return { isFullscreen, toggle }
}
