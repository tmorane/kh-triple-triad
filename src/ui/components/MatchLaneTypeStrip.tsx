import { useRef, useState, type CSSProperties } from 'react'
import type { Actor } from '../../domain/types'
import type { MatchLaneTypeSlot } from '../../domain/match/effectsViewModel'
import { getElementLogoMeta } from './elementLogos'

interface MatchLaneTypeStripProps {
  actor: Actor
  slots: MatchLaneTypeSlot[]
  mode: 'normal' | 'effects'
}

function buildSlotDescription(slot: MatchLaneTypeSlot, mode: 'normal' | 'effects'): string {
  const parts: string[] = []

  if (mode === 'normal' || slot.state === 'disabled') {
    parts.push('Mode normal: effets désactivés.')
  }

  parts.push(`${slot.displayLabel}: ${slot.effectText}`)

  if (slot.state === 'used') {
    parts.push('Type déjà consommé dans cette partie.')
  }

  return parts.join(' ')
}

export function MatchLaneTypeStrip({ actor, slots, mode }: MatchLaneTypeStripProps) {
  const stripRef = useRef<HTMLElement | null>(null)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; placement: 'above' | 'below' } | null>(null)
  const iconsStyle = { '--lane-slot-count': Math.max(1, slots.length) } as CSSProperties

  const hideTooltip = () => setTooltip(null)

  const showTooltip = (target: HTMLElement, text: string) => {
    const stripRect = stripRef.current?.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (!stripRect) {
      setTooltip({ text, x: 0, placement: 'above' })
      return
    }

    const rawCenterX = targetRect.left + targetRect.width / 2 - stripRect.left
    const edgePadding = 18
    const clampedCenterX = Math.min(
      Math.max(rawCenterX, edgePadding),
      Math.max(edgePadding, stripRect.width - edgePadding),
    )

    const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight
    const spaceAbove = stripRect.top
    const spaceBelow = viewportHeight - stripRect.bottom
    const placement: 'above' | 'below' = spaceAbove < 150 && spaceBelow > spaceAbove ? 'below' : 'above'

    setTooltip({ text, x: clampedCenterX, placement })
  }

  return (
    <section
      ref={stripRef}
      className="match-lane-type-strip"
      data-testid={`match-lane-type-strip-${actor}`}
      aria-label={`Types actifs ${actor}`}
    >
      <div className="match-lane-type-strip__icons" role="list" style={iconsStyle}>
        {slots.map((slot) => {
          const logo = getElementLogoMeta(slot.elementId)
          const slotDescription = buildSlotDescription(slot, mode)
          return (
            <button
              key={`${actor}-${slot.slotIndex}-${slot.cardId}`}
              type="button"
              role="listitem"
              className={[
                'match-lane-type-strip__icon',
                slot.state === 'used' ? 'is-used' : '',
                slot.state === 'disabled' ? 'is-disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={slotDescription}
              onMouseEnter={(event) => showTooltip(event.currentTarget, slotDescription)}
              onMouseLeave={hideTooltip}
              onFocus={(event) => showTooltip(event.currentTarget, slotDescription)}
              onBlur={hideTooltip}
              data-testid={`match-lane-type-strip-icon-${actor}-${slot.slotIndex}`}
            >
              {logo ? (
                <img
                  src={logo.imageSrc}
                  alt=""
                  className="match-lane-type-strip__icon-image"
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  aria-hidden="true"
                />
              ) : (
                <span className="match-lane-type-strip__icon-fallback" aria-hidden="true">
                  {slot.displayLabel.slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {tooltip ? (
        <div
          className={`match-lane-type-strip__tooltip ${
            tooltip.placement === 'below' ? 'match-lane-type-strip__tooltip--below' : 'match-lane-type-strip__tooltip--above'
          }`}
          role="tooltip"
          style={{ left: `${tooltip.x}px` }}
          data-testid={`match-lane-type-strip-tooltip-${actor}`}
        >
          {tooltip.text}
        </div>
      ) : null}
    </section>
  )
}
