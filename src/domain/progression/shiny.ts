import type { SeededRng } from '../random/seededRng'
import type { CardId, PlayerProfile } from '../types'
import { hasUnlockedAllAchievements } from './achievementRewards'

export const SHINY_DROP_ROLL_MAX = 10_000
export const SHINY_DROP_CHANCE = 100
export const BASE_SHINY_CRAFT_COST = 50
export const SHINY_CRAFT_COST = BASE_SHINY_CRAFT_COST

export function rollShinyVariant(rng: SeededRng): boolean {
  return rng.nextInt(SHINY_DROP_ROLL_MAX) < SHINY_DROP_CHANCE
}

export function getNormalCopies(profile: PlayerProfile, cardId: CardId): number {
  return profile.cardCopiesById[cardId] ?? 0
}

export function getShinyCopies(profile: PlayerProfile, cardId: CardId): number {
  return profile.shinyCardCopiesById[cardId] ?? 0
}

export function getTotalCopies(profile: PlayerProfile, cardId: CardId): number {
  return getNormalCopies(profile, cardId) + getShinyCopies(profile, cardId)
}

export function hasShinyCopy(profile: PlayerProfile, cardId: CardId): boolean {
  return getShinyCopies(profile, cardId) > 0
}

export function getShinyCraftCost(profile: PlayerProfile): number {
  return hasUnlockedAllAchievements(profile) ? Math.ceil(BASE_SHINY_CRAFT_COST / 2) : BASE_SHINY_CRAFT_COST
}

export function craftShinyCard(profile: PlayerProfile, cardId: CardId): PlayerProfile {
  const shinyCraftCost = getShinyCraftCost(profile)
  const normalCopies = getNormalCopies(profile, cardId)
  if (normalCopies < shinyCraftCost) {
    throw new Error(`You need at least ${shinyCraftCost} normal copies to craft a shiny card.`)
  }

  const nextProfile: PlayerProfile = {
    ...profile,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    shinyCardCopiesById: { ...profile.shinyCardCopiesById },
  }

  const normalCopiesAfter = normalCopies - shinyCraftCost
  if (normalCopiesAfter <= 0) {
    delete nextProfile.cardCopiesById[cardId]
  } else {
    nextProfile.cardCopiesById[cardId] = normalCopiesAfter
  }

  const shinyCopiesAfter = getShinyCopies(nextProfile, cardId) + 1
  nextProfile.shinyCardCopiesById[cardId] = shinyCopiesAfter

  if (!nextProfile.ownedCardIds.includes(cardId)) {
    nextProfile.ownedCardIds.push(cardId)
  }

  return nextProfile
}
