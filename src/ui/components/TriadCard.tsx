import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { getTypeIdByCategory } from '../../domain/cards/taxonomy'
import type { CardDef } from '../../domain/types'
import { getCardArtCandidates } from './cardArt'
import { getTypeLogoMeta } from './typeLogos'

export type TriadCardContext = 'collection-list' | 'collection-detail' | 'setup' | 'hand-player' | 'hand-cpu'
export type NewBadgeVariant = 'default' | 'reveal' | 'claim'

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

export const TriadCard = memo(function TriadCard({
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
  const hasNewPill = showNew && owned
  const isRevealNew = showNew && owned && newBadgeVariant === 'reveal'
  const artCandidates = useMemo(() => (locked ? [] : getCardArtCandidates(card.name)), [card.name, locked])
  const typeLogoMeta = useMemo(
    () => (locked ? null : getTypeLogoMeta(getTypeIdByCategory(card.categoryId))),
    [card.categoryId, locked],
  )
  const artCandidateIndexRef = useRef(0)
  const [artUnavailable, setArtUnavailable] = useState(false)

  useEffect(() => {
    artCandidateIndexRef.current = 0
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
    hasNewPill ? 'has-new-pill' : '',
    hasNewPill ? `has-new-pill--${newBadgeVariant}` : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const top = locked ? '?' : card.top
  const right = locked ? '?' : card.right
  const bottom = locked ? '?' : card.bottom
  const left = locked ? '?' : card.left
  const artSrc = !locked && !artUnavailable ? (artCandidates[0] ?? null) : null
  const showSigil = locked || artUnavailable

  function handleArtError(event: SyntheticEvent<HTMLImageElement>) {
    const nextCandidateIndex = artCandidateIndexRef.current + 1
    if (nextCandidateIndex >= artCandidates.length) {
      setArtUnavailable(true)
      return
    }

    artCandidateIndexRef.current = nextCandidateIndex
    event.currentTarget.src = artCandidates[nextCandidateIndex]
  }

  const content = (
    <>
      {showNew && owned ? (
        newBadgeVariant === 'claim' ? (
          <span
            className="triad-card__new-pill triad-card__new-pill--claim"
            data-testid="triad-card-claim-new-marker"
            aria-label="New claim card"
          >
            <span className="triad-card__claim-star" aria-hidden="true">
              ★
            </span>
            <span className="triad-card__claim-plus" aria-hidden="true">
              +
            </span>
          </span>
        ) : (
          <span className={`triad-card__new-pill triad-card__new-pill--${newBadgeVariant}`}>NEW</span>
        )
      ) : null}
      {owned && copies > 1 ? <span className="triad-card__copies-pill">x{copies}</span> : null}
      {typeLogoMeta ? (
        <span
          className={`triad-card__type-badge triad-card__type-badge--${typeLogoMeta.id}`}
          aria-label={`Type: ${typeLogoMeta.name}`}
          data-testid="triad-card-type-badge"
        >
          <img
            className="triad-card__type-logo"
            src={typeLogoMeta.imageSrc}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            draggable={false}
            data-testid="triad-card-type-logo"
          />
        </span>
      ) : null}
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
})
