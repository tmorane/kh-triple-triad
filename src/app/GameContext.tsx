/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useMemo, useState } from 'react'
import { isDeckNameValid, toggleCardInDeck, validateDeck } from '../domain/cards/decks'
import { resolveDeckTypeSynergy } from '../domain/cards/typeSynergy'
import {
  buildAutoPlayerDeck,
  buildCpuOpponent,
  buildCpuOpponentForLevel,
  getOpponentLevelForProfile,
  type CpuOpponent,
  type OpponentLevel,
} from '../domain/match/opponents'
import { getModeSpec } from '../domain/match/modeSpec'
import { createMatchRuntime, type MatchRuntime } from '../domain/match/runtimeEcs'
import type { MatchState } from '../domain/match/types'
import { createMatch, resolveMatchResult } from '../domain/match/engine'
import { resolveStartingTurn } from '../domain/match/startingTurn'
import {
  createResetProfile,
  createStoredProfile as createStoredProfileInStorage,
  deleteStoredProfile as deleteStoredProfileInStorage,
  isPlayerNameValid,
  listStoredProfiles,
  loadProfile,
  saveProfile,
  switchStoredProfile as switchStoredProfileInStorage,
  type StoredProfilesSnapshot,
} from '../domain/progression/profile'
import { createSeededRng } from '../domain/random/seededRng'
import { evaluateAchievements } from '../domain/progression/achievements'
import { applyMatchMissions } from '../domain/progression/missions'
import { applyMatchRewards, type RewardBreakdown } from '../domain/progression/rewards'
import { applyRankedMatchResult, type RankedMatchResultSummary } from '../domain/progression/ranked'
import {
  openOwnedPack as applyOpenPack,
  openOwnedPacks as applyOpenPacks,
  purchaseAndOpenSpecialPack as applySpecialPackPurchase,
  purchaseShopPacks as applyBulkShopPurchase,
  purchaseShopPack as applyShopPurchase,
  type OpenedPackBatchResult,
  type OpenedSpecialPackResult,
  type OpenedPackResult,
  type SpecialPackPurchaseRequest,
  type ShopBulkPurchaseReceipt,
  type ShopPackId,
  type ShopPurchaseReceipt,
} from '../domain/progression/shop'
import type { CardId, DeckSlotId, MatchMode, MatchQueue, MatchResult, PlayerProfile, RuleSet } from '../domain/types'

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
  storedProfiles: StoredProfilesSnapshot
  currentMatch: CurrentMatch | null
  lastMatchSummary: LastMatchSummary | null
  startMatch(
    queue: MatchQueue,
    mode: MatchMode,
    deck: CardId[],
    rules: RuleSet,
    options?: { useAutoDeck?: boolean; normalOpponentLevel?: OpponentLevel },
  ): void
  selectDeckSlot(slotId: DeckSlotId): void
  renamePlayer(name: string): { valid: boolean; reason?: string }
  renameDeckSlot(slotId: DeckSlotId, name: string): { valid: boolean; reason?: string }
  toggleDeckSlotCard(slotId: DeckSlotId, cardId: CardId, mode: MatchMode): void
  setDeckSlotMode(slotId: DeckSlotId, mode: MatchMode): void
  setDeckSlotRules(slotId: DeckSlotId, rules: { same: boolean; plus: boolean }): void
  updateCurrentMatch(state: MatchState): void
  finalizeCurrentMatch(claimedCpuCardId?: CardId): LastMatchSummary
  clearLastMatchSummary(): void
  purchaseShopPack(packId: ShopPackId): ShopPurchaseReceipt
  purchaseShopPacks?(packId: ShopPackId, quantity: number): ShopBulkPurchaseReceipt
  openOwnedPack(packId: ShopPackId): OpenedPackResult
  openOwnedPacks?(packId: ShopPackId, quantity: number): OpenedPackBatchResult
  buySpecialPack(request: SpecialPackPurchaseRequest): OpenedSpecialPackResult
  addTestGold(amount: number): void
  createStoredProfile(name: string): { valid: boolean; reason?: string }
  switchStoredProfile(profileId: string): void
  deleteStoredProfile(profileId: string): { valid: boolean; reason?: string }
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
    ranked: {
      ...profile.ranked,
      resultStreak: { ...profile.ranked.resultStreak },
    },
    settings: { ...profile.settings },
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

  const storedProfiles: StoredProfilesSnapshot = listStoredProfiles()

  const value = useMemo<GameContextValue>(
    () => ({
      profile,
      storedProfiles,
      currentMatch,
      lastMatchSummary,
      startMatch: (queue, mode, deck, rules, options) => {
        const modeSpec = getModeSpec(mode)
        const useAutoDeck = options?.useAutoDeck ?? false
        const requestedNormalOpponentLevel = options?.normalOpponentLevel
        const ownedUniqueCount = new Set(profile.ownedCardIds).size
        if (useAutoDeck && ownedUniqueCount < modeSpec.deckSize) {
          throw new Error(`Auto Deck requires at least ${modeSpec.deckSize} owned cards for ${mode}.`)
        }

        if (!useAutoDeck) {
          const validation = validateDeck(deck, profile.ownedCardIds, mode)
          if (!validation.valid) {
            throw new Error(validation.reason)
          }
        }

        const referenceDeck =
          deck.length === modeSpec.deckSize ? deck : profile.ownedCardIds.slice(0, modeSpec.deckSize)
        if (referenceDeck.length !== modeSpec.deckSize) {
          throw new Error('Unable to determine a reference deck for CPU matching.')
        }

        const seed = Date.now()
        const maxNormalOpponentLevel = getOpponentLevelForProfile(profile)
        const normalOpponentLevel = requestedNormalOpponentLevel ?? maxNormalOpponentLevel
        if (queue === 'normal' && (normalOpponentLevel < 1 || normalOpponentLevel > maxNormalOpponentLevel)) {
          throw new Error(
            `Normal opponent level L${normalOpponentLevel} is locked. Maximum available is L${maxNormalOpponentLevel}.`,
          )
        }

        const opponent =
          queue === 'ranked'
            ? buildCpuOpponent(profile, referenceDeck, seed, mode)
            : buildCpuOpponentForLevel(normalOpponentLevel, referenceDeck, seed, mode)
        const cpuDeck = [...opponent.deck]
        const playerDeck = useAutoDeck ? buildAutoPlayerDeck(opponent.scoreRange, seed + 1, mode, profile.ownedCardIds) : [...deck]
        const playerSynergy = resolveDeckTypeSynergy(playerDeck)
        const cpuSynergy = resolveDeckTypeSynergy(cpuDeck)
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
          mode,
          rules: effectiveRules,
          seed,
          startingTurn,
          typeSynergy: {
            player: {
              primaryTypeId: playerSynergy.primaryTypeId,
              secondaryTypeId: playerSynergy.secondaryTypeId,
            },
            cpu: {
              primaryTypeId: cpuSynergy.primaryTypeId,
              secondaryTypeId: cpuSynergy.secondaryTypeId,
            },
          },
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
      toggleDeckSlotCard: (slotId, cardId, mode) => {
        persistProfileUpdate((nextProfile) => {
          const slot = nextProfile.deckSlots.find((entry) => entry.id === slotId)
          if (!slot) {
            return
          }
          if (mode === '4x4') {
            slot.cards4x4 = toggleCardInDeck(slot.cards4x4, cardId, getModeSpec(mode).deckSize)
            return
          }
          slot.cards = toggleCardInDeck(slot.cards, cardId, getModeSpec(mode).deckSize)
        })
      },
      setDeckSlotMode: (slotId, mode) => {
        persistProfileUpdate((nextProfile) => {
          const slot = nextProfile.deckSlots.find((entry) => entry.id === slotId)
          if (!slot) {
            return
          }
          slot.mode = mode
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
      finalizeCurrentMatch: (claimedCpuCardId) => {
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
          claimedCpuCardId,
        )

        const missionProgression = applyMatchMissions(
          progression.profile,
          {
            winner: result.winner,
            playerPrimarySynergyActive: Boolean(result.typeSynergy?.player.primaryTypeId),
            playerSecondarySynergyActive: Boolean(result.typeSynergy?.player.secondaryTypeId),
            playerSamePlusTriggers: result.metrics?.samePlusTriggersByActor.player ?? 0,
            playerCornerPlays: result.metrics?.cornerPlaysByActor.player ?? 0,
          },
          currentMatch.seed + currentMatch.state.turns + 1,
        )

        let nextProfile = missionProgression.profile
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
      purchaseShopPacks: (packId, quantity) => {
        const progression = applyBulkShopPurchase(profile, packId, quantity)
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
      openOwnedPacks: (packId, quantity) => {
        const progression = applyOpenPacks(profile, packId, quantity, createSeededRng(Date.now()))
        commitComputedProfile(progression.profile)
        return progression.opened
      },
      buySpecialPack: (request) => {
        const progression = applySpecialPackPurchase(profile, request, createSeededRng(Date.now()))
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
      createStoredProfile: (name) => {
        const result = createStoredProfileInStorage(name)
        if (!result.valid || !result.profile) {
          return { valid: false, reason: result.reason }
        }

        setProfile(result.profile)
        setCurrentMatch(null)
        setLastMatchSummary(null)

        return { valid: true }
      },
      switchStoredProfile: (profileId) => {
        const nextProfile = switchStoredProfileInStorage(profileId)
        setProfile(nextProfile)
        setCurrentMatch(null)
        setLastMatchSummary(null)
      },
      deleteStoredProfile: (profileId) => {
        const result = deleteStoredProfileInStorage(profileId)
        if (!result.valid || !result.profile) {
          return { valid: false, reason: result.reason }
        }

        setProfile(result.profile)
        setCurrentMatch(null)
        setLastMatchSummary(null)

        return { valid: true }
      },
      resetProfile: () => {
        const next = createResetProfile()
        saveProfile(next)
        setProfile(next)
        setCurrentMatch(null)
        setLastMatchSummary(null)
      },
    }),
    [commitComputedProfile, currentMatch, lastMatchSummary, persistProfileUpdate, profile, storedProfiles],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
