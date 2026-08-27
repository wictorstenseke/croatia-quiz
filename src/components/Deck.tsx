import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { SlideNav } from '../hooks/useSlideNav'
import { useFullscreen } from '../hooks/useFullscreen'

interface DeckProps {
  nav: SlideNav
  children: ReactNode
  isHost?: boolean
  /** Resolves with the number of players that failed to clear (0 = clean). */
  onClearRound?: () => Promise<number>
  /** Swedish line shown when the deck is no longer driving the room. */
  hostNotice?: string | null
}

/** How long an armed confirm stays armed before it quietly disarms itself. */
const CONFIRM_WINDOW_MS = 5000

/**
 * The frame every slide lives in: edge navigation, progress rail and the
 * position counter. The slides animate their own contents.
 */
export function Deck({ nav, children, isHost = false, onClearRound, hostNotice }: DeckProps) {
  const progress = nav.index / (nav.total - 1)
  const { isFullscreen, toggle } = useFullscreen()
  const [armedIndex, setArmedIndex] = useState<number | null>(null)
  const [resetIssue, setResetIssue] = useState<string | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Moving to another slide always cancels a pending confirm: the confirm is
  // tied to the slide it was armed on, and comparing during render means no
  // frame can ever commit with it still armed somewhere else. (React's
  // "adjusting state when a prop changes" pattern — an effect would paint the
  // armed state on the new slide first, and this is guarding a delete.)
  if (armedIndex !== null && armedIndex !== nav.index) setArmedIndex(null)
  const confirming = armedIndex === nav.index

  // Safari never focuses a <button> on a mouse click, so onBlur alone cannot be
  // trusted to disarm the confirm. A bounded timer is the real safety net; blur
  // stays wired up too, since it is harmless wherever it does fire. A timer
  // outliving its arming is harmless as well — arming clears the previous one,
  // so a late fire can only null out something already null.
  function disarmConfirm() {
    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current)
      confirmTimer.current = null
    }
    setArmedIndex(null)
  }

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [])

  // The reset now moves the deck to the cover itself, so the outcome has to
  // outlive that move; it is cleared when the next reset is armed instead.
  const showsAlert = Boolean(hostNotice) || resetIssue !== null

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

      <footer className="deck__footer" data-alert={showsAlert}>
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
            data-reset-issue={resetIssue !== null}
            onClick={() => {
              if (!confirming) {
                setResetIssue(null)
                setArmedIndex(nav.index)
                if (confirmTimer.current) clearTimeout(confirmTimer.current)
                confirmTimer.current = setTimeout(disarmConfirm, CONFIRM_WINDOW_MS)
                return
              }
              disarmConfirm()
              void onClearRound()
                .then((failed) => {
                  setResetIssue(failed > 0 ? `${failed} spelare kunde inte rensas` : null)
                })
                .catch(() => {
                  setResetIssue('Nollställningen gick inte igenom')
                })
            }}
            onBlur={disarmConfirm}
          >
            {confirming ? 'Säker? Alla svar försvinner' : (resetIssue ?? 'Nollställ omgången')}
          </button>
        )}
        {hostNotice && (
          <span className="micro deck__host-notice" role="status">
            {hostNotice}
          </span>
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
