import { getCard } from './cardPool'
import { getTypeIdByCategory } from './taxonomy'
import type { CardId, CardTypeId } from '../types'

const secondaryEligibleTypes = new Set<CardTypeId>(['sans_coeur', 'simili', 'nescient'])

export interface DeckTypeSynergyResolution {
  primaryTypeId: CardTypeId | null
  secondaryTypeId: CardTypeId | null
  countsByType: Record<CardTypeId, number>
}

function createEmptyTypeCounts(): Record<CardTypeId, number> {
  return {
    sans_coeur: 0,
    simili: 0,
    nescient: 0,
    humain: 0,
    disney: 0,
    boss: 0,
  }
}

export function resolveDeckTypeSynergy(cardIds: CardId[]): DeckTypeSynergyResolution {
  const countsByType = createEmptyTypeCounts()

  for (const cardId of cardIds) {
    const typeId = getTypeIdByCategory(getCard(cardId).categoryId)
    countsByType[typeId] += 1
  }

  const primaryCandidates = Object.entries(countsByType)
    .filter(([, count]) => count >= 3)
    .sort((left, right) => right[1] - left[1])

  if (primaryCandidates.length === 0) {
    return {
      primaryTypeId: null,
      secondaryTypeId: null,
      countsByType,
    }
  }

  if (primaryCandidates.length > 1 && primaryCandidates[0]?.[1] === primaryCandidates[1]?.[1]) {
    return {
      primaryTypeId: null,
      secondaryTypeId: null,
      countsByType,
    }
  }

  const primaryTypeId = primaryCandidates[0]?.[0] as CardTypeId

  const secondaryCandidates = Object.entries(countsByType)
    .filter(([typeId, count]) => typeId !== primaryTypeId && count >= 2 && secondaryEligibleTypes.has(typeId as CardTypeId))
    .sort((left, right) => right[1] - left[1])

  const secondaryTypeId = secondaryCandidates[0] ? (secondaryCandidates[0][0] as CardTypeId) : null

  return {
    primaryTypeId,
    secondaryTypeId,
    countsByType,
  }
}
