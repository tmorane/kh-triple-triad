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
      cards4x4: [...slot.cards4x4],
      rules: { ...slot.rules },
    })) as PlayerProfile['deckSlots'],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: [...profile.achievements],
    missions: {
      m1_type_specialist: { ...profile.missions.m1_type_specialist },
      m2_combo_practitioner: { ...profile.missions.m2_combo_practitioner },
      m3_corner_tactician: { ...profile.missions.m3_corner_tactician },
    },
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
  const playerSamePlusTriggers = result.metrics?.samePlusTriggersByActor.player ?? 0
  const playerPrimaryTypeId = result.typeSynergy?.player.primaryTypeId ?? null
  const bonusGoldFromComboBounty =
    playerPrimaryTypeId === 'nescient' ? Math.min(Math.max(0, playerSamePlusTriggers), 4) * 3 : 0
  const bonusGoldFromCleanVictory =
    playerPrimaryTypeId !== null &&
    playerPrimaryTypeId !== 'sans_coeur' &&
    playerPrimaryTypeId !== 'simili' &&
    playerPrimaryTypeId !== 'nescient' &&
    result.winner === 'player' &&
    result.playerCount - result.cpuCount >= 2
      ? 10
      : 0
  const bonusGoldFromSecondarySynergy =
    result.winner === 'player' && result.typeSynergy?.player.secondaryTypeId ? 5 : 0
  const safeMultiplier = Number.isFinite(rewardMultiplier) && rewardMultiplier > 0 ? rewardMultiplier : 1
  let droppedCardId: CardId | null = null
  let duplicateConverted = false
  const newlyOwnedCards: CardId[] = []

  if (result.winner === 'player') {
    const capturedCardId = resolveCapturedCardId(updatedProfile.ownedCardIds, cpuDeck, rng, claimedCpuCardId)
    droppedCardId = capturedCardId

    if (!updatedProfile.ownedCardIds.includes(capturedCardId)) {
      updatedProfile.ownedCardIds.push(capturedCardId)
      newlyOwnedCards.push(capturedCardId)
    }

    updatedProfile.cardCopiesById[capturedCardId] = (updatedProfile.cardCopiesById[capturedCardId] ?? 0) + 1
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
