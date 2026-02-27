import { cardPool } from '../cards/cardPool'
import { createSeededRng } from '../random/seededRng'
import type { CardId, MissionId, MissionProgress, MissionReward, PlayerProfile } from '../types'
import { evaluateAchievements } from './achievements'

export interface MatchMissionMetrics {
  winner: 'player' | 'cpu' | 'draw'
  playerPrimarySynergyActive: boolean
  playerSecondarySynergyActive: boolean
  playerSamePlusTriggers: number
  playerCornerPlays: number
}

export interface MatchMissionsResult {
  profile: PlayerProfile
  completedMissionIds: MissionId[]
  claimedMissionIds: MissionId[]
}

interface MissionDefinition {
  id: MissionId
  target: number
  reward: MissionReward
}

const missionDefinitions: Record<MissionId, MissionDefinition> = {
  m1_type_specialist: {
    id: 'm1_type_specialist',
    target: 5,
    reward: { kind: 'gold', amount: 120 },
  },
  m2_combo_practitioner: {
    id: 'm2_combo_practitioner',
    target: 6,
    reward: { kind: 'pack', packId: 'rare', amount: 1 },
  },
  m3_corner_tactician: {
    id: 'm3_corner_tactician',
    target: 12,
    reward: { kind: 'card', strategy: 'prefer_non_owned' },
  },
}

const missionIds: MissionId[] = ['m1_type_specialist', 'm2_combo_practitioner', 'm3_corner_tactician']

export function createInitialMissionsProgress(): Record<MissionId, MissionProgress> {
  return {
    m1_type_specialist: createMissionProgress('m1_type_specialist'),
    m2_combo_practitioner: createMissionProgress('m2_combo_practitioner'),
    m3_corner_tactician: createMissionProgress('m3_corner_tactician'),
  }
}

export function applyMatchMissions(
  profile: PlayerProfile,
  metrics: MatchMissionMetrics,
  seed: number,
): MatchMissionsResult {
  const rng = createSeededRng(seed)
  const nextProfile = cloneProfile(profile)
  const completedMissionIds: MissionId[] = []
  const claimedMissionIds: MissionId[] = []

  for (const missionId of missionIds) {
    const mission = nextProfile.missions[missionId]
    const delta = computeMissionDelta(missionId, metrics)
    if (delta <= 0) {
      continue
    }

    const previousProgress = mission.progress
    const target = mission.target
    mission.progress = Math.min(target, mission.progress + delta)

    if (!mission.completed && mission.progress >= target) {
      mission.completed = true
      completedMissionIds.push(missionId)
    }

    const shouldClaim = mission.completed && !mission.claimed && mission.progress >= target && previousProgress < target
    if (!shouldClaim) {
      continue
    }

    applyMissionReward(nextProfile, missionDefinitions[missionId].reward, rng)
    mission.claimed = true
    claimedMissionIds.push(missionId)
  }

  const unlocked = evaluateAchievements(nextProfile)
  if (unlocked.length > 0) {
    nextProfile.achievements.push(...unlocked)
  }

  return {
    profile: nextProfile,
    completedMissionIds,
    claimedMissionIds,
  }
}

function createMissionProgress(missionId: MissionId): MissionProgress {
  const definition = missionDefinitions[missionId]
  return {
    id: missionId,
    progress: 0,
    target: definition.target,
    completed: false,
    claimed: false,
  }
}

function computeMissionDelta(missionId: MissionId, metrics: MatchMissionMetrics): number {
  const isPlayerVictory = metrics.winner === 'player'

  if (missionId === 'm1_type_specialist') {
    if (!isPlayerVictory) {
      return 0
    }
    return 1
  }

  if (missionId === 'm2_combo_practitioner') {
    if (metrics.playerSamePlusTriggers <= 0) {
      return 0
    }
    return metrics.playerSamePlusTriggers
  }

  if (metrics.playerCornerPlays <= 0) {
    return 0
  }
  return metrics.playerCornerPlays
}

function applyMissionReward(
  profile: PlayerProfile,
  reward: MissionReward,
  rng: ReturnType<typeof createSeededRng>,
) {
  if (reward.kind === 'gold') {
    profile.gold += reward.amount
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
    shinyCardCopiesById: { ...profile.shinyCardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) => ({
      ...slot,
      cards: [...slot.cards],
      cards4x4: [...slot.cards4x4],
      rules: { ...slot.rules },
    })) as PlayerProfile['deckSlots'],
    stats: { ...profile.stats },
    achievements: [...profile.achievements],
    missions: {
      m1_type_specialist: { ...profile.missions.m1_type_specialist },
      m2_combo_practitioner: { ...profile.missions.m2_combo_practitioner },
      m3_corner_tactician: { ...profile.missions.m3_corner_tactician },
    },
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
}
