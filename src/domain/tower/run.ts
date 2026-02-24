import { cardPool } from '../cards/cardPool'
import { createSeededRng } from '../random/seededRng'
import type { CardId } from '../types'
import { isTowerBossFloor } from './floorPlan'
import {
  createEmptyTowerRelicInventory,
  getTowerRelicDefinition,
  listTowerRelicIds,
  resolveTowerRelicEffects,
} from './relics'
import type {
  TowerProgressState,
  TowerRelicId,
  TowerRelicRewardOffer,
  TowerRunState,
  TowerSwapRewardOffer,
} from './types'

const TOWER_MAX_FLOOR = 100
const TOWER_MAX_CHECKPOINT_FLOOR = 90
const TOWER_DECK_SIZE = 8
const REPEATABLE_RELIC_IDS = new Set<TowerRelicId>(['golden_pass'])

export interface TowerPostMatchResult {
  status: 'continue' | 'failed' | 'cleared'
  nextRun: TowerRunState | null
  nextProgress: TowerProgressState
  checkpointReached: boolean
}

export function createInitialTowerProgress(): TowerProgressState {
  return {
    bestFloor: 0,
    checkpointFloor: 0,
    highestClearedFloor: 0,
    clearedFloor100: false,
  }
}

function normalizeCheckpointFloor(floor: number): number {
  if (!Number.isFinite(floor)) {
    return 0
  }
  const safe = Math.floor(floor)
  if (safe <= 0) {
    return 0
  }

  const clamped = Math.min(TOWER_MAX_CHECKPOINT_FLOOR, safe)
  return Math.floor(clamped / 10) * 10
}

function normalizeDeck(deck: CardId[]): CardId[] {
  const unique = [...new Set(deck)]
  if (unique.length !== TOWER_DECK_SIZE) {
    throw new Error('Tower run requires exactly 8 unique cards.')
  }
  return unique
}

export function createTowerRun(deck: CardId[], progress: TowerProgressState, seed: number): TowerRunState {
  const checkpointFloor = normalizeCheckpointFloor(progress.checkpointFloor)
  const startFloor = Math.max(1, Math.min(TOWER_MAX_FLOOR, checkpointFloor + 1))

  return {
    mode: '4x4',
    floor: startFloor,
    checkpointFloor,
    deck: normalizeDeck(deck),
    relics: createEmptyTowerRelicInventory(),
    pendingRewards: [],
    seed: Number.isFinite(seed) ? Math.floor(seed) : Date.now(),
  }
}

export function describeTowerPostMatch(
  run: TowerRunState,
  progress: TowerProgressState,
  winner: 'player' | 'cpu' | 'draw',
): TowerPostMatchResult {
  const baseProgress: TowerProgressState = {
    bestFloor: Math.max(0, progress.bestFloor),
    checkpointFloor: normalizeCheckpointFloor(progress.checkpointFloor),
    highestClearedFloor: Math.max(0, progress.highestClearedFloor),
    clearedFloor100: Boolean(progress.clearedFloor100),
  }

  if (winner !== 'player') {
    return {
      status: 'failed',
      nextRun: null,
      nextProgress: baseProgress,
      checkpointReached: false,
    }
  }

  const completedFloor = run.floor
  const checkpointReached = completedFloor % 10 === 0
  const bestFloor = Math.max(baseProgress.bestFloor, completedFloor)
  const checkpointFloor = checkpointReached
    ? Math.max(baseProgress.checkpointFloor, normalizeCheckpointFloor(completedFloor))
    : baseProgress.checkpointFloor

  if (completedFloor >= TOWER_MAX_FLOOR) {
    return {
      status: 'cleared',
      nextRun: null,
      nextProgress: {
        bestFloor,
        checkpointFloor,
        highestClearedFloor: TOWER_MAX_FLOOR,
        clearedFloor100: true,
      },
      checkpointReached,
    }
  }

  return {
    status: 'continue',
    nextRun: {
      ...run,
      floor: completedFloor + 1,
      checkpointFloor,
      pendingRewards: [],
      seed: run.seed + completedFloor,
    },
    nextProgress: {
      ...baseProgress,
      bestFloor,
      checkpointFloor,
    },
    checkpointReached,
  }
}

function pickUnique<T>(pool: T[], count: number, rng: ReturnType<typeof createSeededRng>): T[] {
  const available = [...pool]
  const picked: T[] = []
  const maxPick = Math.min(count, available.length)

  while (picked.length < maxPick) {
    const index = rng.nextInt(available.length)
    picked.push(available[index]!)
    available.splice(index, 1)
  }

  return picked
}

function buildRelicOffer(run: TowerRunState, floor: number, rng: ReturnType<typeof createSeededRng>): TowerRelicRewardOffer {
  const eligibleRelicIds = listTowerRelicIds().filter((id) => REPEATABLE_RELIC_IDS.has(id) || (run.relics[id] ?? 0) === 0)
  const source = eligibleRelicIds.length >= 3 ? eligibleRelicIds : listTowerRelicIds()
  const pickedIds = pickUnique(source, 3, rng) as [TowerRelicId, TowerRelicId, TowerRelicId]

  return {
    floor,
    kind: 'relic',
    choices: pickedIds.map((id) => {
      const definition = getTowerRelicDefinition(id)
      return {
        id,
        title: definition.title,
        description: definition.description,
      }
    }) as [TowerRelicRewardOffer['choices'][0], TowerRelicRewardOffer['choices'][1], TowerRelicRewardOffer['choices'][2]],
  }
}

function buildSwapOffer(run: TowerRunState, floor: number, rng: ReturnType<typeof createSeededRng>): TowerSwapRewardOffer {
  const effects = resolveTowerRelicEffects(run.relics)
  const source = cardPool.filter((card) => !run.deck.includes(card.id))
  const picked = pickUnique(source, effects.swapOfferChoiceCount, rng)

  return {
    floor,
    kind: 'swap',
    choices: picked.map((card) => ({
      cardId: card.id,
      title: card.name,
      description: `${card.top}/${card.right}/${card.bottom}/${card.left}`,
    })),
  }
}

export function queueTowerRewardsForFloor(run: TowerRunState, floor: number): TowerRunState {
  const normalizedFloor = Math.max(1, Math.min(TOWER_MAX_FLOOR, Math.floor(floor)))
  const rng = createSeededRng(run.seed + normalizedFloor * 7919 + run.pendingRewards.length * 104729)

  const nextOffers = [...run.pendingRewards]
  const rewardRelic = normalizedFloor % 3 === 0 || isTowerBossFloor(normalizedFloor)
  const rewardSwap = normalizedFloor % 5 === 0 || isTowerBossFloor(normalizedFloor)

  if (rewardRelic) {
    nextOffers.push(buildRelicOffer(run, normalizedFloor, rng))
  }

  if (rewardSwap) {
    nextOffers.push(buildSwapOffer(run, normalizedFloor, rng))
  }

  if (nextOffers.length === run.pendingRewards.length) {
    return run
  }

  return {
    ...run,
    pendingRewards: nextOffers,
  }
}

function applyRelicChoice(run: TowerRunState, choiceId: string): TowerRunState {
  const offer = run.pendingRewards[0]
  if (!offer || offer.kind !== 'relic') {
    throw new Error('No relic reward is pending.')
  }

  const picked = offer.choices.find((choice) => choice.id === choiceId)
  if (!picked) {
    throw new Error('Invalid relic choice.')
  }

  return {
    ...run,
    relics: {
      ...run.relics,
      [picked.id]: (run.relics[picked.id] ?? 0) + 1,
    },
    pendingRewards: run.pendingRewards.slice(1),
  }
}

function applySwapChoice(run: TowerRunState, choiceId: string, swapOutCardId?: CardId): TowerRunState {
  const offer = run.pendingRewards[0]
  if (!offer || offer.kind !== 'swap') {
    throw new Error('No swap reward is pending.')
  }

  const picked = offer.choices.find((choice) => choice.cardId === choiceId)
  if (!picked) {
    throw new Error('Invalid swap choice.')
  }

  const replacedCardId = swapOutCardId ?? run.deck[0]
  if (!replacedCardId || !run.deck.includes(replacedCardId)) {
    throw new Error('Swap target must be an existing run deck card.')
  }

  const deck = run.deck.map((cardId) => (cardId === replacedCardId ? picked.cardId : cardId))
  if (new Set(deck).size !== deck.length) {
    throw new Error('Swap would create duplicate cards in run deck.')
  }

  return {
    ...run,
    deck,
    pendingRewards: run.pendingRewards.slice(1),
  }
}

export function selectTowerReward(run: TowerRunState, choiceId: string, swapOutCardId?: CardId): TowerRunState {
  const offer = run.pendingRewards[0]
  if (!offer) {
    throw new Error('No pending tower reward.')
  }

  if (offer.kind === 'relic') {
    return applyRelicChoice(run, choiceId)
  }

  return applySwapChoice(run, choiceId, swapOutCardId)
}
