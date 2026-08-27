import { useCallback, useEffect, useState } from 'react'

/**
 * Slide addressing. The deck is a flat list of indices; the hash is the
 * human-readable form of the same position, so any slide is linkable.
 */
export interface SlideNav {
  index: number
  total: number
  go: (index: number) => void
  next: () => void
  prev: () => void
  /** Direction of the last move, for the slide transition. */
  direction: 1 | -1
}

interface Position {
  index: number
  direction: 1 | -1
}

function hashToIndex(hash: string, total: number): number {
  const clean = hash.replace(/^#\/?/, '')
  if (clean === 'facit') return total - 1
  if (clean === 'bonus') return total - 2
  const match = /^q\/(\d+)$/.exec(clean)
  if (match) {
    const n = Number(match[1])
    if (n >= 1 && n <= total - 3) return n
  }
  return 0
}

function indexToHash(index: number, total: number): string {
  if (index === 0) return '#/start'
  if (index === total - 1) return '#/facit'
  if (index === total - 2) return '#/bonus'
  return `#/q/${index}`
}

export function useSlideNav(total: number): SlideNav {
  const [position, setPosition] = useState<Position>(() => ({
    index: hashToIndex(window.location.hash, total),
    direction: 1,
  }))

  const move = useCallback(
    (resolve: (current: number) => number) =>
      setPosition((current) => {
        const target = Math.max(0, Math.min(total - 1, resolve(current.index)))
        if (target === current.index) return current
        return { index: target, direction: target > current.index ? 1 : -1 }
      }),
    [total],
  )

  const go = useCallback((target: number) => move(() => target), [move])
  const next = useCallback(() => move((current) => current + 1), [move])
  const prev = useCallback(() => move((current) => current - 1), [move])

  // The hash mirrors the position, so a reload or a shared link lands right.
  useEffect(() => {
    const hash = indexToHash(position.index, total)
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash)
  }, [position.index, total])

  useEffect(() => {
    const onHashChange = () => go(hashToIndex(window.location.hash, total))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [go, total])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [next, prev])

  return { index: position.index, total, go, next, prev, direction: position.direction }
}
