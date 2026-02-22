/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useMemo, useState } from 'react'
import { getCpuDeckForMatch, isDeckNameValid, toggleCardInDeck, validateDeck } from '../domain/cards/decks'
import { createMatchRuntime, type MatchRuntime } from '../domain/match/runtimeEcs'
import type { MatchState } from '../domain/match/types'
import { createMatch, resolveMatchResult } from '../domain/match/engine'
import { createResetProfile, loadProfile, saveProfile } from '../domain/progression/profile'
import { createSeededRng } from '../domain/random/seededRng'
import { evaluateAchievements } from '../domain/progression/achievements'
import { applyMatchRewards, type RewardBreakdown } from '../domain/progression/rewards'
import { applyRankRewards, type RankRewardGrant } from '../domain/progression/ranks'
import {
  openOwnedPack as applyOpenPack,
  purchaseShopPack as applyShopPurchase,
  type OpenedPackResult,
  type ShopPackId,
  type ShopPurchaseReceipt,
} from '../domain/progression/shop'
import type { CardId, DeckSlotId, MatchResult, PlayerProfile, RuleSet } from '../domain/types'

interface CurrentMatch {
  state: MatchState
  runtime: MatchRuntime
  cpuDeck: CardId[]
  seed: number
}

export interface LastMatchSummary {
  result: MatchResult
  rewards: RewardBreakdown
  newlyOwnedCards: CardId[]
}

interface GameContextValue {
  profile: PlayerProfile
  currentMatch: CurrentMatch | null
  lastMatchSummary: LastMatchSummary | null
  recentRankRewards: RankRewardGrant[]
  startMatch(deck: CardId[], rules: RuleSet): void
  selectDeckSlot(slotId: DeckSlotId): void
  renameDeckSlot(slotId: DeckSlotId, name: string): { valid: boolean; reason?: string }
  toggleDeckSlotCard(slotId: DeckSlotId, cardId: CardId): void
  setDeckSlotRules(slotId: DeckSlotId, rules: { same: boolean; plus: boolean }): void
  updateCurrentMatch(state: MatchState): void
  finalizeCurrentMatch(): LastMatchSummary
  clearLastMatchSummary(): void
  clearRecentRankRewards(): void
  purchaseShopPack(packId: ShopPackId): ShopPurchaseReceipt
  openOwnedPack(packId: ShopPackId): OpenedPackResult
  addTestGold(amount: number): void
  resetProfile(): void
}

export const GameContext = createContext<GameContextValue | null>(null)

function cloneProfile(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) => ({
      ...slot,
      cards: [...slot.cards],
      rules: { ...slot.rules },
    })) as PlayerProfile['deckSlots'],
    stats: { ...profile.stats },
    achievements: [...profile.achievements],
    rankRewardsClaimed: [...profile.rankRewardsClaimed],
    settings: { ...profile.settings },
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile())
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null)
  const [lastMatchSummary, setLastMatchSummary] = useState<LastMatchSummary | null>(null)
  const [recentRankRewards, setRecentRankRewards] = useState<RankRewardGrant[]>([])

  const commitComputedProfile = useCallback(
    (nextProfile: PlayerProfile, options?: { captureRecentRankRewards?: boolean }) => {
      const applied = applyRankRewards(nextProfile)
      saveProfile(applied.profile)
      setProfile(applied.profile)

      if ((options?.captureRecentRankRewards ?? true) && applied.granted.length > 0) {
        setRecentRankRewards(applied.granted)
      }

      return applied
    },
    [],
  )

  const persistProfileUpdate = useCallback((mutator: (nextProfile: PlayerProfile) => void) => {
    setProfile((existingProfile) => {
      const nextProfile = cloneProfile(existingProfile)
      mutator(nextProfile)
      const applied = applyRankRewards(nextProfile)
      saveProfile(applied.profile)
      return applied.profile
    })
  }, [])

  const value = useMemo<GameContextValue>(
    () => ({
      profile,
      currentMatch,
      lastMatchSummary,
      recentRankRewards,
      startMatch: (deck, rules) => {
        const validation = validateDeck(deck, profile.ownedCardIds)
        if (!validation.valid) {
          throw new Error(validation.reason)
        }

        const cpuDeck = getCpuDeckForMatch(profile.stats.played)
        const seed = Date.now()
        const state = createMatch({
          playerDeck: [...deck],
          cpuDeck,
          rules,
          seed,
        })

        const runtime = createMatchRuntime(state)

        setCurrentMatch({ state, runtime, cpuDeck, seed })
      },
      selectDeckSlot: (slotId) => {
        persistProfileUpdate((nextProfile) => {
          nextProfile.selectedDeckSlotId = slotId
        })
      },
      renameDeckSlot: (slotId, name) => {
        const validation = isDeckNameValid(name)
        if (!validation.valid) {
          return validation
        }

        persistProfileUpdate((nextProfile) => {
          const slot = nextProfile.deckSlots.find((entry) => entry.id === slotId)
          if (!slot) {
            return
          }
          slot.name = name.trim()
        })

        return { valid: true }
      },
      toggleDeckSlotCard: (slotId, cardId) => {
        persistProfileUpdate((nextProfile) => {
          const slot = nextProfile.deckSlots.find((entry) => entry.id === slotId)
          if (!slot) {
            return
          }
          slot.cards = toggleCardInDeck(slot.cards, cardId)
        })
      },
      setDeckSlotRules: (slotId, rules) => {
        persistProfileUpdate((nextProfile) => {
          const slot = nextProfile.deckSlots.find((entry) => entry.id === slotId)
          if (!slot) {
            return
          }
          slot.rules = {
            same: rules.same,
            plus: rules.plus,
          }

          const unlocked = evaluateAchievements(nextProfile)
          if (unlocked.length > 0) {
            nextProfile.achievements.push(...unlocked)
          }
        })
      },
      updateCurrentMatch: (state) => {
        setCurrentMatch((existing) => {
          if (!existing) {
            throw new Error('No active match to update.')
          }
          existing.runtime.syncFromState(state)
          return { ...existing, state }
        })
      },
      finalizeCurrentMatch: () => {
        if (!currentMatch) {
          throw new Error('No active match to finalize.')
        }

        const result = resolveMatchResult(currentMatch.state)
        const progression = applyMatchRewards(profile, result, currentMatch.cpuDeck, currentMatch.seed + currentMatch.state.turns)
        const committed = commitComputedProfile(progression.profile, { captureRecentRankRewards: true })

        const summary: LastMatchSummary = {
          result,
          rewards: {
            ...progression.rewards,
            rankRewards: committed.granted,
          },
          newlyOwnedCards: progression.newlyOwnedCards,
        }

        setLastMatchSummary(summary)
        setCurrentMatch(null)

        return summary
      },
      clearLastMatchSummary: () => {
        setLastMatchSummary(null)
      },
      clearRecentRankRewards: () => {
        setRecentRankRewards([])
      },
      purchaseShopPack: (packId) => {
        const progression = applyShopPurchase(profile, packId)
        const committed = commitComputedProfile(progression.profile, { captureRecentRankRewards: true })
        return {
          ...progression.receipt,
          goldRemaining: committed.profile.gold,
          packCountAfter: committed.profile.packInventoryByRarity[packId],
        }
      },
      openOwnedPack: (packId) => {
        const progression = applyOpenPack(profile, packId, createSeededRng(Date.now()))
        commitComputedProfile(progression.profile, { captureRecentRankRewards: true })
        return progression.opened
      },
      addTestGold: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Gold amount must be positive.')
        }

        const nextProfile = cloneProfile(profile)
        nextProfile.gold += Math.floor(amount)
        commitComputedProfile(nextProfile, { captureRecentRankRewards: true })
      },
      resetProfile: () => {
        const next = createResetProfile()
        saveProfile(next)
        setProfile(next)
        setCurrentMatch(null)
        setLastMatchSummary(null)
        setRecentRankRewards([])
      },
    }),
    [
      commitComputedProfile,
      currentMatch,
      lastMatchSummary,
      persistProfileUpdate,
      profile,
      recentRankRewards,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
