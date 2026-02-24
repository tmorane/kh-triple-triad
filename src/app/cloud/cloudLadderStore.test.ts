import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  fetchOwnedCardsLadder,
  fetchPeakRankLadder,
  isGlobalLadderEnabled,
  isMockLadderEnabled,
} from './cloudLadderStore'
import * as supabaseClient from './supabaseClient'

interface LocalProfileLadderEntryMock {
  id: string
  playerName: string
  ownedCardsCount: number
  rankedByMode: {
    '3x3': { tier: string; division: string | null; lp: number }
    '4x4': { tier: string; division: string | null; lp: number }
  }
  updatedAt: string
}

const { listStoredProfilesForLadderMock } = vi.hoisted(() => ({
  listStoredProfilesForLadderMock: vi.fn<() => LocalProfileLadderEntryMock[]>(() => []),
}))

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => null),
  isCloudAuthEnabled: vi.fn(() => false),
}))

vi.mock('../../domain/progression/profile', () => ({
  listStoredProfilesForLadder: listStoredProfilesForLadderMock,
}))

interface LadderRow {
  user_id: string
  player_name: string
  owned_cards_count: number
  peak_rank_score_3x3: number
  peak_rank_label_3x3: string
  peak_rank_score_4x4: number
  peak_rank_label_4x4: string
  updated_at: string
}

function createQueryResult(rows: LadderRow[], error: { message: string } | null = null) {
  const query = {
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: rows, error })),
  }
  return query
}

function createClient(rowsBySort: {
  owned: LadderRow[]
  peak: LadderRow[]
  ownedError?: { message: string } | null
  peakError?: { message: string } | null
}) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => {
        const ownedQuery = createQueryResult(rowsBySort.owned, rowsBySort.ownedError ?? null)
        const peakQuery = createQueryResult(rowsBySort.peak, rowsBySort.peakError ?? null)
        const order = vi.fn((field: string) => {
          if (field === 'owned_cards_count') {
            return ownedQuery
          }
          if (field === 'peak_rank_score_3x3' || field === 'peak_rank_score_4x4') {
            return peakQuery
          }
          return ownedQuery
        })

        return {
          order,
        }
      }),
    })),
  }
}

describe('cloudLadderStore mock ladder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_ENABLE_MOCK_LADDER', '')
    vi.mocked(supabaseClient.isCloudAuthEnabled).mockReturnValue(false)
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue(null)
    listStoredProfilesForLadderMock.mockReturnValue([])
  })

  test('enables global ladder when local profiles exist (without cloud and without mock)', () => {
    listStoredProfilesForLadderMock.mockReturnValue([
      {
        id: 'local-1',
        playerName: 'LocalHero',
        ownedCardsCount: 44,
        rankedByMode: {
          '3x3': { tier: 'silver', division: 'I', lp: 22 },
          '4x4': { tier: 'silver', division: 'I', lp: 22 },
        },
        updatedAt: '2026-02-20T08:00:00.000Z',
      },
    ])

    expect(isMockLadderEnabled()).toBe(false)
    expect(isGlobalLadderEnabled()).toBe(true)
  })

  test('returns local ladders when cloud is disabled and mock is disabled', async () => {
    listStoredProfilesForLadderMock.mockReturnValue([
      {
        id: 'local-1',
        playerName: 'LocalHero',
        ownedCardsCount: 44,
        rankedByMode: {
          '3x3': { tier: 'silver', division: 'I', lp: 22 },
          '4x4': { tier: 'silver', division: 'I', lp: 22 },
        },
        updatedAt: '2026-02-20T08:00:00.000Z',
      },
      {
        id: 'local-2',
        playerName: 'LocalLegend',
        ownedCardsCount: 67,
        rankedByMode: {
          '3x3': { tier: 'gold', division: 'II', lp: 75 },
          '4x4': { tier: 'gold', division: 'II', lp: 75 },
        },
        updatedAt: '2026-02-21T08:00:00.000Z',
      },
    ])

    const owned = await fetchOwnedCardsLadder(50)
    const peak = await fetchPeakRankLadder('4x4', 50)

    expect(owned).toHaveLength(2)
    expect(owned[0]?.playerName).toBe('LocalLegend')
    expect(peak).toHaveLength(2)
    expect(peak[0]?.playerName).toBe('LocalLegend')
  })

  test('merges cloud + local ladders when cloud is enabled and mock is disabled', async () => {
    listStoredProfilesForLadderMock.mockReturnValue([
      {
        id: 'local-1',
        playerName: 'LocalHero',
        ownedCardsCount: 44,
        rankedByMode: {
          '3x3': { tier: 'silver', division: 'I', lp: 22 },
          '4x4': { tier: 'silver', division: 'I', lp: 22 },
        },
        updatedAt: '2026-02-20T08:00:00.000Z',
      },
    ])
    vi.mocked(supabaseClient.isCloudAuthEnabled).mockReturnValue(true)
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue(
      createClient({
        owned: [
          {
            user_id: 'real-u01',
            player_name: 'CloudPlayer',
            owned_cards_count: 140,
            peak_rank_score_3x3: 4000,
            peak_rank_label_3x3: 'Platinum III',
            peak_rank_score_4x4: 4000,
            peak_rank_label_4x4: 'Platinum III',
            updated_at: '2026-02-24T12:00:00.000Z',
          },
        ],
        peak: [
          {
            user_id: 'real-u01',
            player_name: 'CloudPlayer',
            owned_cards_count: 140,
            peak_rank_score_3x3: 4000,
            peak_rank_label_3x3: 'Platinum III',
            peak_rank_score_4x4: 4000,
            peak_rank_label_4x4: 'Platinum III',
            updated_at: '2026-02-24T12:00:00.000Z',
          },
        ],
      }) as never,
    )

    const owned = await fetchOwnedCardsLadder(50)
    const peak = await fetchPeakRankLadder('4x4', 50)

    expect(owned).toHaveLength(2)
    expect(owned[0]?.playerName).toBe('CloudPlayer')
    expect(owned[1]?.playerName).toBe('LocalHero')
    expect(peak).toHaveLength(2)
    expect(peak.some((entry) => entry.playerName === 'LocalHero')).toBe(true)
  })

  test('enables mock/global ladder flags from env', () => {
    vi.stubEnv('VITE_ENABLE_MOCK_LADDER', 'true')
    expect(isMockLadderEnabled()).toBe(true)
    expect(isGlobalLadderEnabled()).toBe(true)
  })

  test('returns mock ladders when mock is enabled and cloud is disabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK_LADDER', 'true')

    const owned = await fetchOwnedCardsLadder(50)
    const peak = await fetchPeakRankLadder('4x4', 50)

    expect(owned).toHaveLength(10)
    expect(peak).toHaveLength(10)
    expect(owned[0]?.playerName).toBe('Sora')
    expect(peak[0]?.playerName).toBe('Sora')
  })

  test('merges real + mock data with global sort when mock mode is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK_LADDER', 'true')
    vi.mocked(supabaseClient.isCloudAuthEnabled).mockReturnValue(true)
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue(
      createClient({
        owned: [
          {
            user_id: 'real-u01',
            player_name: 'CloudPlayer',
            owned_cards_count: 200,
            peak_rank_score_3x3: 4000,
            peak_rank_label_3x3: 'Platinum III',
            peak_rank_score_4x4: 4000,
            peak_rank_label_4x4: 'Platinum III',
            updated_at: '2026-02-24T12:00:00.000Z',
          },
        ],
        peak: [
          {
            user_id: 'real-u02',
            player_name: 'RankBoss',
            owned_cards_count: 80,
            peak_rank_score_3x3: 9099,
            peak_rank_label_3x3: 'Challenger',
            peak_rank_score_4x4: 9099,
            peak_rank_label_4x4: 'Challenger',
            updated_at: '2026-02-24T12:00:00.000Z',
          },
        ],
      }) as never,
    )

    const owned = await fetchOwnedCardsLadder(50)
    const peak = await fetchPeakRankLadder('4x4', 50)

    expect(owned).toHaveLength(11)
    expect(owned[0]?.playerName).toBe('CloudPlayer')
    expect(owned.some((entry) => entry.playerName === 'Sora')).toBe(true)

    expect(peak).toHaveLength(11)
    expect(peak[0]?.playerName).toBe('RankBoss')
    expect(peak.some((entry) => entry.playerName === 'Sora')).toBe(true)
  })

  test('falls back to mock ladders when cloud query fails and mock mode is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK_LADDER', 'true')
    vi.mocked(supabaseClient.isCloudAuthEnabled).mockReturnValue(true)
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue(
      createClient({
        owned: [],
        peak: [],
        ownedError: { message: 'boom owned' },
        peakError: { message: 'boom peak' },
      }) as never,
    )

    const owned = await fetchOwnedCardsLadder(50)
    const peak = await fetchPeakRankLadder('4x4', 50)

    expect(owned).toHaveLength(10)
    expect(peak).toHaveLength(10)
    expect(owned[0]?.playerName).toBe('Sora')
    expect(peak[0]?.playerName).toBe('Sora')
  })

  test('applies limit after merge + sort', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK_LADDER', '1')
    vi.mocked(supabaseClient.isCloudAuthEnabled).mockReturnValue(true)
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue(
      createClient({
        owned: [
          {
            user_id: 'real-u01',
            player_name: 'CloudPlayer',
            owned_cards_count: 220,
            peak_rank_score_3x3: 3800,
            peak_rank_label_3x3: 'Gold I',
            peak_rank_score_4x4: 3800,
            peak_rank_label_4x4: 'Gold I',
            updated_at: '2026-02-24T12:00:00.000Z',
          },
        ],
        peak: [
          {
            user_id: 'real-u02',
            player_name: 'PeakOne',
            owned_cards_count: 90,
            peak_rank_score_3x3: 9099,
            peak_rank_label_3x3: 'Challenger',
            peak_rank_score_4x4: 9099,
            peak_rank_label_4x4: 'Challenger',
            updated_at: '2026-02-24T12:00:00.000Z',
          },
        ],
      }) as never,
    )

    const owned = await fetchOwnedCardsLadder(3)
    const peak = await fetchPeakRankLadder('4x4', 3)

    expect(owned).toHaveLength(3)
    expect(owned[0]?.playerName).toBe('CloudPlayer')
    expect(peak).toHaveLength(3)
    expect(peak[0]?.playerName).toBe('PeakOne')
  })
})
