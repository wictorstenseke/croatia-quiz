import { useState, type FormEvent } from 'react'

interface JoinScreenProps {
  onJoin: (name: string) => void
  /** Set when a previous join attempt failed, e.g. two joins racing. */
  error?: string | null
  /** Offered next to the error when trying again is the whole remedy. */
  onRetry?: (() => void) | null
}

export function JoinScreen({ onJoin, error, onRetry }: JoinScreenProps) {
  const [name, setName] = useState('')
  const trimmed = name.trim()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (trimmed) onJoin(trimmed)
  }

  return (
    <section className="audience audience--join">
      <p className="micro">Dubrovnik · 15 frågor</p>
      <h1 className="audience__title">Vad heter du?</h1>
      <p className="audience__lede">
        Namnet syns på topplistan när alla frågor är genomgångna.
      </p>

      <form className="audience__form" onSubmit={onSubmit}>
        <input
          className="audience__input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ditt namn"
          maxLength={40}
          autoComplete="name"
          autoFocus
        />
        <button type="submit" className="btn" disabled={!trimmed}>
          Häng på
        </button>
      </form>

      {error && (
        <p className="micro audience__error" role="status">
          {error}
          {onRetry && (
            <button type="button" className="micro audience__retry" onClick={onRetry}>
              Försök igen
            </button>
          )}
        </p>
      )}
    </section>
  )
}
