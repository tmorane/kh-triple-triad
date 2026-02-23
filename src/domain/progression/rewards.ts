import { createSeededRng } from '../random/seededRng'
import type { OpponentLevel } from '../match/opponents'
import type { AchievementId, CardId, MatchResult, PlayerProfile } from '../types'
import { evaluateAchievements } from './achievements'

export interface RewardBreakdown {
  goldAwarded: number
  bonusGoldFromDuplicate: number
  bonusGoldFromDifficulty: number
  bonusGoldFromCriticalVictory: number
  bonusGoldFromAutoDeck: number
  criticalVictory: boolean
  droppedCardId: CardId | null
  duplicateConverted: boolean
  newlyUnlockedAchievements: AchievementId[]
}

export interface MatchProgressionResult {
  profile: PlayerProfile
  rewards: RewardBreakdown
  newlyOwnedCards: CardId[]
}

export function applyMatchRewards(
  profile: PlayerProfile,
  result: MatchResult,
  cpuDeck: CardId[],
  seed: number,
  opponentLevel: OpponentLevel = 1,
  rewardMultiplier = 1,
): MatchProgressionResult {
  const rng = createSeededRng(seed)

  const updatedProfile: PlayerProfile = {
    ...profile,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) => ({
      ...slot,
      cards: [...slot.cards],
      rules: { ...slot.rules },
    })) as PlayerProfile['deckSlots'],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: [...profile.achievements],
    ranked: {
      ...profile.ranked,
      resultStreak: { ...profile.ranked.resultStreak },
    },
    settings: { ...profile.settings },
  }

  updatedProfile.stats.played += 1
  if (result.winner === 'player') {
    updatedProfile.stats.won += 1
    updatedProfile.stats.streak += 1
    updatedProfile.stats.bestStreak = Math.max(updatedProfile.stats.bestStreak, updatedProfile.stats.streak)
  } else {
    updatedProfile.stats.streak = 0
  }

  const baseGold = result.winner === 'player' ? 60 : result.winner === 'draw' ? 30 : 20
  let bonusGoldFromDuplicate = 0
  const bonusGoldFromDifficulty = result.winner === 'player' ? (opponentLevel - 1) * 4 : 0
  const safeMultiplier = Number.isFinite(rewardMultiplier) && rewardMultiplier > 0 ? rewardMultiplier : 1
  let droppedCardId: CardId | null = null
  let duplicateConverted = false
  const newlyOwnedCards: CardId[] = []

  if (result.winner === 'player') {
    const drop = chooseWinDrop(updatedProfile.ownedCardIds, cpuDeck, rng.nextInt(cpuDeck.length))
    droppedCardId = drop.cardId
    if (drop.isDuplicate) {
      bonusGoldFromDuplicate += 15
      duplicateConverted = true
    } else {
      updatedProfile.ownedCardIds.push(drop.cardId)
      updatedProfile.cardCopiesById[drop.cardId] = (updatedProfile.cardCopiesById[drop.cardId] ?? 0) + 1
      newlyOwnedCards.push(drop.cardId)
    }
  } else if (result.winner === 'draw') {
    const shouldDrop = rng.next() < 0.2
    if (shouldDrop) {
      const cardId = cpuDeck[rng.nextInt(cpuDeck.length)]
      droppedCardId = cardId
      if (updatedProfile.ownedCardIds.includes(cardId)) {
        bonusGoldFromDuplicate += 15
        duplicateConverted = true
      } else {
        updatedProfile.ownedCardIds.push(cardId)
        updatedProfile.cardCopiesById[cardId] = (updatedProfile.cardCopiesById[cardId] ?? 0) + 1
        newlyOwnedCards.push(cardId)
      }
    }
  }

  const criticalVictory = result.winner === 'player' && result.playerCount === 9 && result.cpuCount === 0
  const baseSubtotal = baseGold + bonusGoldFromDuplicate + bonusGoldFromDifficulty
  const bonusGoldFromCriticalVictory = criticalVictory ? Math.floor(baseSubtotal * 0.25) : 0
  const rawTotalGold = baseSubtotal + bonusGoldFromCriticalVictory
  const multipliedTotalGold = Math.floor(rawTotalGold * safeMultiplier)
  const bonusGoldFromAutoDeck = Math.max(0, multipliedTotalGold - rawTotalGold)

  updatedProfile.gold += multipliedTotalGold

  const unlocked = evaluateAchievements(updatedProfile)
  updatedProfile.achievements.push(...unlocked)

  return {
    profile: updatedProfile,
    newlyOwnedCards,
    rewards: {
      goldAwarded: baseGold,
      bonusGoldFromDuplicate,
      bonusGoldFromDifficulty,
      bonusGoldFromCriticalVictory,
      bonusGoldFromAutoDeck,
      criticalVictory,
      droppedCardId,
      duplicateConverted,
      newlyUnlockedAchievements: unlocked.map((entry) => entry.id),
    },
  }
}

function chooseWinDrop(ownedCardIds: CardId[], cpuDeck: CardId[], roll: number): { cardId: CardId; isDuplicate: boolean } {
  const nonOwned = cpuDeck.filter((cardId) => !ownedCardIds.includes(cardId))
  if (nonOwned.length > 0) {
    const cardId = nonOwned[roll % nonOwned.length]
    return { cardId, isDuplicate: false }
  }

  const cardId = cpuDeck[roll % cpuDeck.length]
  return { cardId, isDuplicate: true }
}
