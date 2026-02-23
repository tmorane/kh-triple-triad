import type { PlayerProfile } from '../../domain/types'
import { formatRankLabel, getRankScore } from '../../domain/progression/rankScore'
import { listStoredProfilesForLadder } from '../../domain/progression/profile'
import { getSupabaseClient, isCloudAuthEnabled } from './supabaseClient'

const PLAYER_LADDER_TABLE = 'player_ladder'

interface LadderRow {
  user_id: string
  player_name: string
  owned_cards_count: number
  peak_rank_score: number
  peak_rank_label: string
  updated_at: string
}

interface PlayerPeakRankRow {
  peak_rank_score: number
  peak_rank_label: string
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
  tier: PlayerProfile['ranked']['tier']
  division: PlayerProfile['ranked']['division']
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

const mockLadderEntries = mockLadderSeeds.map((seed) => ({
  userId: seed.userId,
  playerName: seed.playerName,
  ownedCardsCount: seed.ownedCardsCount,
  peakRankScore: getRankScore(seed.tier, seed.division, seed.lp),
  peakRankLabel: formatRankLabel(seed.tier, seed.division),
  updatedAt: seed.updatedAt,
}))

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

function mapLadderRow(row: LadderRow): LadderEntry {
  return {
    userId: row.user_id,
    playerName: row.player_name,
    ownedCardsCount: row.owned_cards_count,
    peakRankScore: row.peak_rank_score,
    peakRankLabel: row.peak_rank_label,
    updatedAt: row.updated_at,
  }
}

async function loadCurrentPeakRank(userId: string): Promise<PlayerPeakRankRow | null> {
  const client = ensureClient()
  const { data, error } = await client
    .from(PLAYER_LADDER_TABLE)
    .select('peak_rank_score, peak_rank_label')
    .eq('user_id', userId)
    .maybeSingle<PlayerPeakRankRow>()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function upsertCloudLadderEntry(userId: string, profile: PlayerProfile): Promise<void> {
  const client = ensureClient()
  const currentRankScore = getRankScore(profile.ranked.tier, profile.ranked.division, profile.ranked.lp)
  const currentRankLabel = formatRankLabel(profile.ranked.tier, profile.ranked.division)

  let peakRankScore = currentRankScore
  let peakRankLabel = currentRankLabel

  const existingPeak = await loadCurrentPeakRank(userId)
  if (existingPeak && existingPeak.peak_rank_score > currentRankScore) {
    peakRankScore = existingPeak.peak_rank_score
    peakRankLabel = existingPeak.peak_rank_label
  }

  const { error } = await client.from(PLAYER_LADDER_TABLE).upsert(
    {
      user_id: userId,
      player_name: profile.playerName,
      owned_cards_count: profile.ownedCardIds.length,
      peak_rank_score: peakRankScore,
      peak_rank_label: peakRankLabel,
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
    .select('user_id, player_name, owned_cards_count, peak_rank_score, peak_rank_label, updated_at')
    .order('owned_cards_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapLadderRow(row as LadderRow))
}

async function fetchPeakRankLadderFromCloud(limit: number): Promise<LadderEntry[]> {
  const client = ensureClient()
  const { data, error } = await client
    .from(PLAYER_LADDER_TABLE)
    .select('user_id, player_name, owned_cards_count, peak_rank_score, peak_rank_label, updated_at')
    .order('peak_rank_score', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => mapLadderRow(row as LadderRow))
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

function mergeRealAndMockEntries(realEntries: LadderEntry[]): LadderEntry[] {
  const mergedByUserId = new Map<string, LadderEntry>()

  for (const entry of mockLadderEntries) {
    mergedByUserId.set(entry.userId, entry)
  }

  for (const entry of realEntries) {
    mergedByUserId.set(entry.userId, entry)
  }

  return [...mergedByUserId.values()]
}

function mapLocalProfileEntriesToLadderEntries(): LadderEntry[] {
  return listStoredProfilesForLadder().map((entry) => ({
    userId: `local-${entry.id}`,
    playerName: entry.playerName,
    ownedCardsCount: entry.ownedCardsCount,
    peakRankScore: getRankScore(entry.ranked.tier, entry.ranked.division, entry.ranked.lp),
    peakRankLabel: formatRankLabel(entry.ranked.tier, entry.ranked.division),
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
  const localEntries = mapLocalProfileEntriesToLadderEntries()
  const baseEntries = isMockLadderEnabled() ? mergeLadderEntries(localEntries, mockLadderEntries) : localEntries

  if (!isCloudAuthEnabled()) {
    return sortOwnedCardsLadder(baseEntries).slice(0, limit)
  }

  try {
    const realEntries = await fetchOwnedCardsLadderFromCloud(limit)
    const withMockAndLocal = isMockLadderEnabled()
      ? mergeLadderEntries(mergeRealAndMockEntries(realEntries), localEntries)
      : mergeLadderEntries(localEntries, realEntries)
    return sortOwnedCardsLadder(withMockAndLocal).slice(0, limit)
  } catch (error) {
    if (baseEntries.length > 0) {
      return sortOwnedCardsLadder(baseEntries).slice(0, limit)
    }
    throw error
  }
}

export async function fetchPeakRankLadder(limit = 50): Promise<LadderEntry[]> {
  const localEntries = mapLocalProfileEntriesToLadderEntries()
  const baseEntries = isMockLadderEnabled() ? mergeLadderEntries(localEntries, mockLadderEntries) : localEntries

  if (!isCloudAuthEnabled()) {
    return sortPeakRankLadder(baseEntries).slice(0, limit)
  }

  try {
    const realEntries = await fetchPeakRankLadderFromCloud(limit)
    const withMockAndLocal = isMockLadderEnabled()
      ? mergeLadderEntries(mergeRealAndMockEntries(realEntries), localEntries)
      : mergeLadderEntries(localEntries, realEntries)
    return sortPeakRankLadder(withMockAndLocal).slice(0, limit)
  } catch (error) {
    if (baseEntries.length > 0) {
      return sortPeakRankLadder(baseEntries).slice(0, limit)
    }
    throw error
  }
}
