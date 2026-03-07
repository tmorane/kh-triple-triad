import { createSeededRng } from '../random/seededRng'
import type { OpponentLevel } from '../match/opponents'
import { getModeSpec } from '../match/modeSpec'
import type { AchievementId, CardId, MatchResult, PlayerProfile } from '../types'
import { evaluateAchievements } from './achievements'

export interface RewardBreakdown {
  goldAwarded: number
  bonusGoldFromDuplicate: number
  bonusGoldFromDifficulty: number
  bonusGoldFromComboBounty: number
  bonusGoldFromCleanVictory: number
  bonusGoldFromSecondarySynergy: number
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
  claimedCpuCardId?: CardId,
  options?: { disableCardCapture?: boolean },
): MatchProgressionResult {
  const rng = createSeededRng(seed)

  const updatedProfile: PlayerProfile = {
    ...profile,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    cardFragmentsById: { ...profile.cardFragmentsById },
    shinyCardCopiesById: { ...profile.shinyCardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) => ({
      ...slot,
      cards: [...slot.cards],
      cards4x4: [...slot.cards4x4],
      rules: { ...slot.rules },
    })) as PlayerProfile['deckSlots'],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievementProgress: { ...profile.achievementProgress },
    achievements: [...profile.achievements],
    missions: {
      m1_type_specialist: { ...profile.missions.m1_type_specialist },
      m2_combo_practitioner: { ...profile.missions.m2_combo_practitioner },
      m3_corner_tactician: { ...profile.missions.m3_corner_tactician },
    },
    missionRewardsGrantedById: { ...profile.missionRewardsGrantedById },
    rankedByMode: {
      '3x3': {
        ...profile.rankedByMode['3x3'],
        resultStreak: { ...profile.rankedByMode['3x3'].resultStreak },
      },
      '4x4': {
        ...profile.rankedByMode['4x4'],
        resultStreak: { ...profile.rankedByMode['4x4'].resultStreak },
      },
    },
    settings: { ...profile.settings },
  }

  updatedProfile.stats.played += 1
  updatedProfile.achievementProgress.matchesPlayed += 1
  if (result.winner === 'player') {
    updatedProfile.stats.won += 1
    updatedProfile.stats.streak += 1
    updatedProfile.stats.bestStreak = Math.max(updatedProfile.stats.bestStreak, updatedProfile.stats.streak)
    updatedProfile.achievementProgress.matchesWon += 1
    updatedProfile.achievementProgress.currentStreak += 1
    updatedProfile.achievementProgress.bestStreak = Math.max(
      updatedProfile.achievementProgress.bestStreak,
      updatedProfile.achievementProgress.currentStreak,
    )
  } else {
    updatedProfile.stats.streak = 0
    updatedProfile.achievementProgress.currentStreak = 0
  }

  const baseGold = result.winner === 'player' ? 60 : result.winner === 'draw' ? 30 : 20
  const bonusGoldFromDuplicate = 0
  const bonusGoldFromDifficulty = result.winner === 'player' ? (opponentLevel - 1) * 4 : 0
  const bonusGoldFromComboBounty = 0
  const bonusGoldFromCleanVictory = 0
  const bonusGoldFromSecondarySynergy = 0
  const safeMultiplier = Number.isFinite(rewardMultiplier) && rewardMultiplier > 0 ? rewardMultiplier : 1
  let droppedCardId: CardId | null = null
  const duplicateConverted = false
  const newlyOwnedCards: CardId[] = []

  const disableCardCapture = options?.disableCardCapture === true

  if (result.winner === 'player' && !disableCardCapture) {
    const capturedCardId = resolveCapturedCardId(updatedProfile.ownedCardIds, cpuDeck, rng, claimedCpuCardId)
    droppedCardId = capturedCardId
    updatedProfile.cardFragmentsById[capturedCardId] = (updatedProfile.cardFragmentsById[capturedCardId] ?? 0) + 1
  }

  const criticalVictoryCellCount = getModeSpec(result.mode).cellCount
  const criticalVictory =
    result.winner === 'player' && result.playerCount === criticalVictoryCellCount && result.cpuCount === 0
  const baseSubtotal =
    baseGold +
    bonusGoldFromDuplicate +
    bonusGoldFromDifficulty +
    bonusGoldFromComboBounty +
    bonusGoldFromCleanVictory +
    bonusGoldFromSecondarySynergy
  const bonusGoldFromCriticalVictory = criticalVictory ? Math.floor(baseSubtotal * 0.25) : 0
  const rawTotalGold = baseSubtotal + bonusGoldFromCriticalVictory
  const multipliedTotalGold = Math.floor(rawTotalGold * safeMultiplier)
  const bonusGoldFromAutoDeck = Math.max(0, multipliedTotalGold - rawTotalGold)

  updatedProfile.gold += multipliedTotalGold
  updatedProfile.achievementProgress.goldEarned += multipliedTotalGold

  const unlocked = evaluateAchievements(updatedProfile)
  updatedProfile.achievements.push(...unlocked)

  return {
    profile: updatedProfile,
    newlyOwnedCards,
    rewards: {
      goldAwarded: baseGold,
      bonusGoldFromDuplicate,
      bonusGoldFromDifficulty,
      bonusGoldFromComboBounty,
      bonusGoldFromCleanVictory,
      bonusGoldFromSecondarySynergy,
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

function resolveCapturedCardId(
  ownedCardIds: CardId[],
  cpuDeck: CardId[],
  rng: ReturnType<typeof createSeededRng>,
  claimedCpuCardId?: CardId,
): CardId {
  if (claimedCpuCardId !== undefined) {
    if (!cpuDeck.includes(claimedCpuCardId)) {
      throw new Error('Claimed card must belong to the CPU deck.')
    }
    return claimedCpuCardId
  }

  const fallback = chooseWinDrop(ownedCardIds, cpuDeck, rng.nextInt(cpuDeck.length))
  return fallback.cardId
}
