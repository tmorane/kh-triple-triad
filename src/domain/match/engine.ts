import { getCard } from '../cards/cardPool'
import { createSeededRng } from '../random/seededRng'
import type {
  Actor,
  CardElementId,
  CardId,
  MatchConfig,
  MatchMetrics,
  MatchResult,
  MatchTypeSynergyState,
  Move,
  MovePowerTarget,
} from '../types'
import { getModeSpec } from './modeSpec'
import type { AllStatsMinusOneStack, CardBoardEffects, FrozenCellEffect, MatchElementState, MatchState, MoveFlipEvent, SideDelta } from './types'

type Direction = 'up' | 'right' | 'down' | 'left'
type DirectionalBonus = Record<Direction, number>

interface AdjacentEnemy {
  directionFromSource: Direction
  cell: number
  enemyCardId: CardId
}

type ImmediateFlipKind = Exclude<MoveFlipEvent['kind'], 'combo'>

interface ImmediateFlipCandidate {
  cell: number
  directionFromSource: Direction
  kind: ImmediateFlipKind
}

interface PowerTargetSpec {
  kind: 'targetCell' | 'targetCardCell'
  cells: number[]
}

export interface MovePowerTargetOptions {
  kind: 'targetCell' | 'targetCardCell'
  cells: number[]
}

export interface MoveResolutionDetails {
  state: MatchState
  flippedCells: number[]
  immediateFlips: number
  wasSpecialRuleTrigger: boolean
  flipEvents: MoveFlipEvent[]
  groundDebuffedCells: number[]
  combatCells: number[]
}

export interface DisplaySides {
  top: number
  right: number
  bottom: number
  left: number
}

const oppositeDirection: Record<Direction, Direction> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
}

const neighborDelta: Record<Direction, [number, number]> = {
  up: [-1, 0],
  right: [0, 1],
  down: [1, 0],
  left: [0, -1],
}

const sideOrder: Direction[] = ['up', 'right', 'down', 'left']
const freezeDurationTurns = 1

function createEmptyTypeSynergyState(): MatchTypeSynergyState {
  return {
    player: { primaryTypeId: null, secondaryTypeId: null },
    cpu: { primaryTypeId: null, secondaryTypeId: null },
  }
}

function cloneTypeSynergyState(typeSynergy: MatchTypeSynergyState | undefined): MatchTypeSynergyState {
  const source = typeSynergy ?? createEmptyTypeSynergyState()
  return {
    player: { ...source.player },
    cpu: { ...source.cpu },
  }
}

function createEmptyMatchMetrics(): MatchMetrics {
  return {
    playsByActor: { player: 0, cpu: 0 },
    samePlusTriggersByActor: { player: 0, cpu: 0 },
    cornerPlaysByActor: { player: 0, cpu: 0 },
  }
}

function cloneMatchMetrics(metrics: MatchMetrics): MatchMetrics {
  return {
    playsByActor: { ...metrics.playsByActor },
    samePlusTriggersByActor: { ...metrics.samePlusTriggersByActor },
    cornerPlaysByActor: { ...metrics.cornerPlaysByActor },
  }
}

function createZeroSideDelta(): SideDelta {
  return { top: 0, right: 0, bottom: 0, left: 0 }
}

function cloneSideDelta(delta: SideDelta): SideDelta {
  return { top: delta.top, right: delta.right, bottom: delta.bottom, left: delta.left }
}

function createEmptyCardBoardEffects(): CardBoardEffects {
  return {
    permanentDelta: createZeroSideDelta(),
    burnTicksRemaining: 0,
    allStatsMinusOneStacks: [],
    unflippableUntilEndOfOpponentNextTurn: null,
    swappedHighLowUntilMatchEnd: false,
    rockShieldCharges: 0,
    poisonFirstCombatPending: false,
    insectEntryStacks: 0,
    dragonApplied: false,
    planteSourceOwner: undefined,
  }
}

function cloneCardBoardEffects(source: CardBoardEffects): CardBoardEffects {
  return {
    permanentDelta: cloneSideDelta(source.permanentDelta),
    burnTicksRemaining: source.burnTicksRemaining,
    allStatsMinusOneStacks: source.allStatsMinusOneStacks.map((stack) => ({ ...stack })),
    unflippableUntilEndOfOpponentNextTurn: source.unflippableUntilEndOfOpponentNextTurn
      ? { ...source.unflippableUntilEndOfOpponentNextTurn }
      : null,
    swappedHighLowUntilMatchEnd: source.swappedHighLowUntilMatchEnd,
    rockShieldCharges: source.rockShieldCharges,
    poisonFirstCombatPending: source.poisonFirstCombatPending,
    insectEntryStacks: source.insectEntryStacks,
    dragonApplied: source.dragonApplied,
    planteSourceOwner: source.planteSourceOwner,
  }
}

function cloneFrozenCellEffect(source: FrozenCellEffect): FrozenCellEffect {
  return {
    cell: source.cell,
    turnsRemaining: source.turnsRemaining,
  }
}

function resolveElementMode(config: MatchConfig): 'normal' | 'effects' {
  const minimumNormalCardsPerDeck = 5
  const hasNormalDeck = (deck: CardId[]) => deck.filter((cardId) => getCard(cardId).elementId === 'normal').length >= minimumNormalCardsPerDeck

  if (hasNormalDeck(config.playerDeck) || hasNormalDeck(config.cpuDeck)) {
    return 'normal'
  }

  return 'effects'
}

function createElementState(config: MatchConfig): MatchElementState {
  const enabled = config.enableElementPowers ?? false
  return {
    enabled,
    mode: enabled ? resolveElementMode(config) : 'effects',
    strictPowerTargeting: config.strictPowerTargeting ?? false,
    usedOnPoseByActor: { player: {}, cpu: {} },
    actorTurnCount: { player: 0, cpu: 0 },
    frozenCellByActor: {},
    floodedCell: null,
    poisonedHandByActor: { player: [], cpu: [] },
    boardEffectsByCell: {},
  }
}

function cloneElementState(source: MatchElementState | undefined): MatchElementState | undefined {
  if (!source) {
    return undefined
  }
  const boardEffectsByCell: MatchElementState['boardEffectsByCell'] = {}
  for (const [cellText, effects] of Object.entries(source.boardEffectsByCell)) {
    const cell = Number(cellText)
    if (Number.isInteger(cell) && effects) {
      boardEffectsByCell[cell] = cloneCardBoardEffects(effects)
    }
  }

  return {
    enabled: source.enabled,
    mode: source.mode,
    strictPowerTargeting: source.strictPowerTargeting,
    usedOnPoseByActor: {
      player: { ...source.usedOnPoseByActor.player },
      cpu: { ...source.usedOnPoseByActor.cpu },
    },
    actorTurnCount: { ...source.actorTurnCount },
    frozenCellByActor: {
      player: source.frozenCellByActor.player ? cloneFrozenCellEffect(source.frozenCellByActor.player) : undefined,
      cpu: source.frozenCellByActor.cpu ? cloneFrozenCellEffect(source.frozenCellByActor.cpu) : undefined,
    },
    floodedCell: source.floodedCell,
    poisonedHandByActor: {
      player: [...source.poisonedHandByActor.player],
      cpu: [...source.poisonedHandByActor.cpu],
    },
    boardEffectsByCell,
  }
}

function resolveElementState(state: MatchState): MatchElementState {
  if (state.elementState) {
    return state.elementState
  }
  const created = createElementState(state.config)
  state.elementState = created
  return created
}

function isElementEffectsActive(state: MatchState): boolean {
  const elementState = resolveElementState(state)
  return elementState.enabled && elementState.mode === 'effects'
}

function isNormalModeActive(state: MatchState): boolean {
  const elementState = resolveElementState(state)
  return elementState.enabled && elementState.mode === 'normal'
}

export function createMatch(config: MatchConfig): MatchState {
  validateMatchConfig(config)
  const modeSpec = getModeSpec(config.mode)
  const elementState = createElementState(config)
  const typeSynergy =
    elementState.enabled && elementState.mode === 'normal' ? createEmptyTypeSynergyState() : cloneTypeSynergyState(config.typeSynergy)
  const rules = {
    open: config.rules.open,
    same: false,
    plus: false,
  }

  return {
    config: {
      playerDeck: [...config.playerDeck],
      cpuDeck: [...config.cpuDeck],
      mode: config.mode,
      rules: { ...rules },
      seed: config.seed,
      startingTurn: config.startingTurn,
      typeSynergy,
      enableElementPowers: elementState.enabled,
      strictPowerTargeting: elementState.strictPowerTargeting,
    },
    rules: { ...rules },
    typeSynergy,
    metrics: createEmptyMatchMetrics(),
    elementState,
    turn: config.startingTurn ?? 'player',
    board: Array.from({ length: modeSpec.cellCount }, () => null),
    hands: {
      player: [...config.playerDeck],
      cpu: [...config.cpuDeck],
    },
    turns: 0,
    status: 'active',
    lastMove: null,
  }
}

export function listLegalMoves(state: MatchState): Move[] {
  if (state.status === 'finished') {
    return []
  }

  const emptyCells = state.board
    .map((slot, index) => ({ slot, index }))
    .filter((entry) => entry.slot === null)
    .map((entry) => entry.index)

  const actor = state.turn
  const blockedCell = getFrozenCellForActor(state, actor)
  const legalMoves: Move[] = []
  for (const cardId of state.hands[actor]) {
    const canIgnoreFrozenCell = blockedCell !== undefined && getCard(cardId).elementId === 'spectre'
    for (const cell of emptyCells) {
      if (blockedCell === cell && !canIgnoreFrozenCell) {
        continue
      }
      legalMoves.push({ actor, cardId, cell })
    }
  }

  return legalMoves
}

export function listMovePowerTargetOptions(state: MatchState, move: Move): MovePowerTargetOptions | null {
  if (!isElementEffectsActive(state)) {
    return null
  }

  const card = getCard(move.cardId)
  if (!isOnPoseElement(card.elementId)) {
    return null
  }

  const elementState = resolveElementState(state)
  if (!isReusableOnPoseElement(card.elementId) && elementState.usedOnPoseByActor[move.actor][card.elementId]) {
    return null
  }

  const spec = resolvePowerTargetSpec(state, move, card.elementId, move.cell)
  if (!spec) {
    return null
  }
  return { kind: spec.kind, cells: [...spec.cells] }
}

export function applyMove(state: MatchState, move: Move): MatchState {
  return applyMoveDetailed(state, move).state
}

export function applyMoveDetailed(state: MatchState, move: Move): MoveResolutionDetails {
  const nextState = cloneState(state)
  const effectsActive = isElementEffectsActive(nextState)

  if (effectsActive) {
    startActorTurnEffects(nextState, move.actor)
  }

  assertMoveIsValid(nextState, move)

  const actor = move.actor
  const opponent: Actor = actor === 'player' ? 'cpu' : 'player'

  nextState.board[move.cell] = { cardId: move.cardId, owner: actor }
  nextState.hands[actor] = nextState.hands[actor].filter((cardId) => cardId !== move.cardId)
  clearFrozenCellAssignmentsIfOccupied(nextState, move.cell)

  ensureCardBoardEffects(nextState, move.cell)
  initializePlacedCardEffects(nextState, move)

  if (effectsActive) {
    applyFloodedCellPenaltyIfNeeded(nextState, move)
  }

  const transientDebuffsByCell: Partial<Record<number, SideDelta>> = {}
  const groundDebuffedCells: number[] = []
  if (effectsActive) {
    applyOnPosePowerIfNeeded(nextState, move, transientDebuffsByCell, groundDebuffedCells)
  }

  const adjacentEnemies = getAdjacentEnemies(nextState, move.cell, actor)
  const sourceSideBonuses = getSourceSideBonuses(nextState, move)
  const participatingCells = new Set<number>()
  const normalFlipCandidates = collectNormalFlipCandidates(
    nextState,
    move,
    adjacentEnemies,
    sourceSideBonuses,
    transientDebuffsByCell,
    participatingCells,
  )
  const wasSpecialRuleTrigger = false
  const immediateFlipCandidatesByCell = new Map<number, ImmediateFlipCandidate>()
  for (const candidate of normalFlipCandidates) {
    immediateFlipCandidatesByCell.set(candidate.cell, candidate)
  }
  const appliedFlipSet = new Set<number>()
  const primaryFlipEvents: MoveFlipEvent[] = []

  for (const candidate of immediateFlipCandidatesByCell.values()) {
    if (attemptFlip(nextState, candidate.cell, actor)) {
      appliedFlipSet.add(candidate.cell)
      primaryFlipEvents.push({
        cell: candidate.cell,
        kind: candidate.kind,
        axis: resolveFlipAxis(candidate.directionFromSource),
        phase: 'primary',
      })
    }
  }

  const boardSize = getModeSpec(nextState.config.mode).boardSize
  nextState.metrics.playsByActor[actor] += 1
  if (isCornerCell(move.cell, boardSize)) {
    nextState.metrics.cornerPlaysByActor[actor] += 1
  }

  if (effectsActive) {
    finishActorTurnEffects(nextState, actor)
    decrementFrozenCellDurationForActor(nextState, actor)
  }

  nextState.turns += 1
  nextState.lastMove = move
  nextState.status = isFinished(nextState) ? 'finished' : 'active'
  if (nextState.status === 'active') {
    nextState.turn = opponent
  }

  return {
    state: nextState,
    flippedCells: [...appliedFlipSet],
    immediateFlips: appliedFlipSet.size,
    wasSpecialRuleTrigger,
    flipEvents: [...primaryFlipEvents],
    groundDebuffedCells: [...groundDebuffedCells].sort((left, right) => left - right),
    combatCells: [...participatingCells].sort((left, right) => left - right),
  }
}

export function resolveMatchResult(state: MatchState): MatchResult {
  const { playerCount, cpuCount } = countBoardOwners(state)

  return {
    mode: state.config.mode,
    winner: playerCount === cpuCount ? 'draw' : playerCount > cpuCount ? 'player' : 'cpu',
    playerCount,
    cpuCount,
    turns: state.turns,
    rules: { ...state.rules },
    typeSynergy: cloneTypeSynergyState(state.typeSynergy),
    metrics: cloneMatchMetrics(state.metrics),
  }
}

export function resolveDisplaySides(state: MatchState, cell: number): DisplaySides | null {
  const slot = state.board[cell]
  if (!slot) {
    return null
  }

  const card = getCard(slot.cardId)
  let sides = resolveBaseSides(slot.cardId)
  const effects = getCardBoardEffects(state, cell)
  const ignoresStatMalus = isElementEffectsActive(state) && card.elementId === 'spectre'

  if (effects?.swappedHighLowUntilMatchEnd) {
    sides = swapHighestAndLowestSides(sides)
  }

  if (effects) {
    if (ignoresStatMalus) {
      applyPositiveSideDelta(sides, effects.permanentDelta)
    } else {
      applySideDelta(sides, effects.permanentDelta)
    }
    const activeAllStatsMinusOneStacks = countActiveAllStatsMinusOneStacks(state, effects.allStatsMinusOneStacks)
    if (!ignoresStatMalus && activeAllStatsMinusOneStacks > 0) {
      sides.top -= activeAllStatsMinusOneStacks
      sides.right -= activeAllStatsMinusOneStacks
      sides.bottom -= activeAllStatsMinusOneStacks
      sides.left -= activeAllStatsMinusOneStacks
    }
    if (!ignoresStatMalus && effects.poisonFirstCombatPending) {
      sides.top -= 1
      sides.right -= 1
      sides.bottom -= 1
      sides.left -= 1
    }
  }

  if (isElementEffectsActive(state) && card.elementId === 'plante' && isPlantePassiveActiveForOwner(state, cell, slot.owner)) {
    const adjacentAlliedPlante = countAdjacentAlliedPlante(state, cell, slot.owner)
    const bonus = Math.min(2, adjacentAlliedPlante)
    sides.top += bonus
    sides.right += bonus
    sides.bottom += bonus
    sides.left += bonus
  }

  if (isElementEffectsActive(state) && card.elementId === 'spectre') {
    sides.top += 1
    sides.right += 1
    sides.bottom += 1
    sides.left += 1
  }

  if (isNormalModeActive(state) && card.elementId === 'normal') {
    sides.top += 1
    sides.right += 1
    sides.bottom += 1
    sides.left += 1
  }

  return {
    top: Math.max(1, sides.top),
    right: Math.max(1, sides.right),
    bottom: Math.max(1, sides.bottom),
    left: Math.max(1, sides.left),
  }
}

function validateMatchConfig(config: MatchConfig) {
  const modeSpec = getModeSpec(config.mode)
  if (new Set(config.playerDeck).size !== modeSpec.deckSize || config.playerDeck.length !== modeSpec.deckSize) {
    throw new Error(`Player deck must contain exactly ${modeSpec.deckSize} unique cards.`)
  }
  if (new Set(config.cpuDeck).size !== modeSpec.deckSize || config.cpuDeck.length !== modeSpec.deckSize) {
    throw new Error(`CPU deck must contain exactly ${modeSpec.deckSize} unique cards.`)
  }
}

function assertMoveIsValid(state: MatchState, move: Move) {
  const modeSpec = getModeSpec(state.config.mode)

  if (state.status === 'finished') {
    throw new Error('Cannot play a move on a finished match.')
  }
  if (state.turn !== move.actor) {
    throw new Error(`It is ${state.turn}'s turn, not ${move.actor}'s turn.`)
  }
  if (!state.hands[move.actor].includes(move.cardId)) {
    throw new Error(`${move.actor} does not have card ${move.cardId} in hand.`)
  }
  if (!Number.isInteger(move.cell) || move.cell < 0 || move.cell >= modeSpec.cellCount) {
    throw new Error(`Cell ${move.cell} is out of bounds for ${state.config.mode}.`)
  }
  if (state.board[move.cell] !== null) {
    throw new Error(`Cell ${move.cell} is already occupied.`)
  }

  if (isElementEffectsActive(state)) {
    const blockedCell = getFrozenCellForActor(state, move.actor)
    if (blockedCell === move.cell) {
      const card = getCard(move.cardId)
      if (card.elementId !== 'spectre') {
        throw new Error(`Cell ${move.cell} is frozen for ${move.actor}.`)
      }
    }
  }
}

function cloneState(state: MatchState): MatchState {
  return {
    config: {
      playerDeck: [...state.config.playerDeck],
      cpuDeck: [...state.config.cpuDeck],
      mode: state.config.mode,
      rules: { ...state.config.rules },
      seed: state.config.seed,
      startingTurn: state.config.startingTurn,
      typeSynergy: cloneTypeSynergyState(state.config.typeSynergy),
      enableElementPowers: state.config.enableElementPowers,
      strictPowerTargeting: state.config.strictPowerTargeting,
    },
    rules: { ...state.rules },
    typeSynergy: cloneTypeSynergyState(state.typeSynergy),
    metrics: cloneMatchMetrics(state.metrics),
    elementState: cloneElementState(state.elementState),
    turn: state.turn,
    board: state.board.map((slot) => (slot ? { ...slot } : null)),
    hands: {
      player: [...state.hands.player],
      cpu: [...state.hands.cpu],
    },
    turns: state.turns,
    status: state.status,
    lastMove: state.lastMove ? { ...state.lastMove } : null,
  }
}

function countBoardOwners(state: MatchState) {
  let playerCount = 0
  let cpuCount = 0

  for (const slot of state.board) {
    if (!slot) {
      continue
    }
    if (slot.owner === 'player') {
      playerCount += 1
    } else {
      cpuCount += 1
    }
  }

  return { playerCount, cpuCount }
}

function clearFrozenCellAssignmentsIfOccupied(state: MatchState, occupiedCell: number) {
  if (!isElementEffectsActive(state)) {
    return
  }

  const elementState = resolveElementState(state)
  for (const actor of ['player', 'cpu'] as const) {
    if (elementState.frozenCellByActor[actor]?.cell === occupiedCell) {
      delete elementState.frozenCellByActor[actor]
    }
  }
}

function getFrozenCellForActor(state: MatchState, actor: Actor): number | undefined {
  if (!isElementEffectsActive(state)) {
    return undefined
  }
  const frozenEffect = resolveElementState(state).frozenCellByActor[actor]
  if (!frozenEffect || frozenEffect.turnsRemaining <= 0) {
    return undefined
  }
  return frozenEffect.cell
}

function decrementFrozenCellDurationForActor(state: MatchState, actor: Actor) {
  if (!isElementEffectsActive(state)) {
    return
  }
  const elementState = resolveElementState(state)
  const frozenEffect = elementState.frozenCellByActor[actor]
  if (!frozenEffect) {
    return
  }
  frozenEffect.turnsRemaining -= 1
  if (frozenEffect.turnsRemaining <= 0) {
    delete elementState.frozenCellByActor[actor]
  }
}

function isFinished(state: MatchState): boolean {
  if (state.turns >= getModeSpec(state.config.mode).cellCount) {
    return true
  }
  return state.board.every((slot) => slot !== null)
}

function ensureCardBoardEffects(state: MatchState, cell: number): CardBoardEffects {
  const elementState = resolveElementState(state)
  const existing = elementState.boardEffectsByCell[cell]
  if (existing) {
    return existing
  }
  const created = createEmptyCardBoardEffects()
  elementState.boardEffectsByCell[cell] = created
  return created
}

function getCardBoardEffects(state: MatchState, cell: number): CardBoardEffects | null {
  const elementState = resolveElementState(state)
  return elementState.boardEffectsByCell[cell] ?? null
}

function initializePlacedCardEffects(state: MatchState, move: Move) {
  if (!isElementEffectsActive(state)) {
    return
  }
  const elementState = resolveElementState(state)
  const card = getCard(move.cardId)
  const effects = ensureCardBoardEffects(state, move.cell)

  if (card.elementId === 'roche') {
    if (!elementState.usedOnPoseByActor[move.actor].roche) {
      effects.rockShieldCharges = 1
      elementState.usedOnPoseByActor[move.actor].roche = true
    }
  }

  if (card.elementId === 'plante') {
    effects.planteSourceOwner = move.actor
  }

  if (card.elementId === 'insecte') {
    const alliedInsecteCount = countAdjacentAlliedInsecteAlreadyPlaced(state, move.cell, move.actor)
    const stacks = Math.min(3, alliedInsecteCount) as 0 | 1 | 2 | 3
    effects.insectEntryStacks = stacks
    effects.permanentDelta.top += stacks
    effects.permanentDelta.right += stacks
    effects.permanentDelta.bottom += stacks
    effects.permanentDelta.left += stacks
  }

  const poisonedHand = elementState.poisonedHandByActor[move.actor]
  if (poisonedHand.includes(move.cardId)) {
    effects.poisonFirstCombatPending = true
    elementState.poisonedHandByActor[move.actor] = poisonedHand.filter((cardId) => cardId !== move.cardId)
  }
}

function applyFloodedCellPenaltyIfNeeded(state: MatchState, move: Move) {
  const elementState = resolveElementState(state)
  if (elementState.floodedCell !== move.cell) {
    return
  }

  const card = getCard(move.cardId)
  if (card.elementId === 'spectre') {
    return
  }

  const effects = ensureCardBoardEffects(state, move.cell)
  const sides = resolveBaseSides(card.id)
  const highestSides = resolveHighestDirections(sides)
  const rng = createSeededRng(state.config.seed + state.turns + move.cell + 17)
  const pickedDirection = highestSides[rng.nextInt(highestSides.length)]
  applySideDeltaToDirection(effects.permanentDelta, pickedDirection, -3)
  elementState.floodedCell = null
}

function applyOnPosePowerIfNeeded(
  state: MatchState,
  move: Move,
  transientDebuffsByCell: Partial<Record<number, SideDelta>>,
  groundDebuffedCells: number[],
) {
  void transientDebuffsByCell
  if (!isElementEffectsActive(state)) {
    return
  }

  const card = getCard(move.cardId)
  const element = card.elementId
  if (!isOnPoseElement(element)) {
    return
  }

  const elementState = resolveElementState(state)
  if (!isReusableOnPoseElement(element) && elementState.usedOnPoseByActor[move.actor][element]) {
    return
  }

  if (element === 'dragon') {
    elementState.usedOnPoseByActor[move.actor][element] = true
    const effects = ensureCardBoardEffects(state, move.cell)
    applyDragonTransform(effects, move.cardId)
    return
  }

  if (element === 'electrik') {
    elementState.usedOnPoseByActor[move.actor][element] = true
    const effects = ensureCardBoardEffects(state, move.cell)
    const opponent: Actor = move.actor === 'player' ? 'cpu' : 'player'
    const untilTurn = elementState.actorTurnCount[opponent] + 1
    effects.unflippableUntilEndOfOpponentNextTurn = { actor: opponent, untilTurn }
    return
  }

  if (element === 'poison') {
    elementState.usedOnPoseByActor[move.actor][element] = true
    const opponent: Actor = move.actor === 'player' ? 'cpu' : 'player'
    const opponentHand = state.hands[opponent]
    if (opponentHand.length === 0) {
      return
    }
    const rng = createSeededRng(state.config.seed + state.turns + move.cell + 101)
    const poisonedCardId = opponentHand[rng.nextInt(opponentHand.length)]
    if (!elementState.poisonedHandByActor[opponent].includes(poisonedCardId)) {
      elementState.poisonedHandByActor[opponent].push(poisonedCardId)
    }
    return
  }

  if (element === 'sol') {
    const boardSize = getModeSpec(state.config.mode).boardSize
    const enemyNeighborCells = getNeighbors(move.cell, boardSize)
      .map(([, neighborCell]) => neighborCell)
      .filter((neighborCell) => {
        const slot = state.board[neighborCell]
        return slot !== null && slot.owner !== move.actor
      })
    if (enemyNeighborCells.length === 0) {
      return
    }
    for (const neighborCell of enemyNeighborCells) {
      const slot = state.board[neighborCell]
      if (!slot) {
        continue
      }
      applyAllStatsMinusOneStack(state, neighborCell, 'sol', slot.owner)
      groundDebuffedCells.push(neighborCell)
    }
    elementState.usedOnPoseByActor[move.actor][element] = true
    return
  }

  const spec = resolvePowerTargetSpec(state, move, element)
  const consumesOnPose = !isReusableOnPoseElement(element)
  if (!spec) {
    if (consumesOnPose) {
      elementState.usedOnPoseByActor[move.actor][element] = true
    }
    return
  }
  if (spec.cells.length === 0) {
    if (consumesOnPose) {
      elementState.usedOnPoseByActor[move.actor][element] = true
    }
    return
  }

  const targetCell = resolveSelectedTargetCell(state, move, element, spec)
  if (consumesOnPose) {
    elementState.usedOnPoseByActor[move.actor][element] = true
  }
  if (targetCell === null) {
    return
  }

  if (element === 'feu') {
    const targetEffects = ensureCardBoardEffects(state, targetCell)
    targetEffects.burnTicksRemaining += 1
    return
  }

  if (element === 'eau') {
    elementState.floodedCell = targetCell
    return
  }

  if (element === 'glace') {
    const opponent: Actor = move.actor === 'player' ? 'cpu' : 'player'
    elementState.frozenCellByActor[opponent] = { cell: targetCell, turnsRemaining: freezeDurationTurns }
    return
  }

  if (element === 'vol') {
    const targetSlot = state.board[targetCell]
    if (!targetSlot) {
      return
    }
    applyAllStatsMinusOneStack(state, targetCell, 'vol', targetSlot.owner)
    applyAllStatsMinusOneStack(state, targetCell, 'vol', targetSlot.owner)
    return
  }

  if (element === 'psy') {
    const targetEffects = ensureCardBoardEffects(state, targetCell)
    targetEffects.swappedHighLowUntilMatchEnd = true
  }
}

function resolvePowerTargetSpec(state: MatchState, move: Move, element: CardElementId, excludeCell?: number): PowerTargetSpec | null {
  const boardSize = getModeSpec(state.config.mode).boardSize
  if (element === 'feu') {
    const cells = getAdjacentEnemies(state, move.cell, move.actor).map((entry) => entry.cell)
    return { kind: 'targetCardCell', cells }
  }
  if (element === 'eau' || element === 'glace') {
    const cells: number[] = []
    for (let cell = 0; cell < boardSize * boardSize; cell += 1) {
      if (cell === excludeCell) {
        continue
      }
      if (state.board[cell] === null) {
        cells.push(cell)
      }
    }
    return { kind: 'targetCell', cells }
  }
  if (element === 'vol' || element === 'psy') {
    const cells: number[] = []
    for (let cell = 0; cell < boardSize * boardSize; cell += 1) {
      const slot = state.board[cell]
      if (slot && slot.owner !== move.actor) {
        cells.push(cell)
      }
    }
    return { kind: 'targetCardCell', cells }
  }
  return null
}

function resolveSelectedTargetCell(state: MatchState, move: Move, element: CardElementId, spec: PowerTargetSpec): number | null {
  if (spec.cells.length === 0) {
    return null
  }

  const provided = readTargetFromMove(move.powerTarget, spec.kind)
  if (provided !== null) {
    if (!spec.cells.includes(provided)) {
      throw new Error(`Invalid power target for ${element}.`)
    }
    return provided
  }

  const strict = resolveElementState(state).strictPowerTargeting
  if (strict && move.actor === 'player') {
    throw new Error(`Power target is required for ${element}.`)
  }

  return spec.cells[0] ?? null
}

function readTargetFromMove(target: MovePowerTarget | undefined, kind: PowerTargetSpec['kind']): number | null {
  if (!target) {
    return null
  }
  if (kind === 'targetCell') {
    return Number.isInteger(target.targetCell) ? (target.targetCell as number) : null
  }
  return Number.isInteger(target.targetCardCell) ? (target.targetCardCell as number) : null
}

function applyDragonTransform(effects: CardBoardEffects, cardId: CardId) {
  const sides = resolveBaseSides(cardId)
  const sorted = [...sideOrder].sort((a, b) => {
    const aValue = readDirectionValue(sides, a)
    const bValue = readDirectionValue(sides, b)
    if (aValue !== bValue) {
      return aValue - bValue
    }
    return sideOrder.indexOf(a) - sideOrder.indexOf(b)
  })
  const weakestOne = sorted[0]
  const weakestTwo = sorted[1]
  const strongest = sorted[sorted.length - 1]
  applySideDeltaToDirection(effects.permanentDelta, weakestOne, +1)
  applySideDeltaToDirection(effects.permanentDelta, weakestTwo, +1)
  applySideDeltaToDirection(effects.permanentDelta, strongest, -1)
  effects.dragonApplied = true
}

function startActorTurnEffects(state: MatchState, actor: Actor) {
  const elementState = resolveElementState(state)
  elementState.actorTurnCount[actor] += 1

  for (let cell = 0; cell < state.board.length; cell += 1) {
    const slot = state.board[cell]
    if (!slot || slot.owner !== actor) {
      continue
    }
    const effects = getCardBoardEffects(state, cell)
    if (!effects || effects.burnTicksRemaining <= 0) {
      continue
    }
    effects.permanentDelta.top -= 1
    effects.permanentDelta.right -= 1
    effects.permanentDelta.bottom -= 1
    effects.permanentDelta.left -= 1
    effects.burnTicksRemaining -= 1
  }
}

function finishActorTurnEffects(state: MatchState, actor: Actor) {
  const actorTurnCount = resolveElementState(state).actorTurnCount[actor]
  for (const effects of Object.values(resolveElementState(state).boardEffectsByCell)) {
    if (!effects) {
      continue
    }
    effects.allStatsMinusOneStacks = effects.allStatsMinusOneStacks.filter(
      (stack) => stack.actor !== actor || actorTurnCount < stack.untilTurn,
    )
    const shield = effects.unflippableUntilEndOfOpponentNextTurn
    if (shield && shield.actor === actor && actorTurnCount >= shield.untilTurn) {
      effects.unflippableUntilEndOfOpponentNextTurn = null
    }
  }
}

function getAdjacentEnemies(state: MatchState, sourceCell: number, sourceOwner: Actor): AdjacentEnemy[] {
  const result: AdjacentEnemy[] = []
  const boardSize = getModeSpec(state.config.mode).boardSize

  for (const [direction, cell] of getNeighbors(sourceCell, boardSize)) {
    const slot = state.board[cell]
    if (!slot || slot.owner === sourceOwner) {
      continue
    }

    result.push({
      directionFromSource: direction,
      cell,
      enemyCardId: slot.cardId,
    })
  }

  return result
}

function collectNormalFlipCandidates(
  state: MatchState,
  move: Move,
  adjacentEnemies: AdjacentEnemy[],
  sourceSideBonuses: DirectionalBonus,
  transientDebuffsByCell: Partial<Record<number, SideDelta>>,
  participatingCells: Set<number>,
): ImmediateFlipCandidate[] {
  const result: ImmediateFlipCandidate[] = []

  for (const adjacent of adjacentEnemies) {
    participatingCells.add(move.cell)
    participatingCells.add(adjacent.cell)
    const attackerValue =
      getEffectiveSideValue(state, move.cell, adjacent.directionFromSource, true, transientDebuffsByCell) +
      sourceSideBonuses[adjacent.directionFromSource]
    const defenderValue = getEffectiveSideValue(
      state,
      adjacent.cell,
      oppositeDirection[adjacent.directionFromSource],
      false,
      transientDebuffsByCell,
    )

    if (attackerValue > defenderValue) {
      result.push({
        cell: adjacent.cell,
        directionFromSource: adjacent.directionFromSource,
        kind: 'flipped',
      })
    }
  }

  return result
}


function getSourceSideBonuses(state: MatchState, move: Move): DirectionalBonus {
  const bonuses: DirectionalBonus = { up: 0, right: 0, down: 0, left: 0 }
  const actorSynergy = state.typeSynergy[move.actor]
  const primaryTypeId = actorSynergy.primaryTypeId
  if (!primaryTypeId) {
    return bonuses
  }

  if (primaryTypeId === 'sans_coeur' && state.metrics.playsByActor[move.actor] === 0) {
    bonuses.up += 1
    bonuses.right += 1
    bonuses.down += 1
    bonuses.left += 1
  }

  if (primaryTypeId === 'simili') {
    const boardSize = getModeSpec(state.config.mode).boardSize
    for (const direction of getActiveCornerDirections(move.cell, boardSize)) {
      bonuses[direction] += 1
    }
  }

  return bonuses
}

function getActiveCornerDirections(cell: number, boardSize: number): Direction[] {
  const topLeft = 0
  const topRight = boardSize - 1
  const bottomLeft = boardSize * (boardSize - 1)
  const bottomRight = boardSize * boardSize - 1

  if (cell === topLeft) {
    return ['right', 'down']
  }
  if (cell === topRight) {
    return ['left', 'down']
  }
  if (cell === bottomLeft) {
    return ['up', 'right']
  }
  if (cell === bottomRight) {
    return ['up', 'left']
  }
  return []
}

function isCornerCell(cell: number, boardSize: number): boolean {
  const topRight = boardSize - 1
  const bottomLeft = boardSize * (boardSize - 1)
  const bottomRight = boardSize * boardSize - 1
  return cell === 0 || cell === topRight || cell === bottomLeft || cell === bottomRight
}

function resolveFlipAxis(direction: Direction): MoveFlipEvent['axis'] {
  return direction === 'up' || direction === 'down' ? 'vertical' : 'horizontal'
}

function getNeighbors(cell: number, boardSize: number): Array<[Direction, number]> {
  const row = Math.floor(cell / boardSize)
  const col = cell % boardSize
  const neighbors: Array<[Direction, number]> = []

  for (const direction of Object.keys(neighborDelta) as Direction[]) {
    const [dr, dc] = neighborDelta[direction]
    const nextRow = row + dr
    const nextCol = col + dc
    if (nextRow < 0 || nextRow >= boardSize || nextCol < 0 || nextCol >= boardSize) {
      continue
    }
    neighbors.push([direction, nextRow * boardSize + nextCol])
  }

  return neighbors
}

function getEffectiveSideValue(
  state: MatchState,
  cell: number,
  direction: Direction,
  isAttacker: boolean,
  transientDebuffsByCell: Partial<Record<number, SideDelta>>,
): number {
  const slot = state.board[cell]
  if (!slot) {
    return 0
  }
  const card = getCard(slot.cardId)
  let sides = resolveBaseSides(slot.cardId)
  const effects = getCardBoardEffects(state, cell)
  const ignoresStatMalus = isElementEffectsActive(state) && card.elementId === 'spectre'

  if (effects?.swappedHighLowUntilMatchEnd) {
    sides = swapHighestAndLowestSides(sides)
  }

  if (effects) {
    if (ignoresStatMalus) {
      applyPositiveSideDelta(sides, effects.permanentDelta)
    } else {
      applySideDelta(sides, effects.permanentDelta)
    }
    const activeAllStatsMinusOneStacks = countActiveAllStatsMinusOneStacks(state, effects.allStatsMinusOneStacks)
    if (!ignoresStatMalus && activeAllStatsMinusOneStacks > 0) {
      sides.top -= activeAllStatsMinusOneStacks
      sides.right -= activeAllStatsMinusOneStacks
      sides.bottom -= activeAllStatsMinusOneStacks
      sides.left -= activeAllStatsMinusOneStacks
    }
    if (!ignoresStatMalus && effects.poisonFirstCombatPending) {
      sides.top -= 1
      sides.right -= 1
      sides.bottom -= 1
      sides.left -= 1
    }
  }

  const transient = transientDebuffsByCell[cell]
  if (transient) {
    if (ignoresStatMalus) {
      applyPositiveSideDelta(sides, transient)
    } else {
      applySideDelta(sides, transient)
    }
  }

  if (isElementEffectsActive(state) && card.elementId === 'plante' && isPlantePassiveActiveForOwner(state, cell, slot.owner)) {
    const adjacentAlliedPlante = countAdjacentAlliedPlante(state, cell, slot.owner)
    const bonus = Math.min(2, adjacentAlliedPlante)
    sides.top += bonus
    sides.right += bonus
    sides.bottom += bonus
    sides.left += bonus
  }

  if (isElementEffectsActive(state) && card.elementId === 'spectre') {
    sides.top += 1
    sides.right += 1
    sides.bottom += 1
    sides.left += 1
  }

  if (isNormalModeActive(state) && card.elementId === 'normal') {
    sides.top += 1
    sides.right += 1
    sides.bottom += 1
    sides.left += 1
  }

  let value = readDirectionValue(sides, direction)
  if (isElementEffectsActive(state) && card.elementId === 'combat' && isAttacker) {
    value += 1
  }
  return Math.max(1, value)
}

function countAdjacentAlliedPlante(state: MatchState, sourceCell: number, owner: Actor): number {
  const boardSize = getModeSpec(state.config.mode).boardSize
  let count = 0
  for (const [, cell] of getNeighbors(sourceCell, boardSize)) {
    const slot = state.board[cell]
    if (slot && slot.owner === owner && getCard(slot.cardId).elementId === 'plante' && isPlantePassiveActiveForOwner(state, cell, owner)) {
      count += 1
    }
  }
  return count
}

function isPlantePassiveActiveForOwner(state: MatchState, cell: number, owner: Actor): boolean {
  const effects = getCardBoardEffects(state, cell)
  if (!effects?.planteSourceOwner) {
    return true
  }
  return effects.planteSourceOwner === owner
}

function countAdjacentAlliedInsecteAlreadyPlaced(state: MatchState, sourceCell: number, owner: Actor): number {
  const boardSize = getModeSpec(state.config.mode).boardSize
  let count = 0
  for (const [, cell] of getNeighbors(sourceCell, boardSize)) {
    const slot = state.board[cell]
    if (!slot || slot.owner !== owner || cell === sourceCell) {
      continue
    }
    if (getCard(slot.cardId).elementId === 'insecte') {
      count += 1
    }
  }
  return count
}

function isAllStatsMinusOneStackActive(state: MatchState, stack: AllStatsMinusOneStack): boolean {
  const turns = resolveElementState(state).actorTurnCount[stack.actor]
  return turns <= stack.untilTurn
}

function countActiveAllStatsMinusOneStacks(state: MatchState, stacks: AllStatsMinusOneStack[]): number {
  return stacks.filter((stack) => isAllStatsMinusOneStackActive(state, stack)).length
}

function applyAllStatsMinusOneStack(state: MatchState, cell: number, source: AllStatsMinusOneStack['source'], actor: Actor) {
  const elementState = resolveElementState(state)
  const effects = ensureCardBoardEffects(state, cell)
  effects.allStatsMinusOneStacks = effects.allStatsMinusOneStacks.filter((stack) => isAllStatsMinusOneStackActive(state, stack))

  const nextStack: AllStatsMinusOneStack = {
    source,
    actor,
    untilTurn: elementState.actorTurnCount[actor] + 1,
  }

  if (effects.allStatsMinusOneStacks.length < 2) {
    effects.allStatsMinusOneStacks.push(nextStack)
    return
  }

  let shortestIndex = 0
  let shortestRemaining = Infinity
  for (let index = 0; index < effects.allStatsMinusOneStacks.length; index += 1) {
    const existing = effects.allStatsMinusOneStacks[index]!
    const remainingTurns = existing.untilTurn - elementState.actorTurnCount[existing.actor]
    if (remainingTurns < shortestRemaining) {
      shortestRemaining = remainingTurns
      shortestIndex = index
    }
  }

  effects.allStatsMinusOneStacks[shortestIndex] = nextStack
}

function resolveBaseSides(cardId: CardId): SideDelta {
  const card = getCard(cardId)
  return {
    top: card.top,
    right: card.right,
    bottom: card.bottom,
    left: card.left,
  }
}

function applySideDelta(target: SideDelta, delta: SideDelta) {
  target.top += delta.top
  target.right += delta.right
  target.bottom += delta.bottom
  target.left += delta.left
}

function applyPositiveSideDelta(target: SideDelta, delta: SideDelta) {
  target.top += Math.max(0, delta.top)
  target.right += Math.max(0, delta.right)
  target.bottom += Math.max(0, delta.bottom)
  target.left += Math.max(0, delta.left)
}

function applySideDeltaToDirection(delta: SideDelta, direction: Direction, amount: number) {
  switch (direction) {
    case 'up':
      delta.top += amount
      return
    case 'right':
      delta.right += amount
      return
    case 'down':
      delta.bottom += amount
      return
    case 'left':
      delta.left += amount
      return
  }
}

function readDirectionValue(sides: SideDelta, direction: Direction): number {
  switch (direction) {
    case 'up':
      return sides.top
    case 'right':
      return sides.right
    case 'down':
      return sides.bottom
    case 'left':
      return sides.left
  }
}

function resolveHighestDirections(sides: SideDelta): Direction[] {
  const values = sideOrder.map((direction) => [direction, readDirectionValue(sides, direction)] as const)
  const highestValue = Math.max(...values.map((entry) => entry[1]))
  return values.filter((entry) => entry[1] === highestValue).map((entry) => entry[0])
}

function resolveLowestDirections(sides: SideDelta): Direction[] {
  const values = sideOrder.map((direction) => [direction, readDirectionValue(sides, direction)] as const)
  const lowestValue = Math.min(...values.map((entry) => entry[1]))
  return values.filter((entry) => entry[1] === lowestValue).map((entry) => entry[0])
}

function swapHighestAndLowestSides(sides: SideDelta): SideDelta {
  const copy = cloneSideDelta(sides)
  const highest = resolveHighestDirections(copy)[0]
  const lowest = resolveLowestDirections(copy)[0]
  if (!highest || !lowest || highest === lowest) {
    return copy
  }
  const highestValue = readDirectionValue(copy, highest)
  const lowestValue = readDirectionValue(copy, lowest)
  applySideDeltaToDirection(copy, highest, lowestValue - highestValue)
  applySideDeltaToDirection(copy, lowest, highestValue - lowestValue)
  return copy
}

function attemptFlip(state: MatchState, cell: number, actor: Actor): boolean {
  const slot = state.board[cell]
  if (!slot) {
    return false
  }
  if (!isElementEffectsActive(state)) {
    slot.owner = actor
    return true
  }

  const effects = getCardBoardEffects(state, cell)
  if (effects?.unflippableUntilEndOfOpponentNextTurn) {
    const timer = effects.unflippableUntilEndOfOpponentNextTurn
    const turns = resolveElementState(state).actorTurnCount[timer.actor]
    if (turns <= timer.untilTurn) {
      return false
    }
  }
  if (effects && effects.rockShieldCharges > 0) {
    effects.rockShieldCharges -= 1
    return false
  }

  slot.owner = actor
  return true
}

function isOnPoseElement(element: CardElementId): boolean {
  return (
    element === 'feu' ||
    element === 'eau' ||
    element === 'electrik' ||
    element === 'glace' ||
    element === 'poison' ||
    element === 'sol' ||
    element === 'vol' ||
    element === 'psy' ||
    element === 'dragon'
  )
}

function isReusableOnPoseElement(element: CardElementId): boolean {
  return element === 'vol'
}
