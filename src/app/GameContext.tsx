/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useMemo, useRef, useState } from 'react'
import { isDeckNameValid, toggleCardInDeck, validateDeck } from '../domain/cards/decks'
import {
  buildAutoPlayerDeck,
  buildCpuOpponent,
  buildCpuOpponentForLevel,
  MAX_NORMAL_OPPONENT_LEVEL,
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
import { craftShinyCard as applyShinyCraft } from '../domain/progression/shiny'
import { resolveTowerFloorSpec } from '../domain/tower/floorPlan'
import { resolveTowerRelicEffects } from '../domain/tower/relics'
import { applyTowerCheckpointRewards } from '../domain/tower/rewards'
import { createInitialTowerProgress, createTowerRun, describeTowerPostMatch, queueTowerRewardsForFloor, selectTowerReward } from '../domain/tower/run'
import type { TowerMatchSummary, TowerProgressState, TowerRunState } from '../domain/tower/types'
import {
  openOwnedPack as applyOpenPack,
  openOwnedPacks as applyOpenPacks,
  openShinyTestPack as applyShinyTestPack,
  purchaseAndOpenSpecialPack as applySpecialPackPurchase,
  purchaseShopPacks as applyBulkShopPurchase,
  purchaseShopPack as applyShopPurchase,
  type OpenedPackBatchResult,
  type OpenedShinyTestPackResult,
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
  tower?: {
    floor: number
    checkpointFloor: number
    boss: boolean
    relics: TowerRunState['relics']
  }
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
  rankedMode: MatchMode | null
  rankedUpdate: RankedMatchResultSummary | null
  tower?: TowerMatchSummary
}

interface GameContextValue {
  profile: PlayerProfile
  storedProfiles: StoredProfilesSnapshot
  currentMatch: CurrentMatch | null
  lastMatchSummary: LastMatchSummary | null
  towerProgress?: TowerProgressState
  towerRun?: TowerRunState | null
  startMatch(
    queue: MatchQueue,
    mode: MatchMode,
    deck: CardId[],
    rules: RuleSet,
    options?: { useAutoDeck?: boolean; normalOpponentLevel?: OpponentLevel },
  ): void
  startTowerRun?(): void
  resumeTowerRun?(): void
  continueTowerRun?(): void
  selectTowerReward?(choiceId: string, swapOutCardId?: CardId): void
  abandonCurrentMatch?(): void
  abandonTowerRun?(): void
  selectDeckSlot(slotId: DeckSlotId): void
  renamePlayer(name: string): { valid: boolean; reason?: string }
  setAudioEnabled(enabled: boolean): void
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
  openShinyTestPack?(): OpenedShinyTestPackResult
  buySpecialPack(request: SpecialPackPurchaseRequest): OpenedSpecialPackResult
  craftShinyCard?(cardId: CardId): void
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

function resolveProfileTowerProgress(profile: PlayerProfile): TowerProgressState {
  return profile.towerProgress ?? createInitialTowerProgress()
}

function resolveProfileTowerRun(profile: PlayerProfile): TowerRunState | null {
  return profile.towerRun ?? null
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile())
  const profileRef = useRef<PlayerProfile>(profile)
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null)
  const [lastMatchSummary, setLastMatchSummary] = useState<LastMatchSummary | null>(null)
  const towerProgress = resolveProfileTowerProgress(profile)
  const towerRun = resolveProfileTowerRun(profile)

  const commitComputedProfile = useCallback((nextProfile: PlayerProfile) => {
    profileRef.current = nextProfile
    saveProfile(nextProfile)
    setProfile(nextProfile)
    return nextProfile
  }, [])

  const persistProfileUpdate = useCallback((mutator: (nextProfile: PlayerProfile) => void) => {
    setProfile((existingProfile) => {
      const nextProfile = cloneProfile(existingProfile)
      mutator(nextProfile)
      profileRef.current = nextProfile
      saveProfile(nextProfile)
      return nextProfile
    })
  }, [])

  const storedProfiles: StoredProfilesSnapshot = listStoredProfiles()

  const value = useMemo<GameContextValue>(() => {
    const startPreparedMatch = ({
      queue,
      mode,
      playerDeck,
      cpuDeck,
      rules,
      seed,
      startingTurn,
      opponent,
      rewardMultiplier,
      usedAutoDeck,
      tower,
    }: {
      queue: MatchQueue
      mode: MatchMode
      playerDeck: CardId[]
      cpuDeck: CardId[]
      rules: RuleSet
      seed: number
      startingTurn: 'player' | 'cpu'
      opponent: CpuOpponent
      rewardMultiplier: number
      usedAutoDeck: boolean
      tower?: CurrentMatch['tower']
    }) => {
      const state = createMatch({
        playerDeck,
        cpuDeck,
        mode,
        rules,
        seed,
        startingTurn,
        typeSynergy: {
          player: {
            primaryTypeId: null,
            secondaryTypeId: null,
          },
          cpu: {
            primaryTypeId: null,
            secondaryTypeId: null,
          },
        },
        enableElementPowers: true,
        strictPowerTargeting: true,
      })

      const runtime = createMatchRuntime(state)

      setCurrentMatch({
        state,
        runtime,
        queue,
        cpuDeck: [...cpuDeck],
        seed,
        opponent,
        rewardMultiplier,
        usedAutoDeck,
        tower,
      })
    }

    const startTowerMatch = (run: TowerRunState, sourceProfile: PlayerProfile) => {
      const floorSpec = resolveTowerFloorSpec(run.floor)
      const relicEffects = resolveTowerRelicEffects(run.relics)
      const scoreReduction = floorSpec.boss ? relicEffects.bossScoreReduction : relicEffects.nonBossScoreReduction
      const adjustedScoreBonus = Math.max(0, floorSpec.scoreBonus + relicEffects.scoreBonusModifier - scoreReduction)
      const seed = Date.now()
      const level = Math.max(1, Math.min(8, floorSpec.opponentLevel)) as OpponentLevel
      const opponent = buildCpuOpponentForLevel(level, run.deck, seed, '4x4', { scoreBonus: adjustedScoreBonus })
      const rewardMultiplier = Number((floorSpec.rewardMultiplier * relicEffects.goldMultiplier).toFixed(2))
      const startingTurn = relicEffects.forcePlayerStart ? 'player' : resolveStartingTurn(seed)

      startPreparedMatch({
        queue: 'tower',
        mode: '4x4',
        playerDeck: [...run.deck],
        cpuDeck: [...opponent.deck],
        rules: floorSpec.rules,
        seed,
        startingTurn,
        opponent,
        rewardMultiplier,
        usedAutoDeck: false,
        tower: {
          floor: run.floor,
          checkpointFloor: run.checkpointFloor,
          boss: floorSpec.boss,
          relics: { ...run.relics },
        },
      })

      const profileWithTowerState: PlayerProfile = {
        ...sourceProfile,
        towerProgress: resolveProfileTowerProgress(sourceProfile),
        towerRun: run,
      }
      commitComputedProfile(profileWithTowerState)
      setLastMatchSummary(null)
    }

    return {
      profile,
      storedProfiles,
      currentMatch,
      lastMatchSummary,
      towerProgress,
      towerRun,
      startMatch: (queue, mode, deck, rules, options) => {
        if (queue === 'tower') {
          throw new Error('Tower matches must be started via startTowerRun/resumeTowerRun.')
        }

        const activeProfile = profileRef.current
        const modeSpec = getModeSpec(mode)
        const useAutoDeck = options?.useAutoDeck ?? false
        const requestedNormalOpponentLevel = options?.normalOpponentLevel
        const ownedUniqueCount = new Set(activeProfile.ownedCardIds).size
        if (useAutoDeck && ownedUniqueCount < modeSpec.deckSize) {
          throw new Error(`Auto Deck requires at least ${modeSpec.deckSize} owned cards for ${mode}.`)
        }

        if (!useAutoDeck) {
          const validation = validateDeck(deck, activeProfile.ownedCardIds, mode)
          if (!validation.valid) {
            throw new Error(validation.reason)
          }
        }

        const referenceDeck = deck.length === modeSpec.deckSize ? deck : activeProfile.ownedCardIds.slice(0, modeSpec.deckSize)
        if (referenceDeck.length !== modeSpec.deckSize) {
          throw new Error('Unable to determine a reference deck for CPU matching.')
        }

        const seed = Date.now()
        const rankedOpponentLevel = getOpponentLevelForProfile(activeProfile, mode)
        const normalOpponentLevel = requestedNormalOpponentLevel ?? rankedOpponentLevel
        if (queue === 'normal' && (normalOpponentLevel < 1 || normalOpponentLevel > MAX_NORMAL_OPPONENT_LEVEL)) {
          throw new Error(`Normal opponent level must be between L1 and L${MAX_NORMAL_OPPONENT_LEVEL}. Received L${normalOpponentLevel}.`)
        }

        const opponent =
          queue === 'ranked'
            ? buildCpuOpponent(activeProfile, referenceDeck, seed, mode)
            : buildCpuOpponentForLevel(normalOpponentLevel, referenceDeck, seed, mode)
        const cpuDeck = [...opponent.deck]
        const playerDeck = useAutoDeck ? buildAutoPlayerDeck(opponent.scoreRange, seed + 1, mode, activeProfile.ownedCardIds) : [...deck]
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

        startPreparedMatch({
          queue,
          mode,
          playerDeck,
          cpuDeck,
          rules: effectiveRules,
          seed,
          startingTurn: resolveStartingTurn(seed),
          opponent,
          rewardMultiplier,
          usedAutoDeck: useAutoDeck,
        })
      },
      startTowerRun: () => {
        const selectedDeckSlot = profile.deckSlots.find((slot) => slot.id === profile.selectedDeckSlotId)
        if (!selectedDeckSlot) {
          throw new Error('No selected deck slot found.')
        }

        const deck = [...selectedDeckSlot.cards4x4]
        const validation = validateDeck(deck, profile.ownedCardIds, '4x4')
        if (!validation.valid) {
          throw new Error(validation.reason)
        }

        const run = createTowerRun(deck, towerProgress, Date.now())
        startTowerMatch(run, profile)
      },
      resumeTowerRun: () => {
        if (!towerRun) {
          throw new Error('No active tower run to resume.')
        }
        if (towerRun.pendingRewards.length > 0) {
          throw new Error('Select pending tower rewards before resuming the run.')
        }

        startTowerMatch(towerRun, profile)
      },
      continueTowerRun: () => {
        if (!towerRun) {
          throw new Error('No active tower run to continue.')
        }
        if (towerRun.pendingRewards.length > 0) {
          throw new Error('Select pending tower rewards before starting the next floor.')
        }

        startTowerMatch(towerRun, profile)
      },
      selectTowerReward: (choiceId, swapOutCardId) => {
        if (!towerRun) {
          throw new Error('No active tower run.')
        }

        const nextRun = selectTowerReward(towerRun, choiceId, swapOutCardId)
        const nextProfile = cloneProfile(profile)
        nextProfile.towerProgress = towerProgress
        nextProfile.towerRun = nextRun
        commitComputedProfile(nextProfile)

        setLastMatchSummary((existingSummary) => {
          if (!existingSummary?.tower) {
            return existingSummary
          }
          return {
            ...existingSummary,
            tower: {
              ...existingSummary.tower,
              pendingReward: nextRun.pendingRewards[0] ?? null,
            },
          }
        })
      },
      abandonCurrentMatch: () => {
        if (currentMatch?.queue === 'tower') {
          const nextProfile = cloneProfile(profile)
          nextProfile.towerProgress = towerProgress
          nextProfile.towerRun = null
          commitComputedProfile(nextProfile)
          setLastMatchSummary((existingSummary) => (existingSummary?.queue === 'tower' ? null : existingSummary))
        }
        setCurrentMatch(null)
      },
      abandonTowerRun: () => {
        const nextProfile = cloneProfile(profile)
        nextProfile.towerProgress = towerProgress
        nextProfile.towerRun = null
        commitComputedProfile(nextProfile)

        if (currentMatch?.queue === 'tower') {
          setCurrentMatch(null)
        }

        setLastMatchSummary((existingSummary) => (existingSummary?.queue === 'tower' ? null : existingSummary))
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
      setAudioEnabled: (enabled) => {
        persistProfileUpdate((nextProfile) => {
          nextProfile.settings.audioEnabled = enabled
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
          { disableCardCapture: currentMatch.queue === 'tower' },
        )

        const missionProgression = applyMatchMissions(
          progression.profile,
          {
            winner: result.winner,
            playerPrimarySynergyActive: false,
            playerSecondarySynergyActive: false,
            playerSamePlusTriggers: result.metrics?.samePlusTriggersByActor.player ?? 0,
            playerCornerPlays: result.metrics?.cornerPlaysByActor.player ?? 0,
          },
          currentMatch.seed + currentMatch.state.turns + 1,
        )

        let nextProfile = missionProgression.profile
        let rankedMode: MatchMode | null = null
        let rankedUpdate: RankedMatchResultSummary | null = null
        let towerSummary: TowerMatchSummary | undefined

        if (currentMatch.queue === 'ranked') {
          const rankedModeForMatch = currentMatch.state.config.mode
          rankedMode = rankedModeForMatch
          rankedUpdate = applyRankedMatchResult(nextProfile.rankedByMode[rankedModeForMatch], result.winner)
          nextProfile = {
            ...nextProfile,
            rankedByMode: {
              ...nextProfile.rankedByMode,
              [rankedModeForMatch]: rankedUpdate.next,
            },
          }
        }

        if (currentMatch.queue === 'tower') {
          const activeTowerRun = resolveProfileTowerRun(nextProfile)
          if (!activeTowerRun || !currentMatch.tower) {
            throw new Error('Tower run state is missing for tower match finalization.')
          }

          const towerProgressState = resolveProfileTowerProgress(nextProfile)
          const towerResult = describeTowerPostMatch(activeTowerRun, towerProgressState, result.winner)
          const relicEffects = resolveTowerRelicEffects(activeTowerRun.relics)
          const completedFloor = currentMatch.tower.floor

          nextProfile = {
            ...nextProfile,
            towerProgress: towerResult.nextProgress,
            towerRun: towerResult.nextRun,
          }

          if (towerResult.checkpointReached || towerResult.status === 'cleared') {
            const checkpointReward = applyTowerCheckpointRewards(nextProfile, completedFloor, relicEffects.checkpointPackBonus)
            nextProfile = checkpointReward.profile
          }

          if (towerResult.status === 'continue' && towerResult.nextRun) {
            const queuedRun = queueTowerRewardsForFloor(towerResult.nextRun, completedFloor)
            nextProfile = {
              ...nextProfile,
              towerRun: queuedRun,
            }
            towerSummary = {
              floor: completedFloor,
              checkpointFloor: towerResult.nextProgress.checkpointFloor,
              status: 'continue',
              pendingReward: queuedRun.pendingRewards[0] ?? null,
              nextFloor: queuedRun.floor,
            }
          } else {
            towerSummary = {
              floor: completedFloor,
              checkpointFloor: towerResult.nextProgress.checkpointFloor,
              status: towerResult.status,
              pendingReward: null,
              nextFloor: null,
            }
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
          rankedMode,
          rankedUpdate,
          tower: towerSummary,
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
      openShinyTestPack: () => {
        const progression = applyShinyTestPack(profile, createSeededRng(Date.now()))
        commitComputedProfile(progression.profile)
        return progression.opened
      },
      buySpecialPack: (request) => {
        const progression = applySpecialPackPurchase(profile, request, createSeededRng(Date.now()))
        commitComputedProfile(progression.profile)
        return progression.opened
      },
      craftShinyCard: (cardId) => {
        const crafted = applyShinyCraft(profile, cardId)
        commitComputedProfile(crafted)
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

        profileRef.current = result.profile
        setProfile(result.profile)
        setCurrentMatch(null)
        setLastMatchSummary(null)

        return { valid: true }
      },
      switchStoredProfile: (profileId) => {
        const nextProfile = switchStoredProfileInStorage(profileId)
        profileRef.current = nextProfile
        setProfile(nextProfile)
        setCurrentMatch(null)
        setLastMatchSummary(null)
      },
      deleteStoredProfile: (profileId) => {
        const result = deleteStoredProfileInStorage(profileId)
        if (!result.valid || !result.profile) {
          return { valid: false, reason: result.reason }
        }

        profileRef.current = result.profile
        setProfile(result.profile)
        setCurrentMatch(null)
        setLastMatchSummary(null)

        return { valid: true }
      },
      resetProfile: () => {
        const next = createResetProfile()
        saveProfile(next)
        profileRef.current = next
        setProfile(next)
        setCurrentMatch(null)
        setLastMatchSummary(null)
      },
    }
  }, [
    commitComputedProfile,
    currentMatch,
    lastMatchSummary,
    persistProfileUpdate,
    profile,
    storedProfiles,
    towerProgress,
    towerRun,
  ])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
