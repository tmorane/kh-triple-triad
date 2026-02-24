import { useState } from 'react'
import { cardTypeIds } from '../../domain/cards/taxonomy'
import { getSynergyRuleSpec } from '../../domain/cards/synergyRules'
import type { CardTypeId } from '../../domain/types'
import { getTypeLogoMeta } from './typeLogos'

type SynergyLegendLogoId = CardTypeId

interface SynergyBonusLegendProps {
  highlightTypeId: CardTypeId | null
  isTypeHidden: boolean
}

interface SynergyLegendLogo {
  id: SynergyLegendLogoId
  typeId: CardTypeId
  name: string
  description: string
}

const logos: SynergyLegendLogo[] = cardTypeIds.map((typeId) => {
  const rule = getSynergyRuleSpec(typeId)
  return {
    id: typeId,
    typeId,
    name: rule.label,
    description: rule.legendDescription,
  }
})

function resolveActiveRowId(
  highlightTypeId: CardTypeId | null,
  isTypeHidden: boolean,
): SynergyLegendLogoId | null {
  if (isTypeHidden || !highlightTypeId) {
    return null
  }

  return logos.some((logo) => logo.id === highlightTypeId) ? highlightTypeId : null
}

export function SynergyBonusLegend({ highlightTypeId, isTypeHidden }: SynergyBonusLegendProps) {
  const activeRowId = resolveActiveRowId(highlightTypeId, isTypeHidden)
  const [hoveredLogoId, setHoveredLogoId] = useState<SynergyLegendLogoId | null>(null)
  const hoveredLogo = hoveredLogoId ? logos.find((logo) => logo.id === hoveredLogoId) ?? null : null
  const description = hoveredLogo?.description ?? ''

  return (
    <section className="synergy-legend" aria-label="Synergy bonus legend" data-testid="collection-synergy-legend">
      <p className="synergy-legend__title">Synergy bonuses</p>
      <div className="synergy-legend__logos" role="list">
        {logos.map((logo) => (
          <button
            key={logo.id}
            type="button"
            role="listitem"
            className={`synergy-legend__logo synergy-legend__logo--${logo.id} ${activeRowId === logo.id ? 'is-active' : ''}`}
            data-testid={`synergy-legend-logo-${logo.id}`}
            aria-label={logo.name}
            onMouseEnter={() => setHoveredLogoId(logo.id)}
            onMouseLeave={() => setHoveredLogoId(null)}
            onFocus={() => setHoveredLogoId(logo.id)}
            onBlur={() => setHoveredLogoId(null)}
          >
            <span className="synergy-legend__glyph">
              <img className="synergy-legend__img" src={getTypeLogoMeta(logo.typeId).imageSrc} alt={logo.name} width={28} height={28} />
            </span>
          </button>
        ))}
      </div>
      <p className={`synergy-legend__description ${description ? 'is-visible' : ''}`} data-testid="synergy-legend-description">
        {description}
      </p>
    </section>
  )
}
