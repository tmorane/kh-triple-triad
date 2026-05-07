import type { MissionId, MissionProgress, MissionReward } from '../types'

export type MissionRuleKind =
  | 'wins'
  | 'hidden_matches'
  | 'corner_plays'
  | 'strict_win_streak'
  | 'matches_played'
  | 'cards_acquired'

export interface MissionDefinition {
  id: MissionId
  title: string
  description: string
  target: number
  reward: MissionReward
  rule: MissionRuleKind
}

export const missionDefinitions: Record<MissionId, MissionDefinition> = {
  m1_type_specialist: {
    id: 'm1_type_specialist',
    title: 'Spécialiste des victoires',
    description: 'Gagner 5 matchs (Normal ou Classé).',
    target: 5,
    reward: { kind: 'gold', amount: 120 },
    rule: 'wins',
  },
  m2_combo_practitioner: {
    id: 'm2_combo_practitioner',
    title: 'Main cachée',
    description: 'Jouer 6 matchs en mode Hidden (Normal ou Classé).',
    target: 6,
    reward: { kind: 'pack', packId: 'rare', amount: 1 },
    rule: 'hidden_matches',
  },
  m3_corner_tactician: {
    id: 'm3_corner_tactician',
    title: 'Tacticien des coins',
    description: 'Poser 12 cartes dans les cases de coin.',
    target: 12,
    reward: { kind: 'card', strategy: 'prefer_non_owned' },
    rule: 'corner_plays',
  },
  b1_win_streak: {
    id: 'b1_win_streak',
    title: 'Série brûlante',
    description: 'Atteindre 5 victoires d affilée.',
    target: 5,
    reward: { kind: 'gold', amount: 80 },
    rule: 'strict_win_streak',
  },
  b2_match_grinder: {
    id: 'b2_match_grinder',
    title: 'Grinder du plateau',
    description: 'Jouer 25 matchs (Normal ou Classé).',
    target: 25,
    reward: { kind: 'pack', packId: 'common', amount: 1 },
    rule: 'matches_played',
  },
  b3_collection_hunter: {
    id: 'b3_collection_hunter',
    title: 'Chasseur de collection',
    description: 'Obtenir 30 cartes (toutes sources).',
    target: 30,
    reward: { kind: 'pack', packId: 'uncommon', amount: 1 },
    rule: 'cards_acquired',
  },
}

export const missionIds: MissionId[] = [
  'm1_type_specialist',
  'm2_combo_practitioner',
  'm3_corner_tactician',
  'b1_win_streak',
  'b2_match_grinder',
  'b3_collection_hunter',
]

export function createMissionProgress(missionId: MissionId): MissionProgress {
  const definition = missionDefinitions[missionId]
  return {
    id: missionId,
    progress: 0,
    target: definition.target,
    completed: false,
    claimed: false,
  }
}

export function createInitialMissionsProgress(): Record<MissionId, MissionProgress> {
  const entries = missionIds.map((missionId) => [missionId, createMissionProgress(missionId)] as const)
  return Object.fromEntries(entries) as Record<MissionId, MissionProgress>
}

export function cloneMissionProgressMap(missions: Record<MissionId, MissionProgress>): Record<MissionId, MissionProgress> {
  const entries = missionIds.map((missionId) => [missionId, { ...missions[missionId] }] as const)
  return Object.fromEntries(entries) as Record<MissionId, MissionProgress>
}
