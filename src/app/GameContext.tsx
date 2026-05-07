/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useMemo, useRef, useState } from 'react'
import { isDeckNameValid, toggleCardInDeck, validateDeck } from '../domain/cards/decks'
import { cardPool } from '../domain/cards/cardPool'
import {
  buildAutoPlayerDeck,
  buildCpuOpponent,
  buildCpuOpponentForLevel,
  computeDeckScore,
  MAX_NORMAL_OPPONENT_LEVEL,
  getCpuOpponentPreviewForLevel,
  getOpponentLevelForProfile,
  type CpuOpponent,
  type OpponentLevel,
} from '../domain/match/opponents'
import { getModeSpec } from '../domain/match/modeSpec'
import { createMatchRuntime, type MatchRuntime } from '../domain/match/runtimeEcs'
import type { MatchState } from '../domain/match/types'
import { createMatch, resolveMatchResult } from '../domain/match/engine'
import { resolveStartingTurn } from '../domain/match/startingTurn'
import { resolveTutorialScenario, type TutorialScenarioId, type TutorialStep } from '../domain/match/tutorialScenarios'
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
import { claimAllAchievementRewards as applyAchievementRewardsClaimAll } from '../domain/progression/achievementRewards'
import { applyCardsAcquiredMissions, applyMatchMissions, claimCompletedMission } from '../domain/progression/missions'
import { cloneMissionProgressMap, missionIds } from '../domain/progression/missionCatalog'
import {
  applyTrackedPokemonMatchResult,
  createInitialTrackedPokemonState,
  getPokedexClaimSelectionCount,
  setTrackedPokemonTarget as setTrackedPokemonTargetState,
  TRACKED_GAUGE_MAX_COMPLETIONS_PER_WINDOW,
} from '../domain/progression/pokedexProgression'
import { applyMatchRewards, type RewardBreakdown } from '../domain/progression/rewards'
import { applyRankedMatchResult, type RankedMatchResultSummary } from '../domain/progression/ranked'
import { craftCardFromFragments as applyCardFragmentCraft } from '../domain/progression/fragments'
import { craftShinyCard as applyShinyCraft } from '../domain/progression/shiny'
import { resolveTowerFloorSpec } from '../domain/tower/floorPlan'
import { resolveTowerRelicEffects } from '../domain/tower/relics'
import { applyTowerCheckpointRewards } from '../domain/tower/rewards'
import { createInitialTowerProgress, createTowerRun, describeTowerPostMatch, queueTowerRewardsForFloor, selectTowerReward } from '../domain/tower/run'
import type { TowerMatchSummary, TowerProgressState, TowerRunState } from '../domain/tower/types'
import {
  applyStoryVictoryRewards,
  loadStoryProgress,
  resolveStoryTrainer,
  saveStoryProgress,
  type StoryMapId,
  type StoryProgress,
  type StoryTrainerId,
  type StoryVictoryRewardSummary,
} from '../domain/story/story'
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
import type { CardElementId, CardId, DeckSlotId, MatchMode, MatchQueue, MatchResult, MissionId, PlayerProfile, RuleSet } from '../domain/types'

interface CurrentMatch {
  state: MatchState
  runtime: MatchRuntime
  queue: MatchQueue
  cpuDeck: CardId[]
  seed: number
  opponent: CpuOpponent
  rewardMultiplier: number
  usedAutoDeck: boolean
  tutorial?: {
    scenarioId: TutorialScenarioId
    title: string
    description: string
    elementId?: CardElementId
    steps: TutorialStep[]
  }
  tower?: {
    floor: number
    checkpointFloor: number
    boss: boolean
    relics: TowerRunState['relics']
  }
  story?: {
    mapId: StoryMapId
    trainerId: StoryTrainerId
    trainerName: string
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
  trackedPokemonUpdate?: TrackedPokemonMatchSummary | null
  tower?: TowerMatchSummary
  missionRecap?: MatchMissionRecap | null
  storyReward?: StoryVictoryRewardSummary | null
}

export interface TrackedPokemonMatchSummary {
  targetCardId: CardId | null
  gaugeBefore: number
  gaugeAfter: number
  gainedGaugePoints: number
  fragmentsGranted: number
  completedGaugesInWindow: number
  capReached: boolean
  windowReset: boolean
  maxCompletionsPerWindow: number
}

export interface MatchMissionRecapEntry {
  id: MissionId
  progressBefore: number
  progressAfter: number
  target: number
  completedBefore: boolean
  completedAfter: boolean
}

export interface MatchMissionRecap {
  before: PlayerProfile['missions']
  after: PlayerProfile['missions']
  completedMissionIds: MissionId[]
  readyToClaimMissionIds: MissionId[]
  entries: MatchMissionRecapEntry[]
}

interface GameContextValue {
  profile: PlayerProfile
  storedProfiles: StoredProfilesSnapshot
  currentMatch: CurrentMatch | null
  lastMatchSummary: LastMatchSummary | null
  storyProgress: StoryProgress
  towerProgress?: TowerProgressState
  towerRun?: TowerRunState | null
  startMatch(
    queue: MatchQueue,
    mode: MatchMode,
    deck: CardId[],
    rules: RuleSet,
    options?: { useAutoDeck?: boolean; normalOpponentLevel?: OpponentLevel; tutorialScenarioId?: TutorialScenarioId },
  ): void
  startTowerRun?(): void
  startStoryTrainerMatch?(trainerId: StoryTrainerId): void
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
  setTrackedPokemonTarget?(cardId: CardId | null): { valid: boolean; reason?: string }
  claimMission?(missionId: MissionId): { valid: boolean; reason?: string }
  updateCurrentMatch(state: MatchState): void
  finalizeCurrentMatch(claimedCpuCardIds?: CardId[]): LastMatchSummary
  clearLastMatchSummary(): void
  purchaseShopPack(packId: ShopPackId): ShopPurchaseReceipt
  purchaseShopPacks?(packId: ShopPackId, quantity: number): ShopBulkPurchaseReceipt
  openOwnedPack(packId: ShopPackId): OpenedPackResult
  openOwnedPacks?(packId: ShopPackId, quantity: number): OpenedPackBatchResult
  openShinyTestPack?(): OpenedShinyTestPackResult
  buySpecialPack(request: SpecialPackPurchaseRequest): OpenedSpecialPackResult
  craftCardFromFragments?(cardId: CardId): void
  craftShinyCard?(cardId: CardId): void
  addTestGold(amount: number): void
  createStoredProfile(name: string): { valid: boolean; reason?: string }
  switchStoredProfile(profileId: string): void
  deleteStoredProfile(profileId: string): { valid: boolean; reason?: string }
  resetProfile(): void
  claimAllAchievementRewards?(): { claimedCount: number; grantedCommonPacks: number }
}

export const GameContext = createContext<GameContextValue | null>(null)

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
    achievementRewardsClaimedById: { ...profile.achievementRewardsClaimedById },
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
    trackedPokemon: profile.trackedPokemon ? { ...profile.trackedPokemon } : undefined,
    settings: { ...profile.settings },
    tutorialProgress: profile.tutorialProgress
      ? {
          baseCompleted: profile.tutorialProgress.baseCompleted,
          completedElementById: { ...profile.tutorialProgress.completedElementById },
        }
      : undefined,
  }
}

function resolveProfileTowerProgress(profile: PlayerProfile): TowerProgressState {
  return profile.towerProgress ?? createInitialTowerProgress()
}

function resolveProfileTowerRun(profile: PlayerProfile): TowerRunState | null {
  return profile.towerRun ?? null
}

function grantRandomLeaguePassageFragments(profile: PlayerProfile, fragmentCount: number, seed: number): void {
  if (fragmentCount <= 0 || cardPool.length === 0) {
    return
  }

  const rng = createSeededRng(seed)
  for (let index = 0; index < fragmentCount; index += 1) {
    const cardId = cardPool[rng.nextInt(cardPool.length)]?.id
    if (!cardId) {
      continue
    }
    profile.cardFragmentsById[cardId] = (profile.cardFragmentsById[cardId] ?? 0) + 1
  }
}

function normalizeClaimedCpuCardIds(claimedCpuCardIds: CardId[] | undefined, expectedCount: number, cpuDeck: CardId[]): CardId[] {
  const requested = Array.from(new Set(claimedCpuCardIds ?? [])).filter((cardId) => cpuDeck.includes(cardId))
  const normalized: CardId[] = [...requested]

  for (const cpuCardId of cpuDeck) {
    if (normalized.length >= expectedCount) {
      break
    }
    if (!normalized.includes(cpuCardId)) {
      normalized.push(cpuCardId)
    }
  }

  return normalized.slice(0, expectedCount)
}

function buildMissionRecap(
  before: PlayerProfile['missions'],
  after: PlayerProfile['missions'],
  completedMissionIds: MissionId[],
  readyToClaimMissionIds: MissionId[],
): MatchMissionRecap {
  return {
    before: cloneMissionProgressMap(before),
    after: cloneMissionProgressMap(after),
    completedMissionIds: [...completedMissionIds],
    readyToClaimMissionIds: [...readyToClaimMissionIds],
    entries: missionIds.map((missionId) => ({
      id: missionId,
      progressBefore: before[missionId].progress,
      progressAfter: after[missionId].progress,
      target: after[missionId].target,
      completedBefore: before[missionId].completed,
      completedAfter: after[missionId].completed,
    })),
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile())
  const profileRef = useRef<PlayerProfile>(profile)
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null)
  const [lastMatchSummary, setLastMatchSummary] = useState<LastMatchSummary | null>(null)
  const [storyProgress, setStoryProgress] = useState<StoryProgress>(() => loadStoryProgress())
  const towerProgress = resolveProfileTowerProgress(profile)
  const towerRun = resolveProfileTowerRun(profile)

  const applyPostUpdateMissionHooks = useCallback((previousProfile: PlayerProfile, updatedProfile: PlayerProfile): PlayerProfile => {
    const cardsAcquiredDelta = updatedProfile.achievementProgress.cardsAcquired - previousProfile.achievementProgress.cardsAcquired
    let nextProfile = updatedProfile

    if (cardsAcquiredDelta > 0) {
      nextProfile = applyCardsAcquiredMissions(nextProfile, cardsAcquiredDelta).profile
    }

    const unlocked = evaluateAchievements(nextProfile)
    if (unlocked.length === 0) {
      return nextProfile
    }

    return {
      ...nextProfile,
      achievements: [...nextProfile.achievements, ...unlocked],
    }
  }, [])

  const commitComputedProfile = useCallback((nextProfile: PlayerProfile) => {
    const previousProfile = profileRef.current
    const committedProfile = applyPostUpdateMissionHooks(previousProfile, nextProfile)
    profileRef.current = committedProfile
    saveProfile(committedProfile)
    setProfile(committedProfile)
    return committedProfile
  }, [applyPostUpdateMissionHooks])

  const persistProfileUpdate = useCallback((mutator: (nextProfile: PlayerProfile) => void) => {
    setProfile((existingProfile) => {
      const nextProfile = cloneProfile(existingProfile)
      mutator(nextProfile)
      const committedProfile = applyPostUpdateMissionHooks(existingProfile, nextProfile)
      profileRef.current = committedProfile
      saveProfile(committedProfile)
      return committedProfile
    })
  }, [applyPostUpdateMissionHooks])

  const storedProfiles: StoredProfilesSnapshot = listStoredProfiles()

  const commitStoryProgress = useCallback((nextProgress: StoryProgress) => {
    saveStoryProgress(nextProgress)
    setStoryProgress(nextProgress)
    return nextProgress
  }, [])

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
      enableElementPowers,
      strictPowerTargeting,
      tower,
      tutorial,
      story,
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
      enableElementPowers?: boolean
      strictPowerTargeting?: boolean
      tutorial?: CurrentMatch['tutorial']
      tower?: CurrentMatch['tower']
      story?: CurrentMatch['story']
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
        enableElementPowers: enableElementPowers ?? true,
        strictPowerTargeting: strictPowerTargeting ?? true,
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
        tutorial,
        tower,
        story,
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
      storyProgress,
      towerProgress,
      towerRun,
      startMatch: (queue, mode, deck, rules, options) => {
        if (queue === 'tower') {
          throw new Error('Tower matches must be started via startTowerRun/resumeTowerRun.')
        }

        const activeProfile = profileRef.current
        const modeSpec = getModeSpec(mode)
        const useAutoDeck = options?.useAutoDeck ?? false
        const tutorialScenarioId = options?.tutorialScenarioId
        if (queue === 'tutorial') {
          if (!tutorialScenarioId) {
            throw new Error('Tutorial scenario is required.')
          }
          const scenario = resolveTutorialScenario(tutorialScenarioId)
          const seed = Date.now()
          const opponent = buildCpuOpponentForLevel(1, scenario.playerDeck, seed, scenario.mode)
          startPreparedMatch({
            queue: 'tutorial',
            mode: scenario.mode,
            playerDeck: [...scenario.playerDeck],
            cpuDeck: [...scenario.cpuDeck],
            rules: { ...scenario.rules },
            seed,
            startingTurn: scenario.steps[0]?.actor === 'cpu' ? 'cpu' : 'player',
            opponent,
            rewardMultiplier: 0,
            usedAutoDeck: false,
            enableElementPowers: scenario.enableElementPowers,
            strictPowerTargeting: scenario.strictPowerTargeting,
            tutorial: {
              scenarioId: scenario.id,
              title: scenario.title,
              description: scenario.description,
              elementId: scenario.elementId,
              steps: scenario.steps,
            },
          })
          setLastMatchSummary(null)
          return
        }
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
        const effectiveRules: RuleSet = {
          open: rules.open,
          same: false,
          plus: false,
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
      startStoryTrainerMatch: (trainerId) => {
        const activeProfile = profileRef.current
        const selectedDeckSlot = activeProfile.deckSlots.find((slot) => slot.id === activeProfile.selectedDeckSlotId)
        const playerDeck = selectedDeckSlot ? [...selectedDeckSlot.cards] : []
        const validation = validateDeck(playerDeck, activeProfile.ownedCardIds, '3x3')
        if (!validation.valid) {
          throw new Error(validation.reason)
        }

        const trainer = resolveStoryTrainer(trainerId)
        const seed = Date.now()
        const opponentPreview = getCpuOpponentPreviewForLevel(trainer.level, playerDeck, '3x3')
        const opponent: CpuOpponent = {
          ...opponentPreview,
          deck: [...trainer.cpuDeck],
          deckScore: computeDeckScore(trainer.cpuDeck),
        }

        startPreparedMatch({
          queue: 'story',
          mode: '3x3',
          playerDeck,
          cpuDeck: [...trainer.cpuDeck],
          rules: { ...trainer.rules, same: false, plus: false },
          seed,
          startingTurn: resolveStartingTurn(seed),
          opponent,
          rewardMultiplier: 1,
          usedAutoDeck: false,
          story: {
            mapId: trainer.mapId,
            trainerId: trainer.id,
            trainerName: trainer.name,
          },
        })
        setLastMatchSummary(null)
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
          nextProfile.achievementProgress.deckEdits += 1
          const unlocked = evaluateAchievements(nextProfile)
          if (unlocked.length > 0) {
            nextProfile.achievements.push(...unlocked)
          }
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
          } else {
            slot.cards = toggleCardInDeck(slot.cards, cardId, getModeSpec(mode).deckSize)
          }
          nextProfile.achievementProgress.deckEdits += 1
          const unlocked = evaluateAchievements(nextProfile)
          if (unlocked.length > 0) {
            nextProfile.achievements.push(...unlocked)
          }
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
      setTrackedPokemonTarget: (cardId) => {
        try {
          persistProfileUpdate((nextProfile) => {
            const currentTrackedState = nextProfile.trackedPokemon ?? createInitialTrackedPokemonState()
            nextProfile.trackedPokemon = setTrackedPokemonTargetState(currentTrackedState, cardId)
          })
          return { valid: true }
        } catch (error) {
          return { valid: false, reason: error instanceof Error ? error.message : 'Invalid tracked pokemon target.' }
        }
      },
      claimMission: (missionId) => {
        const claimResult = claimCompletedMission(profileRef.current, missionId, Date.now())
        if (!claimResult.claimed) {
          return { valid: false, reason: 'Mission is not ready.' }
        }

        commitComputedProfile(claimResult.profile)
        return { valid: true }
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
      finalizeCurrentMatch: (claimedCpuCardIds) => {
        if (!currentMatch) {
          throw new Error('No active match to finalize.')
        }

        const result = resolveMatchResult(currentMatch.state)
        if (currentMatch.queue === 'tutorial') {
          const nextProfile = cloneProfile(profile)
          const tutorialProgress = nextProfile.tutorialProgress ?? { baseCompleted: false, completedElementById: {} }
          const hadBaseTutorial = tutorialProgress.baseCompleted
          if (currentMatch.tutorial?.scenarioId === 'intro-basics') {
            tutorialProgress.baseCompleted = true
          }
          if (currentMatch.tutorial?.elementId) {
            tutorialProgress.completedElementById[currentMatch.tutorial.elementId] = true
          }
          nextProfile.tutorialProgress = tutorialProgress
          if (!hadBaseTutorial && tutorialProgress.baseCompleted) {
            nextProfile.achievementProgress.baseTutorialsCompleted += 1
          }
          nextProfile.achievementProgress.elementTutorialsCompleted = Object.keys(tutorialProgress.completedElementById).length

          const unlocked = evaluateAchievements(nextProfile)
          if (unlocked.length > 0) {
            nextProfile.achievements.push(...unlocked)
          }
          commitComputedProfile(nextProfile)

          const rewards: RewardBreakdown = {
            goldAwarded: 0,
            bonusGoldFromDuplicate: 0,
            bonusGoldFromDifficulty: 0,
            bonusGoldFromWinStreak: 0,
            bonusGoldFromComboBounty: 0,
            bonusGoldFromCleanVictory: 0,
            bonusGoldFromSecondarySynergy: 0,
            bonusGoldFromCriticalVictory: 0,
            bonusGoldFromAutoDeck: 0,
            criticalVictory: false,
            droppedCardId: null,
            droppedCardIds: [],
            duplicateConverted: false,
            newlyUnlockedAchievements: [],
          }

          const summary: LastMatchSummary = {
            queue: currentMatch.queue,
            result,
            rewards,
            newlyOwnedCards: [],
            opponent: {
              level: currentMatch.opponent.level,
              aiProfile: currentMatch.opponent.aiProfile,
              scoreRange: { ...currentMatch.opponent.scoreRange },
              deckScore: currentMatch.opponent.deckScore,
              winGoldBonus: currentMatch.opponent.winGoldBonus,
            },
            rankedMode: null,
            rankedUpdate: null,
            missionRecap: null,
          }

          setLastMatchSummary(summary)
          setCurrentMatch(null)
          return summary
        }

        const shouldResolveClaims = (currentMatch.queue === 'normal' || currentMatch.queue === 'ranked') && result.winner === 'player'
        const requiredClaimCount = shouldResolveClaims ? getPokedexClaimSelectionCount(profile, currentMatch.cpuDeck.length) : 0
        const normalizedClaimedCpuCardIds =
          requiredClaimCount > 0 ? normalizeClaimedCpuCardIds(claimedCpuCardIds, requiredClaimCount, currentMatch.cpuDeck) : undefined

        const progression = applyMatchRewards(
          profile,
          result,
          currentMatch.cpuDeck,
          currentMatch.seed + currentMatch.state.turns,
          currentMatch.opponent.level,
          currentMatch.rewardMultiplier,
          normalizedClaimedCpuCardIds,
          {
            disableCardCapture: currentMatch.queue === 'tower' || currentMatch.queue === 'story',
            fixedGoldAward: currentMatch.queue === 'story' ? 0 : undefined,
          },
        )

        let nextProfile = progression.profile
        let rankedMode: MatchMode | null = null
        let rankedUpdate: RankedMatchResultSummary | null = null
        let trackedPokemonUpdate: TrackedPokemonMatchSummary | null = null
        let towerSummary: TowerMatchSummary | undefined
        let missionRecap: MatchMissionRecap | null = null
        let storyReward: StoryVictoryRewardSummary | null = null

        if (currentMatch.queue === 'normal' || currentMatch.queue === 'ranked') {
          const missionSnapshotBefore = cloneMissionProgressMap(nextProfile.missions)
          const missionProgression = applyMatchMissions(
            nextProfile,
            {
              queue: currentMatch.queue,
              winner: result.winner,
              openRuleEnabled: result.rules.open,
              playerCornerPlays: result.metrics?.cornerPlaysByActor.player ?? 0,
            },
            currentMatch.seed + currentMatch.state.turns + 1,
          )

          nextProfile = missionProgression.profile
          missionRecap = buildMissionRecap(
            missionSnapshotBefore,
            missionProgression.profile.missions,
            missionProgression.completedMissionIds,
            missionProgression.readyToClaimMissionIds,
          )
        }

        if (currentMatch.queue === 'story' && currentMatch.story && result.winner === 'player') {
          const trainer = resolveStoryTrainer(currentMatch.story.trainerId)
          const storyRewards = applyStoryVictoryRewards(nextProfile, storyProgress, trainer, currentMatch.seed + currentMatch.state.turns + 3)
          nextProfile = storyRewards.profile
          storyReward = storyRewards.summary
          commitStoryProgress(storyRewards.progress)

          if (storyReward.fragmentCardId) {
            progression.rewards.droppedCardId = storyReward.fragmentCardId
            progression.rewards.droppedCardIds = [storyReward.fragmentCardId]
          }
          progression.rewards.goldAwarded = storyReward.trainerGoldAwarded + (storyReward.zoneReward?.gold ?? 0)
          if (storyReward.zoneReward && !progression.newlyOwnedCards.includes(storyReward.zoneReward.cardId)) {
            progression.newlyOwnedCards.push(storyReward.zoneReward.cardId)
          }
        }

        if (currentMatch.queue === 'ranked') {
          const rankedModeForMatch = currentMatch.state.config.mode
          rankedMode = rankedModeForMatch
          rankedUpdate = applyRankedMatchResult(nextProfile.rankedByMode[rankedModeForMatch], result.winner)
          nextProfile.achievementProgress.rankedMatchesPlayed += 1
          if (result.winner === 'player') {
            nextProfile.achievementProgress.rankedWins += 1
          }
          nextProfile = {
            ...nextProfile,
            rankedByMode: {
              ...nextProfile.rankedByMode,
              [rankedModeForMatch]: rankedUpdate.next,
            },
          }
          if (rankedUpdate.awardedLeagueReward) {
            grantRandomLeaguePassageFragments(
              nextProfile,
              rankedUpdate.awardedLeagueReward.fragments,
              currentMatch.seed + currentMatch.state.turns + 2,
            )
          }
        }

        if (currentMatch.queue === 'normal' || currentMatch.queue === 'ranked') {
          const trackedState = nextProfile.trackedPokemon ?? createInitialTrackedPokemonState()
          const trackedUpdate = applyTrackedPokemonMatchResult(trackedState, result.winner)
          nextProfile = {
            ...nextProfile,
            trackedPokemon: trackedUpdate.next,
          }

          if (trackedUpdate.fragmentsGranted > 0 && trackedUpdate.next.targetCardId) {
            const targetCardId = trackedUpdate.next.targetCardId
            nextProfile.cardFragmentsById[targetCardId] = (nextProfile.cardFragmentsById[targetCardId] ?? 0) + trackedUpdate.fragmentsGranted
          }

          trackedPokemonUpdate = {
            targetCardId: trackedUpdate.next.targetCardId,
            gaugeBefore: trackedUpdate.previous.gaugePoints,
            gaugeAfter: trackedUpdate.next.gaugePoints,
            gainedGaugePoints: trackedUpdate.gainedGaugePoints,
            fragmentsGranted: trackedUpdate.fragmentsGranted,
            completedGaugesInWindow: trackedUpdate.next.completedGaugesInWindow,
            capReached: trackedUpdate.capReached,
            windowReset: trackedUpdate.windowReset,
            maxCompletionsPerWindow: TRACKED_GAUGE_MAX_COMPLETIONS_PER_WINDOW,
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

        const unlocked = evaluateAchievements(nextProfile)
        if (unlocked.length > 0) {
          nextProfile = {
            ...nextProfile,
            achievements: [...nextProfile.achievements, ...unlocked],
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
          trackedPokemonUpdate,
          tower: towerSummary,
          missionRecap,
          storyReward,
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
      craftCardFromFragments: (cardId) => {
        const crafted = applyCardFragmentCraft(profile, cardId)
        crafted.achievementProgress.cardsAcquired += 1
        const unlocked = evaluateAchievements(crafted)
        if (unlocked.length > 0) {
          crafted.achievements.push(...unlocked)
        }
        commitComputedProfile(crafted)
      },
      craftShinyCard: (cardId) => {
        const crafted = applyShinyCraft(profile, cardId)
        crafted.achievementProgress.shinyCrafted += 1
        const unlocked = evaluateAchievements(crafted)
        if (unlocked.length > 0) {
          crafted.achievements.push(...unlocked)
        }
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
      claimAllAchievementRewards: () => {
        const progression = applyAchievementRewardsClaimAll(profileRef.current)
        if (progression.grantedCommonPacks > 0) {
          commitComputedProfile(progression.profile)
        }
        return {
          claimedCount: progression.claimedIds.length,
          grantedCommonPacks: progression.grantedCommonPacks,
        }
      },
    }
  }, [
    commitComputedProfile,
    commitStoryProgress,
    currentMatch,
    lastMatchSummary,
    persistProfileUpdate,
    profile,
    storyProgress,
    storedProfiles,
    towerProgress,
    towerRun,
  ])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
