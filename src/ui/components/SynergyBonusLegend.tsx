import { useState } from 'react'
import type { CardTypeId } from '../../domain/types'
import { getTypeLogoMeta } from './typeLogos'

type SynergyLegendLogoId = 'sans_coeur' | 'simili' | 'nescient' | 'r8'

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

const logos: SynergyLegendLogo[] = [
  {
    id: 'sans_coeur',
    typeId: 'sans_coeur',
    name: 'Sans-coeur',
    description: 'Sans-coeur (3+) : +1 on all 4 sides on first move.',
  },
  {
    id: 'simili',
    typeId: 'simili',
    name: 'Simili',
    description: 'Simili (3+) : +1 on active corner sides.',
  },
  {
    id: 'nescient',
    typeId: 'nescient',
    name: 'Nescient',
    description: 'Nescient (3+) : +3 gold per Same/Plus trigger (cap +12/match).',
  },
  {
    id: 'r8',
    typeId: 'humain',
    name: 'Humain/Disney/Boss',
    description: 'Humain/Disney/Boss (3+) : +10 gold on 2+ point win.',
  },
]

function resolveActiveRowId(
  highlightTypeId: CardTypeId | null,
  isTypeHidden: boolean,
): SynergyLegendLogoId | null {
  if (isTypeHidden || !highlightTypeId) {
    return null
  }

  if (highlightTypeId === 'humain' || highlightTypeId === 'disney' || highlightTypeId === 'boss') {
    return 'r8'
  }

  if (highlightTypeId === 'sans_coeur' || highlightTypeId === 'simili' || highlightTypeId === 'nescient') {
    return highlightTypeId
  }

  return null
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
