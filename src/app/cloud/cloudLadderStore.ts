import type { MatchMode, PlayerProfile } from '../../domain/types'
import { formatRankLabel, getRankScore } from '../../domain/progression/rankScore'
import { listStoredProfilesForLadder } from '../../domain/progression/profile'
import { getSupabaseClient, isCloudAuthEnabled } from './supabaseClient'

const PLAYER_LADDER_TABLE = 'player_ladder'
const DEFAULT_RANK_LABEL = 'Iron IV'

const peakRankScoreFieldByMode: Record<MatchMode, 'peak_rank_score_3x3' | 'peak_rank_score_4x4'> = {
  '3x3': 'peak_rank_score_3x3',
  '4x4': 'peak_rank_score_4x4',
}

const peakRankLabelFieldByMode: Record<MatchMode, 'peak_rank_label_3x3' | 'peak_rank_label_4x4'> = {
  '3x3': 'peak_rank_label_3x3',
  '4x4': 'peak_rank_label_4x4',
}

interface LadderRow {
  user_id: string
  player_name: string
  owned_cards_count: number
  peak_rank_score_3x3?: number | null
  peak_rank_label_3x3?: string | null
  peak_rank_score_4x4?: number | null
  peak_rank_label_4x4?: string | null
  updated_at: string
}

interface PlayerPeakRanksRow {
  peak_rank_score_3x3?: number | null
  peak_rank_label_3x3?: string | null
  peak_rank_score_4x4?: number | null
  peak_rank_label_4x4?: string | null
}

export interface LadderEntry {
  userId: string
  playerName: string
  ownedCardsCount: number
  peakRankScore: number
  peakRankLabel: string
  updatedAt: string
}

interface MockLadderSeed {
  userId: string
  playerName: string
  ownedCardsCount: number
  tier: PlayerProfile['rankedByMode']['4x4']['tier']
  division: PlayerProfile['rankedByMode']['4x4']['division']
  lp: number
  updatedAt: string
}

const mockEnabledValues = new Set(['true', '1'])
const mockLadderSeeds: MockLadderSeed[] = [
  { userId: 'mock-u01', playerName: 'Naminé', ownedCardsCount: 34, tier: 'iron', division: 'III', lp: 47, updatedAt: '2026-02-10T08:00:00.000Z' },
  { userId: 'mock-u02', playerName: 'Lea', ownedCardsCount: 48, tier: 'bronze', division: 'I', lp: 62, updatedAt: '2026-02-11T08:00:00.000Z' },
  { userId: 'mock-u03', playerName: 'Xion', ownedCardsCount: 61, tier: 'silver', division: 'II', lp: 50, updatedAt: '2026-02-12T08:00:00.000Z' },
  { userId: 'mock-u04', playerName: 'Ventus', ownedCardsCount: 76, tier: 'gold', division: 'I', lp: 18, updatedAt: '2026-02-13T08:00:00.000Z' },
  { userId: 'mock-u05', playerName: 'Terra', ownedCardsCount: 88, tier: 'platinum', division: 'II', lp: 40, updatedAt: '2026-02-14T08:00:00.000Z' },
  { userId: 'mock-u06', playerName: 'Roxas', ownedCardsCount: 101, tier: 'emerald', division: 'I', lp: 24, updatedAt: '2026-02-15T08:00:00.000Z' },
  { userId: 'mock-u07', playerName: 'Kairi', ownedCardsCount: 116, tier: 'diamond', division: 'I', lp: 53, updatedAt: '2026-02-16T08:00:00.000Z' },
  { userId: 'mock-u08', playerName: 'Aqua', ownedCardsCount: 127, tier: 'master', division: null, lp: 37, updatedAt: '2026-02-17T08:00:00.000Z' },
  { userId: 'mock-u09', playerName: 'Riku', ownedCardsCount: 139, tier: 'grandmaster', division: null, lp: 71, updatedAt: '2026-02-18T08:00:00.000Z' },
  { userId: 'mock-u10', playerName: 'Sora', ownedCardsCount: 152, tier: 'challenger', division: null, lp: 85, updatedAt: '2026-02-19T08:00:00.000Z' },
]

const mockLadderEntriesByMode: Record<MatchMode, LadderEntry[]> = {
  '3x3': mockLadderSeeds.map((seed) => ({
    userId: seed.userId,
    playerName: seed.playerName,
    ownedCardsCount: seed.ownedCardsCount,
    peakRankScore: getRankScore(seed.tier, seed.division, seed.lp),
    peakRankLabel: formatRankLabel(seed.tier, seed.division),
    updatedAt: seed.updatedAt,
  })),
  '4x4': mockLadderSeeds.map((seed) => ({
    userId: seed.userId,
    playerName: seed.playerName,
    ownedCardsCount: seed.ownedCardsCount,
    peakRankScore: getRankScore(seed.tier, seed.division, seed.lp),
    peakRankLabel: formatRankLabel(seed.tier, seed.division),
    updatedAt: seed.updatedAt,
  })),
}

export function isMockLadderEnabled(): boolean {
  const value = import.meta.env.VITE_ENABLE_MOCK_LADDER
  if (typeof value !== 'string') {
    return false
  }

  return mockEnabledValues.has(value.trim().toLowerCase())
}

export function isGlobalLadderEnabled(): boolean {
  return isCloudAuthEnabled() || isMockLadderEnabled() || listStoredProfilesForLadder().length > 0
}

function ensureClient() {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Cloud auth is disabled. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return client
}

function normalizePeakRank(score: unknown, label: unknown): { score: number; label: string } {
  const normalizedScore = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0
  const normalizedLabel = typeof label === 'string' && label.trim().length > 0 ? label : DEFAULT_RANK_LABEL

  return {
    score: normalizedScore,
    label: normalizedLabel,
  }
}

function resolvePeakRankForMode(row: LadderRow, mode: MatchMode): { score: number; label: string } {
  const scoreField = peakRankScoreFieldByMode[mode]
  const labelField = peakRankLabelFieldByMode[mode]
  return normalizePeakRank(row[scoreField], row[labelField])
}

function resolveBestPeakRank(row: LadderRow): { score: number; label: string } {
  const peak3x3 = resolvePeakRankForMode(row, '3x3')
  const peak4x4 = resolvePeakRankForMode(row, '4x4')
  return peak3x3.score >= peak4x4.score ? peak3x3 : peak4x4
}

function mapLadderRowForOwnedCards(row: LadderRow): LadderEntry {
  const bestPeak = resolveBestPeakRank(row)

  return {
    userId: row.user_id,
    playerName: row.player_name,
    ownedCardsCount: row.owned_cards_count,
    peakRankScore: bestPeak.score,
    peakRankLabel: bestPeak.label,
    updatedAt: row.updated_at,
  }
}

function mapLadderRowForPeakMode(row: LadderRow, mode: MatchMode): LadderEntry {
  const peak = resolvePeakRankForMode(row, mode)

  return {
    userId: row.user_id,
    playerName: row.player_name,
    ownedCardsCount: row.owned_cards_count,
    peakRankScore: peak.score,
    peakRankLabel: peak.label,
    updatedAt: row.updated_at,
  }
}

async function loadCurrentPeakRanks(userId: string): Promise<PlayerPeakRanksRow | null> {
  const client = ensureClient()
  const { data, error } = await client
    .from(PLAYER_LADDER_TABLE)
    .select('peak_rank_score_3x3, peak_rank_label_3x3, peak_rank_score_4x4, peak_rank_label_4x4')
    .eq('user_id', userId)
    .maybeSingle<PlayerPeakRanksRow>()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function upsertCloudLadderEntry(userId: string, profile: PlayerProfile): Promise<void> {
  const client = ensureClient()

  const currentPeakByMode: Record<MatchMode, { score: number; label: string }> = {
    '3x3': {
      score: getRankScore(
        profile.rankedByMode['3x3'].tier,
        profile.rankedByMode['3x3'].division,
        profile.rankedByMode['3x3'].lp,
      ),
      label: formatRankLabel(profile.rankedByMode['3x3'].tier, profile.rankedByMode['3x3'].division),
    },
    '4x4': {
      score: getRankScore(
        profile.rankedByMode['4x4'].tier,
        profile.rankedByMode['4x4'].division,
        profile.rankedByMode['4x4'].lp,
      ),
      label: formatRankLabel(profile.rankedByMode['4x4'].tier, profile.rankedByMode['4x4'].division),
    },
  }

  const peakByMode = {
    '3x3': { ...currentPeakByMode['3x3'] },
    '4x4': { ...currentPeakByMode['4x4'] },
  }

  const existingPeak = await loadCurrentPeakRanks(userId)
  if (existingPeak) {
    const existing3x3 = normalizePeakRank(existingPeak.peak_rank_score_3x3, existingPeak.peak_rank_label_3x3)
    const existing4x4 = normalizePeakRank(existingPeak.peak_rank_score_4x4, existingPeak.peak_rank_label_4x4)

    if (existing3x3.score > currentPeakByMode['3x3'].score) {
      peakByMode['3x3'] = existing3x3
    }

    if (existing4x4.score > currentPeakByMode['4x4'].score) {
      peakByMode['4x4'] = existing4x4
    }
  }

  const { error } = await client.from(PLAYER_LADDER_TABLE).upsert(
    {
      user_id: userId,
      player_name: profile.playerName,
      owned_cards_count: profile.ownedCardIds.length,
      peak_rank_score_3x3: peakByMode['3x3'].score,
      peak_rank_label_3x3: peakByMode['3x3'].label,
      peak_rank_score_4x4: peakByMode['4x4'].score,
      peak_rank_label_4x4: peakByMode['4x4'].label,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    throw new Error(error.message)
  }
}

async function fetchOwnedCardsLadderFromCloud(limit: number): Promise<LadderEntry[]> {
  const client = ensureClient()
  const { data, error } = await client
    .from(PLAYER_LADDER_TABLE)
    .select('user_id, player_name, owned_cards_count, peak_rank_score_3x3, peak_rank_label_3x3, peak_rank_score_4x4, peak_rank_label_4x4, updated_at')
    .order('owned_cards_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapLadderRowForOwnedCards(row as LadderRow))
}

async function fetchPeakRankLadderFromCloud(mode: MatchMode, limit: number): Promise<LadderEntry[]> {
  const scoreField = peakRankScoreFieldByMode[mode]
  const client = ensureClient()
  const { data, error } = await client
    .from(PLAYER_LADDER_TABLE)
    .select('user_id, player_name, owned_cards_count, peak_rank_score_3x3, peak_rank_label_3x3, peak_rank_score_4x4, peak_rank_label_4x4, updated_at')
    .order(scoreField, { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapLadderRowForPeakMode(row as LadderRow, mode))
}

function compareIsoDateDesc(a: string, b: string): number {
  if (a === b) {
    return 0
  }

  return a > b ? -1 : 1
}

function sortOwnedCardsLadder(entries: LadderEntry[]): LadderEntry[] {
  return [...entries].sort(
    (left, right) =>
      right.ownedCardsCount - left.ownedCardsCount || compareIsoDateDesc(left.updatedAt, right.updatedAt),
  )
}

function sortPeakRankLadder(entries: LadderEntry[]): LadderEntry[] {
  return [...entries].sort(
    (left, right) => right.peakRankScore - left.peakRankScore || compareIsoDateDesc(left.updatedAt, right.updatedAt),
  )
}

function mapLocalProfileEntriesToOwnedLadderEntries(): LadderEntry[] {
  return listStoredProfilesForLadder().map((entry) => {
    const peak3x3 = {
      score: getRankScore(entry.rankedByMode['3x3'].tier, entry.rankedByMode['3x3'].division, entry.rankedByMode['3x3'].lp),
      label: formatRankLabel(entry.rankedByMode['3x3'].tier, entry.rankedByMode['3x3'].division),
    }
    const peak4x4 = {
      score: getRankScore(entry.rankedByMode['4x4'].tier, entry.rankedByMode['4x4'].division, entry.rankedByMode['4x4'].lp),
      label: formatRankLabel(entry.rankedByMode['4x4'].tier, entry.rankedByMode['4x4'].division),
    }
    const bestPeak = peak3x3.score >= peak4x4.score ? peak3x3 : peak4x4

    return {
      userId: `local-${entry.id}`,
      playerName: entry.playerName,
      ownedCardsCount: entry.ownedCardsCount,
      peakRankScore: bestPeak.score,
      peakRankLabel: bestPeak.label,
      updatedAt: entry.updatedAt,
    }
  })
}

function mapLocalProfileEntriesToPeakLadderEntries(mode: MatchMode): LadderEntry[] {
  return listStoredProfilesForLadder().map((entry) => ({
    userId: `local-${entry.id}`,
    playerName: entry.playerName,
    ownedCardsCount: entry.ownedCardsCount,
    peakRankScore: getRankScore(entry.rankedByMode[mode].tier, entry.rankedByMode[mode].division, entry.rankedByMode[mode].lp),
    peakRankLabel: formatRankLabel(entry.rankedByMode[mode].tier, entry.rankedByMode[mode].division),
    updatedAt: entry.updatedAt,
  }))
}

function mergeLadderEntries(...entryLists: LadderEntry[][]): LadderEntry[] {
  const mergedByUserId = new Map<string, LadderEntry>()

  for (const entries of entryLists) {
    for (const entry of entries) {
      mergedByUserId.set(entry.userId, entry)
    }
  }

  return [...mergedByUserId.values()]
}

export async function fetchOwnedCardsLadder(limit = 50): Promise<LadderEntry[]> {
  const localEntries = mapLocalProfileEntriesToOwnedLadderEntries()
  const mockEntries = isMockLadderEnabled() ? mockLadderEntriesByMode['4x4'] : []
  const baseEntries = mergeLadderEntries(localEntries, mockEntries)

  if (!isCloudAuthEnabled()) {
    return sortOwnedCardsLadder(baseEntries).slice(0, limit)
  }

  try {
    const realEntries = await fetchOwnedCardsLadderFromCloud(limit)
    const withMockAndLocal = mergeLadderEntries(localEntries, mockEntries, realEntries)
    return sortOwnedCardsLadder(withMockAndLocal).slice(0, limit)
  } catch (error) {
    if (baseEntries.length > 0) {
      return sortOwnedCardsLadder(baseEntries).slice(0, limit)
    }
    throw error
  }
}

export async function fetchPeakRankLadder(mode: MatchMode, limit = 50): Promise<LadderEntry[]> {
  const localEntries = mapLocalProfileEntriesToPeakLadderEntries(mode)
  const mockEntries = isMockLadderEnabled() ? mockLadderEntriesByMode[mode] : []
  const baseEntries = mergeLadderEntries(localEntries, mockEntries)

  if (!isCloudAuthEnabled()) {
    return sortPeakRankLadder(baseEntries).slice(0, limit)
  }

  try {
    const realEntries = await fetchPeakRankLadderFromCloud(mode, limit)
    const withMockAndLocal = mergeLadderEntries(localEntries, mockEntries, realEntries)
    return sortPeakRankLadder(withMockAndLocal).slice(0, limit)
  } catch (error) {
    if (baseEntries.length > 0) {
      return sortPeakRankLadder(baseEntries).slice(0, limit)
    }
    throw error
  }
}
