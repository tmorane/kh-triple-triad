import { useEffect, useId, useMemo, useState } from 'react'
import { cardTypeIds } from '../../domain/cards/taxonomy'
import { getSynergyRuleSpec } from '../../domain/cards/synergyRules'
import type { CardTypeId } from '../../domain/types'
import { getTypeLogoMeta } from './typeLogos'

export interface DeckSynergyGuideProps {
  countsByType: Record<CardTypeId, number>
  primaryTypeId: CardTypeId | null
  secondaryTypeId: CardTypeId | null
  testIdPrefix?: string
}

function resolveDefaultTypeId(
  countsByType: Record<CardTypeId, number>,
  primaryTypeId: CardTypeId | null,
  secondaryTypeId: CardTypeId | null,
): CardTypeId {
  if (primaryTypeId) {
    return primaryTypeId
  }
  if (secondaryTypeId) {
    return secondaryTypeId
  }
  const firstOwnedTypeId = cardTypeIds.find((typeId) => countsByType[typeId] > 0)
  return firstOwnedTypeId ?? 'sans_coeur'
}

function getTypeStateClass(
  typeId: CardTypeId,
  count: number,
  primaryTypeId: CardTypeId | null,
  secondaryTypeId: CardTypeId | null,
): string {
  if (typeId === primaryTypeId) {
    return 'is-primary-active'
  }
  if (typeId === secondaryTypeId) {
    return 'is-secondary-active'
  }
  if (count <= 0) {
    return 'is-empty'
  }
  return 'is-inactive'
}

function getTypeStateLabel(typeId: CardTypeId, primaryTypeId: CardTypeId | null, secondaryTypeId: CardTypeId | null): string {
  if (typeId === primaryTypeId) {
    return 'Primaire actif'
  }
  if (typeId === secondaryTypeId) {
    return 'Secondaire actif'
  }
  return 'Inactif'
}

export function DeckSynergyGuide({
  countsByType,
  primaryTypeId,
  secondaryTypeId,
  testIdPrefix = 'synergy',
}: DeckSynergyGuideProps) {
  const defaultTypeId = useMemo(
    () => resolveDefaultTypeId(countsByType, primaryTypeId, secondaryTypeId),
    [countsByType, primaryTypeId, secondaryTypeId],
  )
  const [selectedTypeId, setSelectedTypeId] = useState<CardTypeId | null>(defaultTypeId)
  const [hoveredTypeId, setHoveredTypeId] = useState<CardTypeId | null>(null)
  const detailPanelId = useId()

  useEffect(() => {
    setSelectedTypeId(defaultTypeId)
  }, [defaultTypeId])

  const activeTypeId = hoveredTypeId ?? selectedTypeId

  return (
    <section className="deck-synergy-guide" data-testid={`${testIdPrefix}-guide`}>
      <p className="deck-synergy-guide__title">Bonus de types</p>

      <div className="deck-synergy-guide__types" role="group" aria-label="Bonus par type de deck">
        {cardTypeIds.map((typeId) => {
          const spec = getSynergyRuleSpec(typeId)
          const count = countsByType[typeId]
          const logo = getTypeLogoMeta(typeId)
          const stateClass = getTypeStateClass(typeId, count, primaryTypeId, secondaryTypeId)
          const isExpanded = activeTypeId === typeId
          const label = `${spec.label}, x${count}. ${getTypeStateLabel(typeId, primaryTypeId, secondaryTypeId)}.`

          return (
            <button
              key={typeId}
              type="button"
              className={`deck-synergy-guide__type-button deck-synergy-guide__type-button--${typeId} ${stateClass} ${isExpanded ? 'is-selected' : ''}`}
              onMouseEnter={() => setHoveredTypeId(typeId)}
              onMouseLeave={() => setHoveredTypeId(null)}
              onFocus={() => setHoveredTypeId(typeId)}
              onBlur={() => setHoveredTypeId(null)}
              onClick={() => {
                setHoveredTypeId(null)
                setSelectedTypeId((currentTypeId) => (currentTypeId === typeId ? null : typeId))
              }}
              aria-label={label}
              aria-pressed={isExpanded}
              aria-expanded={isExpanded}
              aria-controls={detailPanelId}
              data-testid={`${testIdPrefix}-type-${typeId}`}
            >
              <span className="deck-synergy-guide__type-main">
                <span className="deck-synergy-guide__type-icon">
                  <img src={logo.imageSrc} alt="" className="deck-synergy-guide__type-icon-image" width={24} height={24} />
                </span>
                <span className="deck-synergy-guide__type-name">{spec.label}</span>
              </span>
              <span className="deck-synergy-guide__type-count">x{count}</span>
              <span className="deck-synergy-guide__type-state">{getTypeStateLabel(typeId, primaryTypeId, secondaryTypeId)}</span>
            </button>
          )
        })}
      </div>

      <div className="deck-synergy-guide__detail" id={detailPanelId}>
        {activeTypeId ? (
          (() => {
            const spec = getSynergyRuleSpec(activeTypeId)
            const typeCount = countsByType[activeTypeId]
            const isPrimaryActive = activeTypeId === primaryTypeId
            const isSecondaryActive = activeTypeId === secondaryTypeId
            return (
              <>
                <p className="deck-synergy-guide__detail-title" data-testid={`${testIdPrefix}-detail-title`}>
                  {spec.label}
                </p>
                <p className="deck-synergy-guide__detail-status">
                  {isPrimaryActive
                    ? 'Actif dans ce deck: bonus primaire.'
                    : isSecondaryActive
                      ? 'Actif dans ce deck: bonus secondaire.'
                      : `Non actif pour l instant (x${typeCount}).`}
                </p>
                <p className="deck-synergy-guide__detail-line" data-testid={`${testIdPrefix}-detail-primary`}>
                  Primaire ({spec.primaryThreshold}+): {spec.primaryEffect}
                </p>
                <p className="deck-synergy-guide__detail-line" data-testid={`${testIdPrefix}-detail-secondary`}>
                  {spec.secondaryThreshold && spec.secondaryEffect
                    ? `Secondaire (${spec.secondaryThreshold}+): ${spec.secondaryEffect}`
                    : 'Secondaire: pas de bonus secondaire pour Nature.'}
                </p>
              </>
            )
          })()
        ) : (
          <p className="deck-synergy-guide__detail-empty" data-testid={`${testIdPrefix}-detail-empty`}>
            Touchez un type pour voir ses bonus.
          </p>
        )}
      </div>
    </section>
  )
}

