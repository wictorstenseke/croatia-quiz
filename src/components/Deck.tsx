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

/** What the last reset had to say, pinned to the slide it said it on. */
interface ResetIssue {
  text: string
  /** Filled in on the first render that shows it — after the reset's own jump. */
  index: number | null
}

/**
 * The frame every slide lives in: edge navigation, progress rail and the
 * position counter. The slides animate their own contents.
 */
export function Deck({ nav, children, isHost = false, onClearRound, hostNotice }: DeckProps) {
  const progress = nav.index / (nav.total - 1)
  const { isFullscreen, toggle } = useFullscreen()
  const [armedIndex, setArmedIndex] = useState<number | null>(null)
  const [resetIssue, setResetIssue] = useState<ResetIssue | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Moving to another slide always cancels a pending confirm: the confirm is
  // tied to the slide it was armed on, and comparing during render means no
  // frame can ever commit with it still armed somewhere else. (React's
  // "adjusting state when a prop changes" pattern — an effect would paint the
  // armed state on the new slide first, and this is guarding a delete.)
  if (armedIndex !== null && armedIndex !== nav.index) setArmedIndex(null)
  const confirming = armedIndex === nav.index

  // The reset moves the deck to the cover itself, so its report has to outlive
  // that jump — and only that one. It is pinned to the slide it first appears
  // on, not the slide the click came from (the jump has already left that one),
  // so the presenter's next deliberate move is what clears it.
  if (resetIssue !== null) {
    if (resetIssue.index === null) setResetIssue({ text: resetIssue.text, index: nav.index })
    else if (resetIssue.index !== nav.index) setResetIssue(null)
  }

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

  // What keeps the footer up on the cover, where it is otherwise hidden. The
  // armed confirm has to count: arming clears the issue that prompted it, and
  // without this the footer would go hidden in that same render and take the
  // half-pressed button out from under the presenter's cursor.
  const showsAlert = Boolean(hostNotice) || resetIssue !== null || confirming

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
                  setResetIssue(
                    failed > 0
                      ? { text: `${failed} spelare kunde inte rensas`, index: null }
                      : null,
                  )
                })
                .catch(() => {
                  setResetIssue({ text: 'Nollställningen gick inte igenom', index: null })
                })
            }}
            onBlur={disarmConfirm}
          >
            {confirming ? 'Säker? Alla svar försvinner' : (resetIssue?.text ?? 'Nollställ omgången')}
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
