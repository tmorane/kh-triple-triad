import { useEffect, useMemo, useState } from 'react'
import type { CardDef } from '../../domain/types'
import { getCardArtCandidates } from './cardArt'

export type TriadCardContext = 'collection-list' | 'collection-detail' | 'setup' | 'hand-player' | 'hand-cpu'
export type NewBadgeVariant = 'default' | 'reveal'

export interface TriadCardProps {
  card: CardDef
  context: TriadCardContext
  owned?: boolean
  copies?: number
  selected?: boolean
  showNew?: boolean
  newBadgeVariant?: NewBadgeVariant
  interactive?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  testId?: string
}

function getSigil(name: string): string {
  const initials = name
    .split(' ')
    .map((chunk) => chunk.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')

  return initials.toUpperCase()
}

function normalizeRarity(rarity: CardDef['rarity']): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1)
}

export function TriadCard({
  card,
  context,
  owned = true,
  copies = 0,
  selected = false,
  showNew = false,
  newBadgeVariant = 'default',
  interactive = false,
  disabled = false,
  onClick,
  className,
  testId,
}: TriadCardProps) {
  const locked = !owned
  const label = locked ? `Locked card ${card.id.toUpperCase()}` : card.name
  const isMatchHandContext = context === 'hand-player' || context === 'hand-cpu'
  const isRevealNew = showNew && owned && newBadgeVariant === 'reveal'
  const artCandidates = useMemo(() => (locked ? [] : getCardArtCandidates(card.name)), [card.name, locked])
  const [artCandidateIndex, setArtCandidateIndex] = useState(0)
  const [artUnavailable, setArtUnavailable] = useState(false)

  useEffect(() => {
    setArtCandidateIndex(0)
    setArtUnavailable(false)
  }, [card.name, locked])

  const classes = [
    'triad-card',
    `triad-card--${context}`,
    `triad-card--${card.rarity}`,
    locked ? 'is-locked' : '',
    selected ? 'is-selected' : '',
    interactive ? 'is-interactive' : '',
    isRevealNew ? 'is-reveal-new' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const top = locked ? '?' : card.top
  const right = locked ? '?' : card.right
  const bottom = locked ? '?' : card.bottom
  const left = locked ? '?' : card.left
  const artSrc = !locked && !artUnavailable ? (artCandidates[artCandidateIndex] ?? null) : null
  // Hide letter sigils for owned cards now that artwork is expected; keep fallback only for locked cards.
  const showSigil = locked

  function handleArtError() {
    if (artCandidateIndex >= artCandidates.length - 1) {
      setArtUnavailable(true)
      return
    }

    setArtCandidateIndex((index) => index + 1)
  }

  const content = (
    <>
      {showNew && owned ? <span className={`triad-card__new-pill triad-card__new-pill--${newBadgeVariant}`}>NEW</span> : null}
      {owned && copies > 1 ? <span className="triad-card__copies-pill">x{copies}</span> : null}
      <div className="triad-card__frame">
        <div className="triad-card__face">
          <span className="triad-card__stat triad-card__stat--top">{top}</span>
          <span className="triad-card__stat triad-card__stat--right">{right}</span>
          <span className="triad-card__stat triad-card__stat--bottom">{bottom}</span>
          <span className="triad-card__stat triad-card__stat--left">{left}</span>

          <div className="triad-card__art" aria-hidden="true">
            {artSrc ? (
              <img
                key={artSrc}
                className="triad-card__art-image"
                src={artSrc}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={handleArtError}
              />
            ) : null}
            {showSigil ? <span className="triad-card__sigil">{locked ? '?' : getSigil(card.name)}</span> : null}
          </div>

          {!isMatchHandContext && (
            <div className="triad-card__footer">
              <span className="triad-card__name">{locked ? 'Locked Card' : card.name}</span>
              <span className="triad-card__meta">
                <span className="triad-card__id">{locked ? '????' : card.id.toUpperCase()}</span>
                <span className="triad-card__rarity">{locked ? 'Unknown' : normalizeRarity(card.rarity)}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (interactive) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={selected}
        data-testid={testId}
      >
        {content}
      </button>
    )
  }

  return (
    <article className={classes} aria-label={label} data-testid={testId}>
      {content}
    </article>
  )
}
