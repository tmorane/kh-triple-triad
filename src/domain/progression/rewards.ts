import { createSeededRng } from '../random/seededRng'
import type { OpponentLevel } from '../match/opponents'
import { getModeSpec } from '../match/modeSpec'
import type { AchievementId, CardId, MatchResult, PlayerProfile } from '../types'
import { evaluateAchievements } from './achievements'
import { cloneMissionProgressMap } from './missionCatalog'

export interface RewardBreakdown {
  goldAwarded: number
  bonusGoldFromDuplicate: number
  bonusGoldFromDifficulty: number
  bonusGoldFromWinStreak: number
  bonusGoldFromComboBounty: number
  bonusGoldFromCleanVictory: number
  bonusGoldFromSecondarySynergy: number
  bonusGoldFromCriticalVictory: number
  bonusGoldFromAutoDeck: number
  criticalVictory: boolean
  droppedCardId: CardId | null
  droppedCardIds?: CardId[]
  duplicateConverted: boolean
  newlyUnlockedAchievements: AchievementId[]
}

export interface MatchProgressionResult {
  profile: PlayerProfile
  rewards: RewardBreakdown
  newlyOwnedCards: CardId[]
}

const MATCH_GOLD_BY_OUTCOME: Record<MatchResult['winner'], number> = {
  player: 42,
  draw: 24,
  cpu: 14,
}

const GOLD_PER_OPPONENT_LEVEL = 3
const GOLD_PER_STREAK_WIN = 6
const MAX_WIN_STREAK_GOLD = 30

export function applyMatchRewards(
  profile: PlayerProfile,
  result: MatchResult,
  cpuDeck: CardId[],
  seed: number,
  opponentLevel: OpponentLevel = 1,
  rewardMultiplier = 1,
  claimedCpuCardId?: CardId | CardId[],
  options?: { disableCardCapture?: boolean; fixedGoldAward?: number },
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
    missions: cloneMissionProgressMap(profile.missions),
    missionRewardsGrantedById: { ...profile.missionRewardsGrantedById },
    rankedByMode: {
      '3x3': {
        ...profile.rankedByMode['3x3'],
        resultStreak: { ...profile.rankedByMode['3x3'].resultStreak },
        promotionSeries: profile.rankedByMode['3x3'].promotionSeries ? { ...profile.rankedByMode['3x3'].promotionSeries } : null,
        seasonLeagueRewardsClaimed: profile.rankedByMode['3x3'].seasonLeagueRewardsClaimed
          ? { ...profile.rankedByMode['3x3'].seasonLeagueRewardsClaimed }
          : undefined,
      },
      '4x4': {
        ...profile.rankedByMode['4x4'],
        resultStreak: { ...profile.rankedByMode['4x4'].resultStreak },
        promotionSeries: profile.rankedByMode['4x4'].promotionSeries ? { ...profile.rankedByMode['4x4'].promotionSeries } : null,
        seasonLeagueRewardsClaimed: profile.rankedByMode['4x4'].seasonLeagueRewardsClaimed
          ? { ...profile.rankedByMode['4x4'].seasonLeagueRewardsClaimed }
          : undefined,
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

  const fixedGoldAward =
    typeof options?.fixedGoldAward === 'number' && Number.isFinite(options.fixedGoldAward)
      ? Math.max(0, Math.floor(options.fixedGoldAward))
      : null
  const hasFixedGoldAward = fixedGoldAward !== null
  const baseGold = hasFixedGoldAward ? fixedGoldAward : MATCH_GOLD_BY_OUTCOME[result.winner]
  const bonusGoldFromDuplicate = 0
  const bonusGoldFromDifficulty =
    !hasFixedGoldAward && result.winner === 'player' ? Math.max(0, opponentLevel - 1) * GOLD_PER_OPPONENT_LEVEL : 0
  const bonusGoldFromWinStreak =
    !hasFixedGoldAward && result.winner === 'player'
      ? Math.min(MAX_WIN_STREAK_GOLD, Math.max(0, updatedProfile.stats.streak - 1) * GOLD_PER_STREAK_WIN)
      : 0
  const bonusGoldFromComboBounty = 0
  const bonusGoldFromCleanVictory = 0
  const bonusGoldFromSecondarySynergy = 0
  const safeMultiplier = Number.isFinite(rewardMultiplier) && rewardMultiplier > 0 ? rewardMultiplier : 1
  let droppedCardId: CardId | null = null
  let droppedCardIds: CardId[] = []
  const duplicateConverted = false
  const newlyOwnedCards: CardId[] = []

  const disableCardCapture = options?.disableCardCapture === true

  if (result.winner === 'player' && !disableCardCapture) {
    const capturedCardIds = resolveCapturedCardIds(updatedProfile.ownedCardIds, cpuDeck, rng, claimedCpuCardId)
    droppedCardId = capturedCardIds[0] ?? null
    droppedCardIds = capturedCardIds
    for (const capturedCardId of capturedCardIds) {
      updatedProfile.cardFragmentsById[capturedCardId] = (updatedProfile.cardFragmentsById[capturedCardId] ?? 0) + 1
    }
  }

  const criticalVictoryCellCount = getModeSpec(result.mode).cellCount
  const criticalVictory =
    !hasFixedGoldAward && result.winner === 'player' && result.playerCount === criticalVictoryCellCount && result.cpuCount === 0
  const baseSubtotal =
    baseGold +
    bonusGoldFromDuplicate +
    bonusGoldFromDifficulty +
    bonusGoldFromWinStreak +
    bonusGoldFromComboBounty +
    bonusGoldFromCleanVictory +
    bonusGoldFromSecondarySynergy
  const bonusGoldFromCriticalVictory = criticalVictory ? Math.floor(baseSubtotal * 0.25) : 0
  const rawTotalGold = baseSubtotal + bonusGoldFromCriticalVictory
  const multipliedTotalGold = hasFixedGoldAward ? fixedGoldAward : Math.floor(rawTotalGold * safeMultiplier)
  const bonusGoldFromAutoDeck = hasFixedGoldAward ? 0 : Math.max(0, multipliedTotalGold - rawTotalGold)

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
      bonusGoldFromWinStreak,
      bonusGoldFromComboBounty,
      bonusGoldFromCleanVictory,
      bonusGoldFromSecondarySynergy,
      bonusGoldFromCriticalVictory,
      bonusGoldFromAutoDeck,
      criticalVictory,
      droppedCardId,
      droppedCardIds,
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

function resolveCapturedCardIds(
  ownedCardIds: CardId[],
  cpuDeck: CardId[],
  rng: ReturnType<typeof createSeededRng>,
  claimedCpuCardId?: CardId | CardId[],
): CardId[] {
  if (claimedCpuCardId === undefined) {
    return [resolveCapturedCardId(ownedCardIds, cpuDeck, rng)]
  }

  const requestedCardIds = Array.isArray(claimedCpuCardId) ? claimedCpuCardId : [claimedCpuCardId]
  if (requestedCardIds.length === 0) {
    throw new Error('At least one claimed card must be selected.')
  }

  const seen = new Set<CardId>()
  const resolved: CardId[] = []
  for (const cardId of requestedCardIds) {
    if (!cpuDeck.includes(cardId)) {
      throw new Error('Claimed card must belong to the CPU deck.')
    }
    if (seen.has(cardId)) {
      continue
    }
    seen.add(cardId)
    resolved.push(cardId)
  }

  return resolved
}
