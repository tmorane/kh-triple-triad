import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, SyntheticEvent } from 'react'
import { formatCardPokedexNumber } from '../../domain/cards/pokedex'
import type { CardDef } from '../../domain/types'
import { getCardArtCandidates } from './cardArt'
import { getElementLogoMeta } from './elementLogos'

export type TriadCardContext = 'collection-list' | 'collection-detail' | 'setup' | 'hand-player' | 'hand-cpu'
export type NewBadgeVariant = 'default' | 'reveal' | 'claim'
export type TriadCardDisplayMode = 'default' | 'fragment-silhouette'
type TriadCardStatTrend = 'buff' | 'debuff' | 'neutral'

interface TriadCardStatOverrides {
  top: number
  right: number
  bottom: number
  left: number
}

interface TriadCardStatTrends {
  top: TriadCardStatTrend
  right: TriadCardStatTrend
  bottom: TriadCardStatTrend
  left: TriadCardStatTrend
}

export interface TriadCardProps {
  card: CardDef
  context: TriadCardContext
  owned?: boolean
  copies?: number
  shiny?: boolean
  selected?: boolean
  showNew?: boolean
  newBadgeVariant?: NewBadgeVariant
  interactive?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  testId?: string
  deferArtLoading?: boolean
  statOverrides?: TriadCardStatOverrides
  statTrends?: TriadCardStatTrends
  displayMode?: TriadCardDisplayMode
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

function getLongestNameSegmentLength(name: string): number {
  return name
    .split(/[\s-]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((maxLength, segment) => Math.max(maxLength, segment.length), 0)
}

export const TriadCard = memo(function TriadCard({
  card,
  context,
  owned = true,
  copies = 0,
  shiny = false,
  selected = false,
  showNew = false,
  newBadgeVariant = 'default',
  interactive = false,
  disabled = false,
  onClick,
  className,
  testId,
  deferArtLoading = false,
  statOverrides,
  statTrends,
  displayMode = 'default',
}: TriadCardProps) {
  const isFragmentSilhouette = displayMode === 'fragment-silhouette'
  const locked = !owned
  const hideArtForLock = locked && !isFragmentSilhouette
  const hasShiny = shiny && owned
  const label = locked ? `Locked card ${formatCardPokedexNumber(card)}` : card.name
  const isMatchHandContext = context === 'hand-player' || context === 'hand-cpu'
  const hasNewPill = showNew && owned
  const isRevealNew = showNew && owned && newBadgeVariant === 'reveal'
  const artCandidates = useMemo(
    () => (hideArtForLock ? [] : getCardArtCandidates(card.name, { shiny: hasShiny })),
    [card.name, hasShiny, hideArtForLock],
  )
  const interactiveCardRef = useRef<HTMLButtonElement | null>(null)
  const artCandidateIndexRef = useRef(0)
  const [isArtVisible, setIsArtVisible] = useState(() => {
    if (hideArtForLock || !deferArtLoading) {
      return true
    }
    return typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined'
  })
  const [artUnavailable, setArtUnavailable] = useState(false)

  useEffect(() => {
    artCandidateIndexRef.current = 0
    setArtUnavailable(false)
  }, [card.name, hideArtForLock])

  useEffect(() => {
    if (isArtVisible || hideArtForLock || !deferArtLoading) {
      return
    }
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      return
    }
    const node = interactiveCardRef.current
    if (!node) {
      return
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsArtVisible(true)
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin: '320px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [deferArtLoading, hideArtForLock, isArtVisible])

  const classes = [
    'triad-card',
    `triad-card--${context}`,
    `triad-card--${card.rarity}`,
    locked ? '' : `triad-card--element-${card.elementId}`,
    hasShiny ? 'is-shiny' : '',
    locked ? 'is-locked' : '',
    selected ? 'is-selected' : '',
    interactive ? 'is-interactive' : '',
    isFragmentSilhouette ? 'is-fragment-silhouette' : '',
    isRevealNew ? 'is-reveal-new' : '',
    hasNewPill ? 'has-new-pill' : '',
    hasNewPill ? `has-new-pill--${newBadgeVariant}` : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const top = locked ? '?' : (statOverrides?.top ?? card.top)
  const right = locked ? '?' : (statOverrides?.right ?? card.right)
  const bottom = locked ? '?' : (statOverrides?.bottom ?? card.bottom)
  const left = locked ? '?' : (statOverrides?.left ?? card.left)
  const topTrend = locked ? 'neutral' : (statTrends?.top ?? 'neutral')
  const rightTrend = locked ? 'neutral' : (statTrends?.right ?? 'neutral')
  const bottomTrend = locked ? 'neutral' : (statTrends?.bottom ?? 'neutral')
  const leftTrend = locked ? 'neutral' : (statTrends?.left ?? 'neutral')
  const artSrc = !hideArtForLock && isArtVisible && !artUnavailable ? (artCandidates[0] ?? null) : null
  const showSigil = hideArtForLock || artUnavailable || !isArtVisible
  const useCompactName = context === 'setup' && !locked && getLongestNameSegmentLength(card.name) >= 9
  const nameClassName = useCompactName ? 'triad-card__name triad-card__name--compact' : 'triad-card__name'
  const elementLogo = locked ? null : getElementLogoMeta(card.elementId)
  const shouldTrackShinyPointer = hasShiny && context === 'collection-detail'
  const shinyPointerStyle = shouldTrackShinyPointer
    ? ({ '--shiny-pointer-x': '50%', '--shiny-pointer-y': '50%' } as CSSProperties)
    : undefined

  function updateShinyPointerPosition(target: HTMLElement, clientX: number, clientY: number) {
    const rect = target.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    target.style.setProperty('--shiny-pointer-x', `${x.toFixed(2)}%`)
    target.style.setProperty('--shiny-pointer-y', `${y.toFixed(2)}%`)
  }

  function handleShinyPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!shouldTrackShinyPointer || event.pointerType === 'touch') {
      return
    }
    updateShinyPointerPosition(event.currentTarget, event.clientX, event.clientY)
  }

  function handleShinyPointerLeave(event: ReactPointerEvent<HTMLElement>) {
    if (!shouldTrackShinyPointer) {
      return
    }
    event.currentTarget.style.setProperty('--shiny-pointer-x', '50%')
    event.currentTarget.style.setProperty('--shiny-pointer-y', '50%')
  }

  function handleArtError(event: SyntheticEvent<HTMLImageElement>) {
    const nextCandidateIndex = artCandidateIndexRef.current + 1
    if (nextCandidateIndex >= artCandidates.length) {
      setArtUnavailable(true)
      return
    }

    artCandidateIndexRef.current = nextCandidateIndex
    event.currentTarget.src = artCandidates[nextCandidateIndex]
  }

  const content = isFragmentSilhouette ? (
    <div className="triad-card__fragment-silhouette" aria-hidden="true">
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
  ) : (
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
      {elementLogo ? (
        <span
          className={`triad-card__type-badge triad-card__type-badge--${card.elementId}`}
          data-testid="triad-card-type-badge"
          aria-hidden="true"
        >
          <img
            className="triad-card__type-logo"
            src={elementLogo.imageSrc}
            alt={elementLogo.name}
            width={24}
            height={24}
            loading="lazy"
            decoding="async"
            data-testid="triad-card-type-logo"
          />
        </span>
      ) : null}
      <div className="triad-card__frame">
        <div className="triad-card__face">
          <span className={`triad-card__stat triad-card__stat--top effect-stat--${topTrend}`}>{top}</span>
          <span className={`triad-card__stat triad-card__stat--right effect-stat--${rightTrend}`}>{right}</span>
          <span className={`triad-card__stat triad-card__stat--bottom effect-stat--${bottomTrend}`}>{bottom}</span>
          <span className={`triad-card__stat triad-card__stat--left effect-stat--${leftTrend}`}>{left}</span>

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
              {hasShiny ? (
                <span
                  className="triad-card__shiny-pill triad-card__shiny-pill--footer"
                  data-testid="triad-card-shiny-pill"
                  aria-label="Shiny card"
                  title="Shiny card"
                />
              ) : null}
              <span className={nameClassName}>{locked ? 'Locked Card' : card.name}</span>
              <span className="triad-card__meta">
                <span className="triad-card__id">{locked ? '????' : formatCardPokedexNumber(card)}</span>
                {!locked ? <span className="triad-card__rarity">{normalizeRarity(card.rarity)}</span> : null}
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
        ref={interactiveCardRef}
        type="button"
        className={classes}
        onClick={onClick}
        onPointerMove={handleShinyPointerMove}
        onPointerLeave={handleShinyPointerLeave}
        disabled={disabled}
        aria-label={label}
        aria-pressed={selected}
        data-testid={testId}
        style={shinyPointerStyle}
      >
        {content}
      </button>
    )
  }

  return (
    <article
      className={classes}
      aria-label={label}
      data-testid={testId}
      onPointerMove={handleShinyPointerMove}
      onPointerLeave={handleShinyPointerLeave}
      style={shinyPointerStyle}
    >
      {content}
    </article>
  )
})
