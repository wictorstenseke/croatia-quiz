import { useState, type ReactNode } from 'react'
import type { SlideNav } from '../hooks/useSlideNav'
import { useFullscreen } from '../hooks/useFullscreen'

interface DeckProps {
  nav: SlideNav
  children: ReactNode
  isHost?: boolean
  onClearRound?: () => void
}

/**
 * The frame every slide lives in: edge navigation, progress rail and the
 * position counter. The slides animate their own contents.
 */
export function Deck({ nav, children, isHost = false, onClearRound }: DeckProps) {
  const progress = nav.index / (nav.total - 1)
  const { isFullscreen, toggle } = useFullscreen()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="deck" data-direction={nav.direction} data-cover={nav.index === 0}>
      <div className="deck__rail" aria-hidden="true">
        <span className="deck__rail-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <main className="deck__stage">{children}</main>

      <button
        type="button"
        className="edge edge--prev"
        onClick={nav.prev}
        disabled={nav.index === 0}
        aria-label="Föregående sida"
      >
        <Chevron dir="left" />
      </button>

      <button
        type="button"
        className="edge edge--next"
        onClick={nav.next}
        disabled={nav.index === nav.total - 1}
        aria-label="Nästa sida"
      >
        <Chevron dir="right" />
      </button>

      <footer className="deck__footer">
        <span className="micro">
          {String(nav.index).padStart(2, '0')} / {String(nav.total - 1).padStart(2, '0')}
        </span>
        <button type="button" className="micro deck__fullscreen" onClick={toggle}>
          <kbd>F</kbd> {isFullscreen ? 'Lämna fullskärm' : 'Fullskärm'}
        </button>
        {isHost && onClearRound && (
          <button
            type="button"
            className="micro deck__reset"
            data-confirming={confirming}
            onClick={() => {
              if (!confirming) {
                setConfirming(true)
                return
              }
              setConfirming(false)
              onClearRound()
            }}
            onBlur={() => setConfirming(false)}
          >
            {confirming ? 'Säker? Alla svar försvinner' : 'Nollställ omgången'}
          </button>
        )}
      </footer>
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  const d = dir === 'left' ? 'M15 4 L7 12 L15 20' : 'M9 4 L17 12 L9 20'
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
    </svg>
  )
}
