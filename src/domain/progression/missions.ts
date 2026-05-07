import { cardPool } from '../cards/cardPool'
import { createSeededRng } from '../random/seededRng'
import type { CardId, MatchQueue, MissionId, MissionReward, PlayerProfile } from '../types'
import { cloneMissionProgressMap, createMissionProgress, missionDefinitions, missionIds } from './missionCatalog'
import { evaluateAchievements } from './achievements'

export { createInitialMissionsProgress } from './missionCatalog'

export interface MatchMissionMetrics {
  queue: MatchQueue
  winner: 'player' | 'cpu' | 'draw'
  openRuleEnabled: boolean
  playerCornerPlays: number
}

export interface MatchMissionsResult {
  profile: PlayerProfile
  completedMissionIds: MissionId[]
  readyToClaimMissionIds: MissionId[]
}

export interface ClaimCompletedMissionResult {
  profile: PlayerProfile
  claimed: boolean
}

export interface CardsAcquiredMissionsResult {
  profile: PlayerProfile
  completedMissionIds: MissionId[]
}

export function applyMatchMissions(
  profile: PlayerProfile,
  metrics: MatchMissionMetrics,
  seed: number,
): MatchMissionsResult {
  void seed
  const nextProfile = cloneProfile(profile)
  const completedMissionIds: MissionId[] = []
  const readyToClaimMissionIds: MissionId[] = []
  const isEligibleQueue = metrics.queue === 'normal' || metrics.queue === 'ranked'

  if (!isEligibleQueue) {
    return {
      profile: nextProfile,
      completedMissionIds,
      readyToClaimMissionIds,
    }
  }

  for (const missionId of missionIds) {
    const mission = nextProfile.missions[missionId]
    const previousProgress = mission.progress
    const previousCompleted = mission.completed
    applyMissionDelta(missionId, mission, metrics)

    const target = mission.target
    if (!mission.completed && mission.progress >= target) {
      mission.completed = true
    }

    if (!previousCompleted && mission.completed) {
      completedMissionIds.push(missionId)
      nextProfile.achievementProgress.missionsCompleted += 1
    }

    const becameClaimable = !previousCompleted && mission.completed && !mission.claimed && previousProgress < target
    if (becameClaimable) {
      readyToClaimMissionIds.push(missionId)
    }
  }

  const unlocked = evaluateAchievements(nextProfile)
  if (unlocked.length > 0) {
    nextProfile.achievements.push(...unlocked)
  }

  return {
    profile: nextProfile,
    completedMissionIds,
    readyToClaimMissionIds,
  }
}

export function applyCardsAcquiredMissions(
  profile: PlayerProfile,
  cardsAcquiredDelta: number,
): CardsAcquiredMissionsResult {
  if (!Number.isInteger(cardsAcquiredDelta) || cardsAcquiredDelta <= 0) {
    return { profile, completedMissionIds: [] }
  }

  const nextProfile = cloneProfile(profile)
  const mission = nextProfile.missions.b3_collection_hunter
  const previousCompleted = mission.completed
  mission.progress = Math.min(mission.target, mission.progress + cardsAcquiredDelta)

  if (!mission.completed && mission.progress >= mission.target) {
    mission.completed = true
  }

  const completedMissionIds = !previousCompleted && mission.completed ? (['b3_collection_hunter'] as MissionId[]) : []
  if (completedMissionIds.length > 0) {
    nextProfile.achievementProgress.missionsCompleted += 1
  }

  const unlocked = evaluateAchievements(nextProfile)
  if (unlocked.length > 0) {
    nextProfile.achievements.push(...unlocked)
  }

  return { profile: nextProfile, completedMissionIds }
}

export function claimCompletedMission(
  profile: PlayerProfile,
  missionId: MissionId,
  seed: number,
): ClaimCompletedMissionResult {
  const currentMission = profile.missions[missionId]
  if (!currentMission.completed) {
    return { profile, claimed: false }
  }

  const nextProfile = cloneProfile(profile)
  const mission = nextProfile.missions[missionId]
  const rewardAlreadyGrantedBeforeReset = nextProfile.missionRewardsGrantedById[missionId] === true

  if (!mission.claimed && !rewardAlreadyGrantedBeforeReset) {
    const rng = createSeededRng(seed)
    applyMissionReward(nextProfile, missionDefinitions[missionId].reward, rng)
  }

  if (rewardAlreadyGrantedBeforeReset) {
    delete nextProfile.missionRewardsGrantedById[missionId]
  }

  nextProfile.missions[missionId] = createMissionProgress(missionId)

  const unlocked = evaluateAchievements(nextProfile)
  if (unlocked.length > 0) {
    nextProfile.achievements.push(...unlocked)
  }

  return {
    profile: nextProfile,
    claimed: true,
  }
}

function applyMissionDelta(missionId: MissionId, mission: PlayerProfile['missions'][MissionId], metrics: MatchMissionMetrics): void {
  const isPlayerVictory = metrics.winner === 'player'

  if (missionId === 'm1_type_specialist') {
    if (!isPlayerVictory) {
      return
    }
    mission.progress = Math.min(mission.target, mission.progress + 1)
    return
  }

  if (missionId === 'm2_combo_practitioner') {
    if (metrics.openRuleEnabled) {
      return
    }
    mission.progress = Math.min(mission.target, mission.progress + 1)
    return
  }

  if (missionId === 'm3_corner_tactician') {
    if (metrics.playerCornerPlays <= 0) {
      return
    }
    mission.progress = Math.min(mission.target, mission.progress + metrics.playerCornerPlays)
    return
  }

  if (missionId === 'b1_win_streak') {
    if (mission.completed) {
      return
    }
    if (isPlayerVictory) {
      mission.progress = Math.min(mission.target, mission.progress + 1)
      return
    }
    mission.progress = 0
    mission.completed = false
    mission.claimed = false
    return
  }

  if (missionId === 'b2_match_grinder') {
    mission.progress = Math.min(mission.target, mission.progress + 1)
  }
}

function applyMissionReward(
  profile: PlayerProfile,
  reward: MissionReward,
  rng: ReturnType<typeof createSeededRng>,
) {
  if (reward.kind === 'gold') {
    profile.gold += reward.amount
    profile.achievementProgress.goldEarned += reward.amount
    return
  }

  if (reward.kind === 'pack') {
    profile.packInventoryByRarity[reward.packId] += reward.amount
    return
  }

  const cardId = chooseMissionCard(profile, rng)
  const previousCopies = profile.cardCopiesById[cardId] ?? 0
  if (!profile.ownedCardIds.includes(cardId)) {
    profile.ownedCardIds.push(cardId)
  }
  profile.cardCopiesById[cardId] = previousCopies + 1
  profile.achievementProgress.cardsAcquired += 1
}

function chooseMissionCard(profile: PlayerProfile, rng: ReturnType<typeof createSeededRng>): CardId {
  const nonOwned = cardPool.filter((card) => !profile.ownedCardIds.includes(card.id))
  const source = nonOwned.length > 0 ? nonOwned : cardPool
  return source[rng.nextInt(source.length)]!.id
}

function cloneProfile(profile: PlayerProfile): PlayerProfile {
  return {
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
    tutorialProgress: profile.tutorialProgress
      ? {
          baseCompleted: profile.tutorialProgress.baseCompleted,
          completedElementById: { ...profile.tutorialProgress.completedElementById },
        }
      : undefined,
    towerProgress: profile.towerProgress ? { ...profile.towerProgress } : undefined,
    towerRun: profile.towerRun
      ? {
          ...profile.towerRun,
          deck: [...profile.towerRun.deck],
          relics: { ...profile.towerRun.relics },
          pendingRewards: [...profile.towerRun.pendingRewards],
        }
      : profile.towerRun,
  }
}
