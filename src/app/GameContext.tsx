/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useMemo, useState } from 'react'
import { getCpuDeckForMatch, isDeckNameValid, toggleCardInDeck, validateDeck } from '../domain/cards/decks'
import {
  buildAutoPlayerDeck,
  computeDeckScore,
  getCpuOpponentPreview,
  type CpuOpponent,
  type CpuOpponentPreview,
} from '../domain/match/opponents'
import { createMatchRuntime, type MatchRuntime } from '../domain/match/runtimeEcs'
import type { MatchState } from '../domain/match/types'
import { createMatch, resolveMatchResult } from '../domain/match/engine'
import { resolveStartingTurn } from '../domain/match/startingTurn'
import { createResetProfile, isPlayerNameValid, loadProfile, saveProfile } from '../domain/progression/profile'
import { createSeededRng } from '../domain/random/seededRng'
import { evaluateAchievements } from '../domain/progression/achievements'
import { applyMatchRewards, type RewardBreakdown } from '../domain/progression/rewards'
import { applyRankedMatchResult, type RankedMatchResultSummary } from '../domain/progression/ranked'
import {
  openOwnedPack as applyOpenPack,
  purchaseShopPack as applyShopPurchase,
  type OpenedPackResult,
  type ShopPackId,
  type ShopPurchaseReceipt,
} from '../domain/progression/shop'
import type { CardId, DeckSlotId, MatchQueue, MatchResult, PlayerProfile, RuleSet } from '../domain/types'

interface CurrentMatch {
  state: MatchState
  runtime: MatchRuntime
  queue: MatchQueue
  cpuDeck: CardId[]
  seed: number
  opponent: CpuOpponent
  rewardMultiplier: number
  usedAutoDeck: boolean
}

export interface MatchOpponentSummary {
  level: CpuOpponent['level']
  aiProfile: CpuOpponent['aiProfile']
  scoreRange: CpuOpponent['scoreRange']
  deckScore: CpuOpponent['deckScore']
  winGoldBonus: CpuOpponent['winGoldBonus']
}

export interface LastMatchSummary {
  queue: MatchQueue
  result: MatchResult
  rewards: RewardBreakdown
  newlyOwnedCards: CardId[]
  opponent: MatchOpponentSummary
  rankedUpdate: RankedMatchResultSummary | null
}

interface GameContextValue {
  profile: PlayerProfile
  currentMatch: CurrentMatch | null
  lastMatchSummary: LastMatchSummary | null
  startMatch(queue: MatchQueue, deck: CardId[], rules: RuleSet, options?: { useAutoDeck?: boolean }): void
  selectDeckSlot(slotId: DeckSlotId): void
  renamePlayer(name: string): { valid: boolean; reason?: string }
  renameDeckSlot(slotId: DeckSlotId, name: string): { valid: boolean; reason?: string }
  toggleDeckSlotCard(slotId: DeckSlotId, cardId: CardId): void
  setDeckSlotRules(slotId: DeckSlotId, rules: { same: boolean; plus: boolean }): void
  updateCurrentMatch(state: MatchState): void
  finalizeCurrentMatch(): LastMatchSummary
  clearLastMatchSummary(): void
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
    ranked: {
      ...profile.ranked,
      resultStreak: { ...profile.ranked.resultStreak },
    },
    settings: { ...profile.settings },
  }
}

function createOpponentFromPreview(preview: CpuOpponentPreview, deck: CardId[]): CpuOpponent {
  return {
    ...preview,
    deck,
    deckScore: computeDeckScore(deck),
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile())
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null)
  const [lastMatchSummary, setLastMatchSummary] = useState<LastMatchSummary | null>(null)

  const commitComputedProfile = useCallback((nextProfile: PlayerProfile) => {
    saveProfile(nextProfile)
    setProfile(nextProfile)
    return nextProfile
  }, [])

  const persistProfileUpdate = useCallback((mutator: (nextProfile: PlayerProfile) => void) => {
    setProfile((existingProfile) => {
      const nextProfile = cloneProfile(existingProfile)
      mutator(nextProfile)
      saveProfile(nextProfile)
      return nextProfile
    })
  }, [])

  const value = useMemo<GameContextValue>(
    () => ({
      profile,
      currentMatch,
      lastMatchSummary,
      startMatch: (queue, deck, rules, options) => {
        const useAutoDeck = options?.useAutoDeck ?? false
        if (!useAutoDeck) {
          const validation = validateDeck(deck, profile.ownedCardIds)
          if (!validation.valid) {
            throw new Error(validation.reason)
          }
        }

        const referenceDeck = deck.length === 5 ? deck : profile.ownedCardIds.slice(0, 5)
        if (referenceDeck.length !== 5) {
          throw new Error('Unable to determine a reference deck for CPU matching.')
        }

        const queueMatchIndex = queue === 'ranked' ? profile.ranked.matchesPlayed : profile.stats.played
        const seed = Date.now()
        const cpuDeck = getCpuDeckForMatch(queueMatchIndex)
        const opponentPreview = getCpuOpponentPreview(profile, referenceDeck)
        const opponent = createOpponentFromPreview(opponentPreview, cpuDeck)
        const playerDeck = useAutoDeck ? buildAutoPlayerDeck(opponent.scoreRange, seed + 1) : [...deck]
        const startingTurn = resolveStartingTurn(seed)
        const rewardMultiplier = useAutoDeck ? 1.5 : 1
        const effectiveRules: RuleSet =
          queue === 'ranked'
            ? {
                open: true,
                same: false,
                plus: false,
              }
            : {
                open: true,
                same: rules.same,
                plus: rules.plus,
              }

        const state = createMatch({
          playerDeck,
          cpuDeck,
          rules: effectiveRules,
          seed,
          startingTurn,
        })

        const runtime = createMatchRuntime(state)

        setCurrentMatch({
          state,
          runtime,
          queue,
          cpuDeck,
          seed,
          opponent,
          rewardMultiplier,
          usedAutoDeck: useAutoDeck,
        })
      },
      selectDeckSlot: (slotId) => {
        persistProfileUpdate((nextProfile) => {
          nextProfile.selectedDeckSlotId = slotId
        })
      },
      renamePlayer: (name) => {
        const validation = isPlayerNameValid(name)
        if (!validation.valid) {
          return validation
        }

        persistProfileUpdate((nextProfile) => {
          nextProfile.playerName = name.trim()
        })

        return { valid: true }
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
        const progression = applyMatchRewards(
          profile,
          result,
          currentMatch.cpuDeck,
          currentMatch.seed + currentMatch.state.turns,
          currentMatch.opponent.level,
          currentMatch.rewardMultiplier,
        )

        let nextProfile = progression.profile
        let rankedUpdate: RankedMatchResultSummary | null = null

        if (currentMatch.queue === 'ranked') {
          rankedUpdate = applyRankedMatchResult(nextProfile.ranked, result.winner)
          nextProfile = {
            ...nextProfile,
            ranked: rankedUpdate.next,
          }
        }

        commitComputedProfile(nextProfile)

        const summary: LastMatchSummary = {
          queue: currentMatch.queue,
          result,
          rewards: progression.rewards,
          newlyOwnedCards: progression.newlyOwnedCards,
          opponent: {
            level: currentMatch.opponent.level,
            aiProfile: currentMatch.opponent.aiProfile,
            scoreRange: { ...currentMatch.opponent.scoreRange },
            deckScore: currentMatch.opponent.deckScore,
            winGoldBonus: currentMatch.opponent.winGoldBonus,
          },
          rankedUpdate,
        }

        setLastMatchSummary(summary)
        setCurrentMatch(null)

        return summary
      },
      clearLastMatchSummary: () => {
        setLastMatchSummary(null)
      },
      purchaseShopPack: (packId) => {
        const progression = applyShopPurchase(profile, packId)
        const committed = commitComputedProfile(progression.profile)
        return {
          ...progression.receipt,
          goldRemaining: committed.gold,
          packCountAfter: committed.packInventoryByRarity[packId],
        }
      },
      openOwnedPack: (packId) => {
        const progression = applyOpenPack(profile, packId, createSeededRng(Date.now()))
        commitComputedProfile(progression.profile)
        return progression.opened
      },
      addTestGold: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Gold amount must be positive.')
        }

        const nextProfile = cloneProfile(profile)
        nextProfile.gold += Math.floor(amount)
        commitComputedProfile(nextProfile)
      },
      resetProfile: () => {
        const next = createResetProfile()
        saveProfile(next)
        setProfile(next)
        setCurrentMatch(null)
        setLastMatchSummary(null)
      },
    }),
    [commitComputedProfile, currentMatch, lastMatchSummary, persistProfileUpdate, profile],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
