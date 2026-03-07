import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import { selectCpuMove } from '../../domain/match/ai'
import { applyMoveDetailed, listLegalMoves, listMovePowerTargetOptions, resolveMatchResult } from '../../domain/match/engine'
import { buildMatchEffectsViewModel } from '../../domain/match/effectsViewModel'
import { getModeSpec } from '../../domain/match/modeSpec'
import type { TutorialPlayerStep, TutorialStep } from '../../domain/match/tutorialScenarios'
import type { MoveFlipEvent } from '../../domain/match/types'
import { getCardFragmentCost } from '../../domain/progression/fragments'
import { applyMatchRewards } from '../../domain/progression/rewards'
import { applyRankedMatchResult } from '../../domain/progression/ranked'
import type { Actor, CardElementId, CardId, Move } from '../../domain/types'
import { playCriticalVictorySound } from '../audio/criticalVictorySound'
import { PixiBoard } from '../components/PixiBoard'
import { RankedLpRecap } from '../components/RankedLpRecap'
import { RuleBadges } from '../components/RuleBadges'
import { TriadCard } from '../components/TriadCard'
import { MatchLaneTypeStrip } from '../components/MatchLaneTypeStrip'

function formatGoldBonusDetails(rewards: {
  bonusGoldFromDuplicate: number
  bonusGoldFromDifficulty: number
  bonusGoldFromComboBounty: number
  bonusGoldFromCleanVictory: number
  bonusGoldFromSecondarySynergy: number
  bonusGoldFromCriticalVictory: number
  bonusGoldFromAutoDeck: number
}): string {
  const parts: string[] = []
  if (rewards.bonusGoldFromDifficulty > 0) {
    parts.push(`+${rewards.bonusGoldFromDifficulty} difficulty`)
  }
  if (rewards.bonusGoldFromDuplicate > 0) {
    parts.push(`+${rewards.bonusGoldFromDuplicate} duplicate`)
  }
  if (rewards.bonusGoldFromComboBounty > 0) {
    parts.push(`+${rewards.bonusGoldFromComboBounty} combo`)
  }
  if (rewards.bonusGoldFromCleanVictory > 0) {
    parts.push(`+${rewards.bonusGoldFromCleanVictory} clean`)
  }
  if (rewards.bonusGoldFromSecondarySynergy > 0) {
    parts.push(`+${rewards.bonusGoldFromSecondarySynergy} secondary`)
  }
  if (rewards.bonusGoldFromCriticalVictory > 0) {
    parts.push(`+${rewards.bonusGoldFromCriticalVictory} critical`)
  }
  if (rewards.bonusGoldFromAutoDeck > 0) {
    parts.push(`+${rewards.bonusGoldFromAutoDeck} auto deck`)
  }
  return parts.length > 0 ? ` (${parts.join(', ')})` : ''
}

const STARTER_SPIN_DURATION_MS = 1600
const STARTER_REVEAL_HOLD_MS = 340
const STARTER_BASE_TURNS = 6
const WATER_CAST_DELAY_MS = 220
const ICE_CAST_DELAY_MS = 220
const FIRE_CAST_DELAY_MS = 220
const WATER_PENALTY_DELAY_MS = 900
const WATER_CLASH_DELAY_MS = 600
const GROUND_DEBUFF_VISUAL_DELAY_MS = 900
const FREEZE_BLOCKED_FLASH_DELAY_MS = 320
const FLIP_EVENT_DURATION_MS = 1200
const FLIP_EVENT_VISIBILITY_MS = 2100
const CPU_THINKING_DURATION_MS = 2000
const CPU_TURN_AFTER_FLIP_DELAY_MS = Math.max(FLIP_EVENT_DURATION_MS, CPU_THINKING_DURATION_MS)
const POWER_TARGET_PROMPT = 'Choose a power target.'
const viteBaseUrl =
  typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined' && typeof import.meta.env.BASE_URL === 'string'
    ? import.meta.env.BASE_URL
    : '/'
const matchLaneAssetBasePath = `${viteBaseUrl}ui/setup/`

const matchLaneArtwork = {
  cpuHand: `${matchLaneAssetBasePath}cpu-hand.jpg`,
  playerHand: `${matchLaneAssetBasePath}player-hand.jpg`,
}

type KeyboardDirection = 'up' | 'down' | 'left' | 'right'

type PowerTargetingState = {
  targetKind: 'targetCell' | 'targetCardCell'
  elementId: CardElementId
  cardId: CardId
  placementCell: number
  targetCells: number[]
}

function isFrozenCellForActorError(message: string): boolean {
  return /^Cell \d+ is frozen for (player|cpu)\.$/.test(message)
}

function isMoveMatchingExpected(move: Move, expectedMove: Move): boolean {
  const targetCell = move.powerTarget?.targetCell
  const targetCardCell = move.powerTarget?.targetCardCell
  const expectedTargetCell = expectedMove.powerTarget?.targetCell
  const expectedTargetCardCell = expectedMove.powerTarget?.targetCardCell
  return (
    move.actor === expectedMove.actor &&
    move.cardId === expectedMove.cardId &&
    move.cell === expectedMove.cell &&
    targetCell === expectedTargetCell &&
    targetCardCell === expectedTargetCardCell
  )
}

function hasExplicitPowerTarget(move: Move): boolean {
  return Number.isInteger(move.powerTarget?.targetCell) || Number.isInteger(move.powerTarget?.targetCardCell)
}

function isTutorialPlayerStep(step: TutorialStep | null): step is TutorialPlayerStep {
  return Boolean(step && step.actor === 'player')
}

function getTutorialGuidanceError(step: TutorialPlayerStep, actionReason?: string): string {
  const guidedAction = actionReason ?? step.objective?.errorReason ?? step.hint
  const why = step.why ?? step.hint
  return `Action guidee: ${guidedAction} Pourquoi: ${why}`
}

function getTutorialObjectiveText(step: TutorialPlayerStep | null): string {
  if (!step) {
    return 'Objectif: observe le coup du CPU.'
  }

  if (step.objective) {
    const cells = step.objective.allowedCells.map((cell) => cell + 1).join(', ')
    if (step.objective.allowedCells.length > 1) {
      return `Cases imposees (surlignees): ${cells}`
    }
    return `Case imposee (surlignee): ${cells}`
  }

  return `Case imposee (surlignee): ${step.move.cell + 1} - Carte demandee: ${step.move.cardId.toUpperCase()}`
}

function validateTutorialPlayerMove(move: Move, step: TutorialPlayerStep): { valid: true } | { valid: false; reason: string } {
  const objective = step.objective
  if (!objective) {
    const expectedMove = step.move
    if (hasExplicitPowerTarget(expectedMove)) {
      if (isMoveMatchingExpected(move, expectedMove)) {
        return { valid: true }
      }
      return { valid: false, reason: step.hint }
    }

    const matchesCardAndCell = move.actor === expectedMove.actor && move.cardId === expectedMove.cardId && move.cell === expectedMove.cell
    if (matchesCardAndCell) {
      return { valid: true }
    }
    return { valid: false, reason: step.hint }
  }

  if (!objective.allowedCells.includes(move.cell)) {
    return { valid: false, reason: objective.errorReason ?? step.hint }
  }

  if (objective.allowedCardIds && !objective.allowedCardIds.includes(move.cardId)) {
    return { valid: false, reason: objective.errorReason ?? step.hint }
  }

  return { valid: true }
}

function getOutcomeLabel(winner: 'player' | 'cpu' | 'draw'): 'WIN' | 'LOSE' | 'DRAW' {
  if (winner === 'player') {
    return 'WIN'
  }
  if (winner === 'cpu') {
    return 'LOSE'
  }
  return 'DRAW'
}

function getDigitFromKeyboardCode(code: string): number | null {
  if (/^Digit[1-8]$/.test(code)) {
    return Number(code.replace('Digit', ''))
  }
  if (/^Numpad[1-8]$/.test(code)) {
    return Number(code.replace('Numpad', ''))
  }
  return null
}

function getKeyboardDirection(code: string): KeyboardDirection | null {
  if (code === 'ArrowUp') {
    return 'up'
  }
  if (code === 'ArrowDown') {
    return 'down'
  }
  if (code === 'ArrowLeft') {
    return 'left'
  }
  if (code === 'ArrowRight') {
    return 'right'
  }
  return null
}

function getNextKeyboardTargetCell(
  currentCell: number,
  direction: KeyboardDirection,
  boardSize: number,
  legalCells: Set<number>,
): number {
  const row = Math.floor(currentCell / boardSize)
  const col = currentCell % boardSize
  const deltaByDirection: Record<KeyboardDirection, { row: number; col: number }> = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
  }
  const delta = deltaByDirection[direction]

  for (let step = 1; step < boardSize; step += 1) {
    const nextRow = row + delta.row * step
    const nextCol = col + delta.col * step
    if (nextRow < 0 || nextRow >= boardSize || nextCol < 0 || nextCol >= boardSize) {
      break
    }

    const nextCell = nextRow * boardSize + nextCol
    if (legalCells.has(nextCell)) {
      return nextCell
    }
  }

  return currentCell
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName.toLowerCase()
  return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'
}

function buildCpuThinkingFocusSequence(handSize: number, finalIndex: number, seed: number): number[] {
  if (handSize <= 0 || finalIndex < 0 || finalIndex >= handSize) {
    return []
  }

  if (handSize === 1) {
    return [finalIndex]
  }

  const targetFocusCount = Math.min(handSize, Math.max(2, 2 + (Math.abs(seed) % 3)))
  const otherIndexes = Array.from({ length: handSize }, (_, index) => index).filter((index) => index !== finalIndex)

  if (otherIndexes.length === 0) {
    return [finalIndex]
  }

  const startOffset = Math.abs(seed) % otherIndexes.length
  const rotatedOtherIndexes = [...otherIndexes.slice(startOffset), ...otherIndexes.slice(0, startOffset)]
  const prefix = rotatedOtherIndexes.slice(0, Math.max(0, targetFocusCount - 1))

  return [...prefix, finalIndex]
}

export function MatchPage() {
  const navigate = useNavigate()
  const { profile, currentMatch, startMatch, updateCurrentMatch, finalizeCurrentMatch } = useGame()
  const [selectedCard, setSelectedCard] = useState<CardId | null>(null)
  const [keyboardTargetCell, setKeyboardTargetCell] = useState<number | null>(null)
  const [selectedClaimCardId, setSelectedClaimCardId] = useState<CardId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [starterNeedleAngleDeg, setStarterNeedleAngleDeg] = useState(0)
  const [starterSpinSettled, setStarterSpinSettled] = useState(false)
  const [starterRevealComplete, setStarterRevealComplete] = useState(true)
  const [powerTargeting, setPowerTargeting] = useState<PowerTargetingState | null>(null)
  const [transientFireTargetCells, setTransientFireTargetCells] = useState<number[]>([])
  const [transientFireCastCells, setTransientFireCastCells] = useState<number[]>([])
  const [transientFloodTargetCells, setTransientFloodTargetCells] = useState<number[]>([])
  const [transientFloodCastCells, setTransientFloodCastCells] = useState<number[]>([])
  const [transientFreezeTargetCells, setTransientFreezeTargetCells] = useState<number[]>([])
  const [transientFreezeCastCells, setTransientFreezeCastCells] = useState<number[]>([])
  const [transientFreezeBlockedCells, setTransientFreezeBlockedCells] = useState<number[]>([])
  const [transientGroundCells, setTransientGroundCells] = useState<number[]>([])
  const [transientWaterPenaltyCells, setTransientWaterPenaltyCells] = useState<number[]>([])
  const [transientClashCells, setTransientClashCells] = useState<number[]>([])
  const [transientFlipEvents, setTransientFlipEvents] = useState<MoveFlipEvent[]>([])
  const [transientFlipEventVersion, setTransientFlipEventVersion] = useState(0)
  const [cpuThinkingCardIndex, setCpuThinkingCardIndex] = useState<number | null>(null)
  const [showVsOverlay, setShowVsOverlay] = useState(false)
  const [vsCells, setVsCells] = useState<number[]>([])
  const criticalVictorySoundPlayedMatchKeyRef = useRef<string | null>(null)
  const animationTimeoutIdsRef = useRef<number[]>([])
  const activeFlipEventVersionRef = useRef(0)

  const state = currentMatch?.state ?? null
  const activeQueue = currentMatch?.queue ?? 'normal'
  const tutorialSession = currentMatch?.queue === 'tutorial' ? currentMatch.tutorial ?? null : null
  const tutorialStep = tutorialSession && state ? tutorialSession.steps[state.turns] ?? null : null
  const tutorialExpectedPlayerStep = isTutorialPlayerStep(tutorialStep) ? tutorialStep : null
  const tutorialExpectedCpuStep = tutorialStep?.actor === 'cpu' ? tutorialStep : null
  const tutorialAllowedCardIdSet = useMemo(
    () => new Set(tutorialExpectedPlayerStep?.objective?.allowedCardIds ?? []),
    [tutorialExpectedPlayerStep?.objective?.allowedCardIds],
  )

  useEffect(() => {
    if (!currentMatch && !isFinishing) {
      navigate('/setup')
    }
  }, [currentMatch, isFinishing, navigate])

  const board = useMemo(() => {
    if (!currentMatch) {
      return []
    }

    return currentMatch.runtime.getCells().map((cell) =>
      cell.cardId && cell.owner ? { cardId: cell.cardId, owner: cell.owner } : null,
    )
  }, [currentMatch])

  const clearAnimationTimeouts = useCallback(() => {
    for (const timeoutId of animationTimeoutIdsRef.current) {
      window.clearTimeout(timeoutId)
    }
    animationTimeoutIdsRef.current = []
  }, [])

  const scheduleAnimationTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = window.setTimeout(() => {
      animationTimeoutIdsRef.current = animationTimeoutIdsRef.current.filter((id) => id !== timeoutId)
      callback()
    }, delayMs)
    animationTimeoutIdsRef.current.push(timeoutId)
  }, [])

  const queueBoardFlipEvents = useCallback(
    (events: MoveFlipEvent[]) => {
      activeFlipEventVersionRef.current += 1
      const currentVersion = activeFlipEventVersionRef.current
      setTransientFlipEvents(events)
      setTransientFlipEventVersion((version) => version + 1)

      if (events.length === 0) {
        return
      }

      scheduleAnimationTimeout(() => {
        if (activeFlipEventVersionRef.current === currentVersion) {
          setTransientFlipEvents([])
        }
      }, FLIP_EVENT_VISIBILITY_MS)
    },
    [scheduleAnimationTimeout],
  )

  const clearPowerTargetPrompt = useCallback(() => {
    setError((currentError) => (currentError === POWER_TARGET_PROMPT ? null : currentError))
  }, [])

  const resetTransientEffects = useCallback(() => {
    setTransientFireTargetCells([])
    setTransientFireCastCells([])
    setTransientFloodTargetCells([])
    setTransientFloodCastCells([])
    setTransientFreezeTargetCells([])
    setTransientFreezeCastCells([])
    setTransientFreezeBlockedCells([])
    setTransientWaterPenaltyCells([])
    setTransientClashCells([])
    setTransientFlipEvents([])
    setTransientFlipEventVersion(0)
    setShowVsOverlay(false)
    setVsCells([])
  }, [])

  const boardForRender = useMemo(() => {
    if (!powerTargeting) {
      return board
    }
    if (powerTargeting.placementCell < 0 || powerTargeting.placementCell >= board.length) {
      return board
    }
    if (board[powerTargeting.placementCell] !== null) {
      return board
    }
    const previewBoard = [...board]
    previewBoard[powerTargeting.placementCell] = { owner: 'player', cardId: powerTargeting.cardId }
    return previewBoard
  }, [board, powerTargeting])

  const legalPlayerMoves = useMemo(() => {
    if (!state) {
      return []
    }

    return listLegalMoves(state).filter((move) => move.actor === 'player')
  }, [state])

  const highlightedCells = useMemo(() => {
    if (!state || state.turn !== 'player' || state.status === 'finished') {
      return []
    }

    if (activeQueue === 'tutorial' && tutorialExpectedPlayerStep) {
      const guidedCells = tutorialExpectedPlayerStep.objective?.allowedCells ?? [tutorialExpectedPlayerStep.move.cell]
      return [...guidedCells]
    }

    if (!selectedCard) {
      return []
    }

    return legalPlayerMoves.filter((move) => move.cardId === selectedCard).map((move) => move.cell)
  }, [activeQueue, legalPlayerMoves, selectedCard, state, tutorialExpectedPlayerStep])
  const tutorialGuidedCells = useMemo(() => {
    if (activeQueue !== 'tutorial' || !tutorialExpectedPlayerStep) {
      return []
    }
    return tutorialExpectedPlayerStep.objective?.allowedCells ?? [tutorialExpectedPlayerStep.move.cell]
  }, [activeQueue, tutorialExpectedPlayerStep])

  const effectsView = useMemo(() => (state ? buildMatchEffectsViewModel(state) : undefined), [state])
  const resolveHandDisplayProps = useCallback(
    (actor: Actor, cardId: CardId) => {
      const displayStats = effectsView?.handDisplayStatsByActor[actor][cardId]
      if (!displayStats) {
        return { statOverrides: undefined, statTrends: undefined }
      }
      return {
        statOverrides: {
          top: displayStats.top.value,
          right: displayStats.right.value,
          bottom: displayStats.bottom.value,
          left: displayStats.left.value,
        },
        statTrends: {
          top: displayStats.top.trend,
          right: displayStats.right.trend,
          bottom: displayStats.bottom.trend,
          left: displayStats.left.trend,
        },
      }
    },
    [effectsView],
  )
  const isHandPoisoned = useCallback(
    (actor: Actor, cardId: CardId) => {
      return Boolean(
        effectsView?.handIndicatorsByActor[actor][cardId]?.some((indicator) => indicator.key === 'hand-poisoned'),
      )
    },
    [effectsView],
  )

  const legalMovesForSelectedCard = useMemo(() => {
    if (!selectedCard) {
      return []
    }

    return legalPlayerMoves.filter((move) => move.cardId === selectedCard)
  }, [legalPlayerMoves, selectedCard])

  const legalCellSetForSelectedCard = useMemo(
    () => new Set(legalMovesForSelectedCard.map((move) => move.cell)),
    [legalMovesForSelectedCard],
  )
  const powerTargetCellSet = useMemo(() => new Set(powerTargeting?.targetCells ?? []), [powerTargeting])

  useEffect(() => {
    return () => {
      clearAnimationTimeouts()
    }
  }, [clearAnimationTimeouts])

  const finishPreview = useMemo(() => {
    if (!currentMatch || !state || state.status !== 'finished') {
      return null
    }

    const result = resolveMatchResult(state)
    if (currentMatch.queue === 'tutorial') {
      return {
        queue: currentMatch.queue,
        result,
        rewards: {
          goldAwarded: 0,
          bonusGoldFromDuplicate: 0,
          bonusGoldFromDifficulty: 0,
          bonusGoldFromComboBounty: 0,
          bonusGoldFromCleanVictory: 0,
          bonusGoldFromSecondarySynergy: 0,
          bonusGoldFromCriticalVictory: 0,
          bonusGoldFromAutoDeck: 0,
          criticalVictory: false,
          droppedCardId: null,
          duplicateConverted: false,
          newlyUnlockedAchievements: [],
        },
        opponent: currentMatch.opponent,
        rankedMode: null,
        rankedUpdate: null,
      }
    }

    const claimedCpuCardId = result.winner === 'player' ? (selectedClaimCardId ?? undefined) : undefined
    const progression = applyMatchRewards(
      profile,
      result,
      currentMatch.cpuDeck,
      currentMatch.seed + state.turns,
      currentMatch.opponent.level,
      currentMatch.rewardMultiplier,
      claimedCpuCardId,
      { disableCardCapture: currentMatch.queue === 'tower' },
    )
    const rankedMode = currentMatch.queue === 'ranked' ? currentMatch.state.config.mode : null
    const rankedUpdate =
      currentMatch.queue === 'ranked' && rankedMode
        ? applyRankedMatchResult(progression.profile.rankedByMode[rankedMode], result.winner)
        : null

    return {
      queue: currentMatch.queue,
      result,
      rewards: progression.rewards,
      opponent: currentMatch.opponent,
      rankedMode,
      rankedUpdate,
    }
  }, [currentMatch, profile, selectedClaimCardId, state])
  const selectedClaimCardFragmentCount = selectedClaimCardId ? (profile.cardFragmentsById[selectedClaimCardId] ?? 0) : 0
  const selectedClaimCardFragmentCost = selectedClaimCardId ? getCardFragmentCost(selectedClaimCardId) : null

  const matchSeed = currentMatch?.seed ?? null
  const matchStatus = state?.status ?? null

  useEffect(() => {
    if (!finishPreview || !currentMatch || state?.status !== 'finished') {
      criticalVictorySoundPlayedMatchKeyRef.current = null
      return
    }

    if (!profile.settings.audioEnabled) {
      return
    }

    if (!finishPreview.rewards.criticalVictory) {
      return
    }

    const matchKey = `${currentMatch.seed}:${state.turns}`
    if (criticalVictorySoundPlayedMatchKeyRef.current === matchKey) {
      return
    }

    playCriticalVictorySound()
    criticalVictorySoundPlayedMatchKeyRef.current = matchKey
  }, [currentMatch, finishPreview, profile.settings.audioEnabled, state?.status, state?.turns])

  useEffect(() => {
    if (matchSeed === null || matchStatus === null || matchStatus === 'finished') {
      setStarterNeedleAngleDeg(0)
      setStarterSpinSettled(false)
      setStarterRevealComplete(true)
      return
    }
    if (state?.turns !== 0) {
      setStarterRevealComplete(true)
      return
    }

    const finalStarter: Actor = state?.turn ?? 'player'
    const finalAngle = finalStarter === 'player' ? 0 : 180
    const startAngle = ((matchSeed % 360) + 360) % 360

    const clockwiseDeltaToFinal = ((finalAngle - startAngle) % 360 + 360) % 360
    const totalTravelDeg = STARTER_BASE_TURNS * 360 + clockwiseDeltaToFinal

    setStarterNeedleAngleDeg(startAngle)
    setStarterSpinSettled(false)
    setStarterRevealComplete(false)

    let frameId: number | null = null
    let revealTimer: number | null = null
    let startTs: number | null = null

    const animate = (timestamp: number) => {
      if (startTs === null) {
        startTs = timestamp
      }

      const elapsed = timestamp - startTs
      const progress = Math.min(1, elapsed / STARTER_SPIN_DURATION_MS)
      const eased = 1 - (1 - progress) ** 3
      const angle = startAngle + totalTravelDeg * eased

      setStarterNeedleAngleDeg(angle)

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate)
        return
      }

      setStarterNeedleAngleDeg(finalAngle)
      setStarterSpinSettled(true)
      revealTimer = window.setTimeout(() => {
        setStarterRevealComplete(true)
      }, STARTER_REVEAL_HOLD_MS)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      if (revealTimer !== null) {
        window.clearTimeout(revealTimer)
      }
    }
  }, [matchSeed, matchStatus, state?.turn, state?.turns])

  const isStarterRollActive =
    !!currentMatch && !!state && state.status === 'active' && state.turns === 0 && !starterRevealComplete
  const isStarterRollSpinning = isStarterRollActive && !starterSpinSettled
  const displayedStarter: Actor = state?.turn ?? 'player'
  const turnVisualState: 'rolling' | Actor = isStarterRollActive ? 'rolling' : state?.turn ?? 'player'
  const nonTargetErrorMessage = error && error !== POWER_TARGET_PROMPT ? error : ''

  useEffect(() => {
    if (!currentMatch || state?.status !== 'finished') {
      setSelectedClaimCardId(null)
    }
  }, [currentMatch, state?.status])

  useEffect(() => {
    if (!powerTargeting) {
      return
    }
    if (!state || state.turn !== 'player' || state.status === 'finished' || selectedCard !== powerTargeting.cardId) {
      clearAnimationTimeouts()
      setPowerTargeting(null)
      setTransientFireTargetCells([])
      setTransientFloodTargetCells([])
      setTransientFreezeTargetCells([])
      clearPowerTargetPrompt()
    }
  }, [clearAnimationTimeouts, clearPowerTargetPrompt, powerTargeting, selectedCard, state])

  useEffect(() => {
    if (!starterRevealComplete || !currentMatch || !state || state.turn !== 'cpu' || state.status === 'finished') {
      setCpuThinkingCardIndex(null)
      return
    }

    const move = tutorialExpectedCpuStep?.move ?? selectCpuMove(state, currentMatch.opponent.aiProfile)
    if (currentMatch.queue === 'tutorial' && !tutorialExpectedCpuStep) {
      setCpuThinkingCardIndex(null)
      return
    }
    const thinkingCardIndex = state.hands.cpu.findIndex((cardId) => cardId === move.cardId)
    const focusSequence = buildCpuThinkingFocusSequence(state.hands.cpu.length, thinkingCardIndex, state.config.seed + state.turns)
    const focusTimeoutIds: number[] = []

    if (focusSequence.length > 0) {
      setCpuThinkingCardIndex(focusSequence[0] ?? null)
      const focusStepMs = Math.max(1, Math.floor(CPU_THINKING_DURATION_MS / focusSequence.length))
      for (let index = 1; index < focusSequence.length; index += 1) {
        const focusTimeoutId = window.setTimeout(() => {
          setCpuThinkingCardIndex(focusSequence[index] ?? null)
        }, focusStepMs * index)
        focusTimeoutIds.push(focusTimeoutId)
      }
    } else {
      setCpuThinkingCardIndex(null)
    }

    const timer = window.setTimeout(() => {
      try {
        setCpuThinkingCardIndex(null)
        const resolution = applyMoveDetailed(state, move)
        if (resolution.groundDebuffedCells.length > 0) {
          setTransientGroundCells(resolution.groundDebuffedCells)
          scheduleAnimationTimeout(() => {
            setTransientGroundCells([])
          }, GROUND_DEBUFF_VISUAL_DELAY_MS)
        }
        queueBoardFlipEvents(resolution.flipEvents)
        updateCurrentMatch(resolution.state)
      } catch (err) {
        setCpuThinkingCardIndex(null)
        const message = err instanceof Error ? err.message : 'CPU turn failed.'
        setError(message)
      }
    }, CPU_TURN_AFTER_FLIP_DELAY_MS)

    return () => {
      window.clearTimeout(timer)
      for (const timeoutId of focusTimeoutIds) {
        window.clearTimeout(timeoutId)
      }
      setCpuThinkingCardIndex(null)
    }
  }, [
    currentMatch,
    queueBoardFlipEvents,
    scheduleAnimationTimeout,
    starterRevealComplete,
    state,
    tutorialExpectedCpuStep,
    updateCurrentMatch,
  ])

  const isFourByFourMatch = state?.config.mode === '4x4'
  const isKeyboardControlEnabled =
    starterRevealComplete && !!state && state.status === 'active' && state.turn === 'player'

  useEffect(() => {
    if (!state || !isKeyboardControlEnabled) {
      return
    }

    const playerHand = state.hands.player
    const objectiveAllowedCardIds = tutorialExpectedPlayerStep?.objective?.allowedCardIds
    if (objectiveAllowedCardIds && objectiveAllowedCardIds.length > 0) {
      if (selectedCard && playerHand.includes(selectedCard) && objectiveAllowedCardIds.includes(selectedCard)) {
        return
      }

      const preferredCardId = tutorialExpectedPlayerStep?.move.cardId
      const prioritizedAllowedCardIds =
        preferredCardId && objectiveAllowedCardIds.includes(preferredCardId)
          ? [preferredCardId, ...objectiveAllowedCardIds.filter((cardId) => cardId !== preferredCardId)]
          : [...objectiveAllowedCardIds]
      const nextAllowedCardId = prioritizedAllowedCardIds.find((cardId) => playerHand.includes(cardId)) ?? null
      if (nextAllowedCardId && selectedCard !== nextAllowedCardId) {
        setSelectedCard(nextAllowedCardId)
      }
      if (nextAllowedCardId) {
        return
      }
    }

    const expectedCardId = tutorialExpectedPlayerStep?.move.cardId
    if (expectedCardId && playerHand.includes(expectedCardId)) {
      if (selectedCard !== expectedCardId) {
        setSelectedCard(expectedCardId)
      }
      return
    }
    const topCardId = playerHand[0] ?? null
    if (topCardId === null) {
      if (selectedCard !== null) {
        setSelectedCard(null)
      }
      return
    }

    if (selectedCard !== null && playerHand.includes(selectedCard)) {
      return
    }

    setSelectedCard(topCardId)
  }, [isKeyboardControlEnabled, selectedCard, state, tutorialExpectedPlayerStep])

  const resolvePlayerMove = useCallback(
    (move: Move) => {
      if (!state) {
        return
      }

      const card = getCard(move.cardId)
      const isWaterPenaltyMove =
        state.elementState?.mode === 'effects' &&
        state.elementState.floodedCell === move.cell &&
        card.elementId !== 'spectre'

      const commitResolvedState = (nextState: ReturnType<typeof applyMoveDetailed>['state'], flipEvents: MoveFlipEvent[] = []) => {
        setSelectedCard(null)
        setKeyboardTargetCell(null)
        setError(null)
        queueBoardFlipEvents(flipEvents)
        updateCurrentMatch(nextState)
      }

      if (isWaterPenaltyMove) {
        const resolution = applyMoveDetailed(state, move)
        if (resolution.groundDebuffedCells.length > 0) {
          setTransientGroundCells(resolution.groundDebuffedCells)
          scheduleAnimationTimeout(() => {
            setTransientGroundCells([])
          }, GROUND_DEBUFF_VISUAL_DELAY_MS)
        }
        setTransientWaterPenaltyCells([move.cell])
        setTransientClashCells([])
        setVsCells([])
        setShowVsOverlay(false)

        scheduleAnimationTimeout(() => {
          setTransientWaterPenaltyCells([])
          if (resolution.combatCells.length > 0) {
            setTransientClashCells(resolution.combatCells)
            setVsCells(resolution.combatCells)
            setShowVsOverlay(true)
            scheduleAnimationTimeout(() => {
              setTransientClashCells([])
              setShowVsOverlay(false)
              setVsCells([])
              commitResolvedState(resolution.state, resolution.flipEvents)
            }, WATER_CLASH_DELAY_MS)
            return
          }
          commitResolvedState(resolution.state, resolution.flipEvents)
        }, WATER_PENALTY_DELAY_MS)
        return
      }

      const resolution = applyMoveDetailed(state, move)
      if (resolution.groundDebuffedCells.length > 0) {
        setTransientGroundCells(resolution.groundDebuffedCells)
        scheduleAnimationTimeout(() => {
          setTransientGroundCells([])
        }, GROUND_DEBUFF_VISUAL_DELAY_MS)
      }
      commitResolvedState(resolution.state, resolution.flipEvents)
    },
    [queueBoardFlipEvents, scheduleAnimationTimeout, state, updateCurrentMatch],
  )

  const handleCellClick = useCallback(
    (cell: number) => {
      if (!state || !starterRevealComplete || state.turn !== 'player' || state.status === 'finished') {
        return
      }

      if (powerTargeting) {
        if (!powerTargeting.targetCells.includes(cell)) {
          return
        }
        const targetedMove: Move = {
          actor: 'player',
          cardId: powerTargeting.cardId,
          cell: powerTargeting.placementCell,
          powerTarget:
            powerTargeting.targetKind === 'targetCardCell'
              ? { targetCardCell: cell }
              : { targetCell: cell },
        }
        if (activeQueue === 'tutorial') {
          if (!tutorialExpectedPlayerStep) {
            setError('Attends l action guidee.')
            return
          }
          const validation = validateTutorialPlayerMove(targetedMove, tutorialExpectedPlayerStep)
          if (!validation.valid) {
            setError(getTutorialGuidanceError(tutorialExpectedPlayerStep, validation.reason))
            return
          }
        }
        setPowerTargeting(null)
        setTransientFireTargetCells([])
        setTransientFloodTargetCells([])
        setTransientFreezeTargetCells([])
        clearPowerTargetPrompt()

        if (powerTargeting.elementId === 'eau') {
          setTransientFloodCastCells([cell])
          scheduleAnimationTimeout(() => {
            setTransientFloodCastCells([])
            resolvePlayerMove(targetedMove)
          }, WATER_CAST_DELAY_MS)
          return
        }

        if (powerTargeting.elementId === 'glace') {
          setTransientFreezeCastCells([cell])
          scheduleAnimationTimeout(() => {
            setTransientFreezeCastCells([])
            resolvePlayerMove(targetedMove)
          }, ICE_CAST_DELAY_MS)
          return
        }

        if (powerTargeting.elementId === 'feu') {
          setTransientFireCastCells([cell])
          scheduleAnimationTimeout(() => {
            setTransientFireCastCells([])
            resolvePlayerMove(targetedMove)
          }, FIRE_CAST_DELAY_MS)
          return
        }

        resolvePlayerMove(targetedMove)
        return
      }

      if (!selectedCard) {
        setError('Select a card first.')
        return
      }

      try {
        const moveBase: Move = {
          actor: 'player',
          cardId: selectedCard,
          cell,
        }
        if (activeQueue === 'tutorial') {
          if (!tutorialExpectedPlayerStep) {
            setError('Attends l action guidee.')
            return
          }
          const validation = validateTutorialPlayerMove(moveBase, tutorialExpectedPlayerStep)
          if (!validation.valid) {
            setError(getTutorialGuidanceError(tutorialExpectedPlayerStep, validation.reason))
            return
          }
        }
        const card = getCard(selectedCard)
        const targetOptions = listMovePowerTargetOptions(state, moveBase)

        if (targetOptions && targetOptions.cells.length > 0) {
          setPowerTargeting({
            targetKind: targetOptions.kind,
            elementId: card.elementId,
            cardId: selectedCard,
            placementCell: cell,
            targetCells: [...targetOptions.cells],
          })

          setTransientFireTargetCells(card.elementId === 'feu' && targetOptions.kind === 'targetCardCell' ? [...targetOptions.cells] : [])
          setTransientFloodTargetCells(card.elementId === 'eau' && targetOptions.kind === 'targetCell' ? [...targetOptions.cells] : [])
          setTransientFreezeTargetCells(card.elementId === 'glace' && targetOptions.kind === 'targetCell' ? [...targetOptions.cells] : [])
          setError(POWER_TARGET_PROMPT)
          return
        }

        resolvePlayerMove(moveBase)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Move failed.'
        if (isFrozenCellForActorError(message)) {
          setTransientFreezeBlockedCells([cell])
          scheduleAnimationTimeout(() => {
            setTransientFreezeBlockedCells([])
          }, FREEZE_BLOCKED_FLASH_DELAY_MS)
        }
        setError(message)
      }
    },
    [
      clearPowerTargetPrompt,
      resolvePlayerMove,
      scheduleAnimationTimeout,
      selectedCard,
      starterRevealComplete,
      state,
      activeQueue,
      powerTargeting,
      tutorialExpectedPlayerStep,
    ],
  )

  useEffect(() => {
    if (powerTargeting) {
      setKeyboardTargetCell((currentTarget) => {
        if (currentTarget !== null && powerTargetCellSet.has(currentTarget)) {
          return currentTarget
        }
        return powerTargeting.targetCells[0] ?? null
      })
      return
    }

    if (!selectedCard) {
      setKeyboardTargetCell(null)
      return
    }

    setKeyboardTargetCell((currentTarget) => {
      if (currentTarget !== null && legalCellSetForSelectedCard.has(currentTarget)) {
        return currentTarget
      }
      return legalMovesForSelectedCard[0]?.cell ?? null
    })
  }, [legalCellSetForSelectedCard, legalMovesForSelectedCard, powerTargetCellSet, powerTargeting, selectedCard])

  useEffect(() => {
    if (!state || !isKeyboardControlEnabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableElement(event.target)) {
        return
      }

      const digit = getDigitFromKeyboardCode(event.code)
      if (digit !== null) {
        event.preventDefault()
        const cardId = state.hands.player[digit - 1]
        if (cardId) {
          if (
            activeQueue === 'tutorial' &&
            tutorialExpectedPlayerStep?.objective?.allowedCardIds &&
            !tutorialAllowedCardIdSet.has(cardId)
          ) {
            setError(getTutorialGuidanceError(tutorialExpectedPlayerStep))
            return
          }
          setSelectedCard(cardId)
          setError(null)
        }
        return
      }

      const direction = getKeyboardDirection(event.code)
      if (direction) {
        if (powerTargeting) {
          if (powerTargeting.targetCells.length === 0) {
            return
          }
          event.preventDefault()
          const startCell = keyboardTargetCell ?? powerTargeting.targetCells[0]!
          const boardSize = getModeSpec(state.config.mode).boardSize
          const nextCell = getNextKeyboardTargetCell(startCell, direction, boardSize, powerTargetCellSet)
          setKeyboardTargetCell(nextCell)
          setError(null)
          return
        }

        if (!selectedCard || legalMovesForSelectedCard.length === 0) {
          return
        }

        event.preventDefault()
        const startCell = keyboardTargetCell ?? legalMovesForSelectedCard[0]!.cell
        const boardSize = getModeSpec(state.config.mode).boardSize
        const nextCell = getNextKeyboardTargetCell(startCell, direction, boardSize, legalCellSetForSelectedCard)
        setKeyboardTargetCell(nextCell)
        setError(null)
        return
      }

      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        if (powerTargeting) {
          if (keyboardTargetCell === null || !powerTargetCellSet.has(keyboardTargetCell)) {
            return
          }
          event.preventDefault()
          handleCellClick(keyboardTargetCell)
          return
        }

        if (!selectedCard || keyboardTargetCell === null || !legalCellSetForSelectedCard.has(keyboardTargetCell)) {
          return
        }

        event.preventDefault()
        handleCellClick(keyboardTargetCell)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    handleCellClick,
    isKeyboardControlEnabled,
    keyboardTargetCell,
    legalCellSetForSelectedCard,
    legalMovesForSelectedCard,
    powerTargetCellSet,
    powerTargeting,
    selectedCard,
    state,
    activeQueue,
    tutorialAllowedCardIdSet,
    tutorialExpectedPlayerStep,
  ])

  if (!currentMatch || !state) {
    return null
  }

  const focusedCell = isKeyboardControlEnabled ? keyboardTargetCell : null
  const previewPlacementCell = powerTargeting?.placementCell ?? null
  const targetableCells = powerTargeting?.targetKind === 'targetCardCell' ? powerTargeting.targetCells : []
  const vsBoardSize = getModeSpec(state.config.mode).boardSize

  const handleFinish = () => {
    const isTowerQueue = currentMatch.queue === 'tower'
    const isTutorialQueue = currentMatch.queue === 'tutorial'
    const isPlayerVictory = finishPreview?.result.winner === 'player'
    if (!isTowerQueue && !isTutorialQueue && isPlayerVictory && !selectedClaimCardId) {
      setError('Choose one opponent card to claim before continuing.')
      return
    }

    setIsFinishing(true)
    finalizeCurrentMatch(selectedClaimCardId ?? undefined)
    navigate(isTutorialQueue ? '/rules' : '/results')
  }

  const handleRematch = () => {
    if (!currentMatch) {
      return
    }
    if (currentMatch.queue === 'tower') {
      setError('Tower matches cannot be rematched. Continue the ascent from results.')
      return
    }
    if (currentMatch.queue === 'tutorial') {
      setError('Relance ce tutoriel depuis Rules.')
      return
    }

    const rematchDeck = [...currentMatch.state.config.playerDeck]
    const rematchRules = { ...currentMatch.state.rules }

    setIsFinishing(true)

    try {
      finalizeCurrentMatch(selectedClaimCardId ?? undefined)
      const rematchOptions =
        currentMatch.queue === 'normal' ? { normalOpponentLevel: currentMatch.opponent.level } : undefined
      startMatch(currentMatch.queue, currentMatch.state.config.mode, rematchDeck, rematchRules, rematchOptions)
      setSelectedCard(null)
      setSelectedClaimCardId(null)
      setError(null)
      setPowerTargeting(null)
      clearAnimationTimeouts()
      resetTransientEffects()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start rematch.'
      setError(message)
      navigate('/results')
    } finally {
      setIsFinishing(false)
    }
  }

  return (
    <section className={`panel match-panel ${isFourByFourMatch ? 'match-panel--4x4' : 'match-panel--3x3'}`}>
      <div className="match-arena">
        <aside
          className={`match-lane match-lane--cpu ${turnVisualState === 'cpu' ? 'is-turn-active' : ''}`}
          data-testid="match-lane-cpu"
        >
          <img
            className="match-lane-hand-art match-lane-hand-art--cpu"
            src={matchLaneArtwork.cpuHand}
            alt=""
            aria-hidden="true"
            data-testid="match-lane-art-cpu"
          />
          <h2>CPU Hand ({state.rules.open ? 'Open' : 'Hidden'})</h2>
          {effectsView ? <MatchLaneTypeStrip actor="cpu" slots={effectsView.laneTypeSlotsByActor.cpu} mode={effectsView.mode} /> : null}
          <p className="small match-opponent-badge match-opponent-badge--lane" data-testid="match-opponent-badge">
            CPU L{currentMatch.opponent.level} • Score {currentMatch.opponent.deckScore}
          </p>
          <div
            className={`hand-row hand-row--cpu ${isFourByFourMatch ? 'hand-row--two-columns' : 'hand-row--cpu-3x3'}`}
            aria-label="CPU hand"
          >
            {state.hands.cpu.map((cardId, index) => {
              const card = getCard(cardId)
              const { statOverrides, statTrends } = resolveHandDisplayProps('cpu', cardId)
              const poisoned = isHandPoisoned('cpu', cardId)
              return (
                <TriadCard
                  key={`${cardId}-${index}`}
                  card={card}
                  context="hand-cpu"
                  owned={state.rules.open}
                  selected={cpuThinkingCardIndex === index}
                  statOverrides={statOverrides}
                  statTrends={statTrends}
                  className={poisoned ? 'is-hand-poisoned' : undefined}
                />
              )
            })}
          </div>
        </aside>

        <section className="match-board-stage" data-testid="match-board-stage">
          <div className="match-board-hud match-board-hud--floating">
            <p className="small match-turn-indicator" data-testid="match-turn-indicator" data-turn={turnVisualState}>
              {isStarterRollActive
                ? 'Determining first turn...'
                : `Turn ${state.turns + 1}: ${state.turn === 'player' ? 'Player' : 'CPU'}`}
            </p>
            <div className="match-turn-beacon" data-testid="match-turn-beacon" data-turn={turnVisualState}>
              <span
                className={`match-turn-beacon__pill match-turn-beacon__pill--cpu ${turnVisualState === 'cpu' ? 'is-active' : ''}`}
                data-testid="match-turn-beacon-cpu"
              >
                CPU
              </span>
              <span className={`match-turn-beacon__core ${turnVisualState === 'rolling' ? 'is-active' : ''}`} aria-hidden="true" />
              <span
                className={`match-turn-beacon__pill match-turn-beacon__pill--player ${
                  turnVisualState === 'player' ? 'is-active' : ''
                }`}
                data-testid="match-turn-beacon-player"
              >
                PLAYER
              </span>
            </div>
            {currentMatch.queue === 'tower' && currentMatch.tower ? (
              <>
                <p className="small" data-testid="match-tower-floor">
                  Tower Floor {currentMatch.tower.floor} · Checkpoint {currentMatch.tower.checkpointFloor}
                </p>
                <p className="small" data-testid="match-tower-boss">
                  {currentMatch.tower.boss ? 'Boss Floor' : 'Normal Floor'}
                </p>
                <p className="small" data-testid="match-tower-relics">
                  Relics {Object.values(currentMatch.tower.relics).reduce((sum, count) => sum + count, 0)}
                </p>
              </>
            ) : null}
            <div className="match-rules-row">
              <RuleBadges rules={state.rules} />
              {isKeyboardControlEnabled ? (
                <div className="match-keyboard-help" data-testid="match-keyboard-help">
                  <button
                    type="button"
                    className="match-keyboard-help__trigger"
                    data-testid="match-keyboard-help-trigger"
                    aria-label="Aide clavier"
                  >
                    ?
                  </button>
                  <p className="small match-keyboard-help__tooltip">
                    Clavier: 1-8 carte • Flèches case • Entrée poser
                    {selectedCard && focusedCell !== null ? ` • Cible ${focusedCell + 1}` : ''}
                  </p>
                </div>
              ) : null}
            </div>
            {tutorialSession ? (
              <div className="match-tutorial-focus" data-testid="match-tutorial-focus">
                <p className="small" data-testid="match-tutorial-title">
                  {tutorialSession.title}
                </p>
                <p className="small match-tutorial-focus__chapter" data-testid="match-tutorial-chapter">
                  {tutorialStep?.chapterLabel ?? tutorialSession.description}
                </p>
                <p className="small match-tutorial-focus__goal" data-testid="match-tutorial-goal">
                  But: controle plus de cartes que le CPU a la fin.
                </p>
                <p className="small" data-testid="match-tutorial-progress">
                  Etape {Math.min(state.turns + 1, tutorialSession.steps.length)}/{tutorialSession.steps.length}
                </p>
                <p className="small" data-testid="match-tutorial-hint">
                  {tutorialStep?.hint ?? 'Termine la partie pour valider le tutoriel.'}
                </p>
                <p className="small match-tutorial-focus__objective" data-testid="match-tutorial-objective">
                  {getTutorialObjectiveText(tutorialExpectedPlayerStep)}
                </p>
                <p className="small match-tutorial-focus__why" data-testid="match-tutorial-why">
                  {tutorialStep?.why ?? tutorialStep?.hint ?? 'Termine la partie pour valider le tutoriel.'}
                </p>
              </div>
            ) : null}
          </div>
          <div className="match-board-viewport">
            <PixiBoard
              board={boardForRender}
              highlightedCells={highlightedCells}
              tutorialGuidedCells={tutorialGuidedCells}
              transientGroundCells={transientGroundCells}
              interactive={starterRevealComplete && state.turn === 'player' && state.status !== 'finished'}
              onCellClick={handleCellClick}
              turnActor={state.turn}
              status={state.status}
              focusedCell={focusedCell}
              effectsView={effectsView}
              transientFireTargetCells={transientFireTargetCells}
              transientFireCastCells={transientFireCastCells}
              transientFloodTargetCells={transientFloodTargetCells}
              transientFloodCastCells={transientFloodCastCells}
              transientFreezeTargetCells={transientFreezeTargetCells}
              transientFreezeCastCells={transientFreezeCastCells}
              transientFreezeBlockedCells={transientFreezeBlockedCells}
              transientWaterPenaltyCells={transientWaterPenaltyCells}
              transientClashCells={transientClashCells}
              flipEvents={transientFlipEvents}
              flipEventVersion={transientFlipEventVersion}
              targetableCells={targetableCells}
              previewPlacementCell={previewPlacementCell}
            />
            {showVsOverlay ? (
              <div className="match-vs-overlay" data-testid="match-vs-overlay">
                {vsCells.map((cell, index) => {
                  const row = Math.floor(cell / vsBoardSize)
                  const col = cell % vsBoardSize
                  return (
                    <span
                      key={`${cell}:${index}`}
                      className="match-vs-badge"
                      data-testid={`match-vs-badge-${index}`}
                      style={{
                        left: `${((col + 0.5) / vsBoardSize) * 100}%`,
                        top: `${((row + 0.5) / vsBoardSize) * 100}%`,
                      }}
                    >
                      VS
                    </span>
                  )
                })}
              </div>
            ) : null}
          </div>
          {powerTargeting ? (
            <>
              {powerTargeting.elementId === 'eau' ? (
                <p className="match-flood-target-hint" data-testid="match-flood-target-hint">
                  Choisissez la case a inonder.
                </p>
              ) : powerTargeting.elementId === 'feu' ? (
                <p className="match-flood-target-hint" data-testid="match-fire-target-hint">
                  Choisissez la carte ennemie a bruler.
                </p>
              ) : powerTargeting.elementId === 'glace' ? (
                <p className="match-flood-target-hint" data-testid="match-freeze-target-hint">
                  Choisissez la case a geler.
                </p>
              ) : (
                <p className="match-flood-target-hint" data-testid="match-power-target-hint">
                  Choisissez une cible.
                </p>
              )}
            </>
          ) : null}
          {isStarterRollActive && (
            <div
              className={`match-starter-overlay ${isStarterRollSpinning ? 'is-rolling' : 'is-reveal'}`}
              role="status"
              aria-live="polite"
              data-testid="match-starter-overlay"
            >
              <p className="small match-starter-label">{isStarterRollSpinning ? 'First Turn Clock' : 'First Turn Selected'}</p>
              <div
                className={`match-starter-clock ${isStarterRollSpinning ? 'is-rolling' : 'is-reveal'}`}
                data-testid="match-starter-clock"
              >
                <div className="match-starter-clock-ring" />
                <p
                  className={`match-starter-side match-starter-side--left ${
                    starterSpinSettled && displayedStarter === 'cpu' ? 'is-selected' : ''
                  }`}
                  data-testid="match-starter-side-opponent"
                >
                  Opponent
                </p>
                <p
                  className={`match-starter-side match-starter-side--right ${
                    starterSpinSettled && displayedStarter === 'player' ? 'is-selected' : ''
                  }`}
                  data-testid="match-starter-side-you"
                >
                  You
                </p>
                <div
                  className="match-starter-needle"
                  data-testid="match-starter-needle"
                  style={{ transform: `translateY(-50%) rotate(${starterNeedleAngleDeg}deg)` }}
                />
                <div className="match-starter-hub" />
              </div>
              <p
                className={`match-starter-result ${
                  isStarterRollSpinning ? 'match-starter-result--pending' : `match-starter-result--${displayedStarter}`
                }`}
              >
                {isStarterRollSpinning ? 'Rolling...' : displayedStarter === 'player' ? 'You start' : 'CPU starts'}
              </p>
            </div>
          )}
        </section>

        <aside
          className={`match-lane match-lane--player ${turnVisualState === 'player' ? 'is-turn-active' : ''}`}
          data-testid="match-lane-player"
        >
          <img
            className="match-lane-hand-art match-lane-hand-art--player"
            src={matchLaneArtwork.playerHand}
            alt=""
            aria-hidden="true"
            data-testid="match-lane-art-player"
          />
          <h2>Your Hand</h2>
          {effectsView ? (
            <MatchLaneTypeStrip actor="player" slots={effectsView.laneTypeSlotsByActor.player} mode={effectsView.mode} />
          ) : null}
          <div
            className={`hand-row hand-row--player ${isFourByFourMatch ? 'hand-row--two-columns' : ''}`}
            aria-label="Player hand"
          >
            {state.hands.player.map((cardId, index) => {
              const card = getCard(cardId)
              const { statOverrides, statTrends } = resolveHandDisplayProps('player', cardId)
              const poisoned = isHandPoisoned('player', cardId)
              const hasDuplicateInHand = state.hands.player.filter((entry) => entry === cardId).length > 1
              const testId = hasDuplicateInHand ? `player-card-${cardId}-${index}` : `player-card-${cardId}`
              const cardBlockedByTutorialObjective =
                activeQueue === 'tutorial' &&
                tutorialExpectedPlayerStep?.objective?.allowedCardIds &&
                !tutorialAllowedCardIdSet.has(cardId)
              return (
                <TriadCard
                  card={card}
                  context="hand-player"
                  key={`${cardId}-${index}`}
                  selected={selectedCard === cardId}
                  statOverrides={statOverrides}
                  statTrends={statTrends}
                  className={poisoned ? 'is-hand-poisoned' : undefined}
                  interactive
                  onClick={() => setSelectedCard(cardId)}
                  disabled={!starterRevealComplete || state.turn !== 'player' || state.status === 'finished' || cardBlockedByTutorialObjective}
                  testId={testId}
                />
              )
            })}
          </div>
        </aside>
      </div>

      <p
        className={`error match-status-message ${nonTargetErrorMessage ? 'is-visible' : ''}`}
        data-testid="match-status-message"
        aria-live="polite"
      >
        {nonTargetErrorMessage}
      </p>

      {finishPreview && (
        <div className="match-finish-modal-backdrop">
          <div
            className="match-finish-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-finish-title"
            data-testid="match-finish-modal"
          >
            <header className="finish-score-header finish-score-header--modal">
              <div className="finish-score finish-score--player">
                <span className="finish-score__label">YOU</span>
                <strong className="finish-score__value" data-testid="match-finish-player-score">
                  {finishPreview.result.playerCount}
                </strong>
              </div>
              <div className="finish-score finish-score--cpu">
                <span className="finish-score__label">CPU</span>
                <strong className="finish-score__value" data-testid="match-finish-cpu-score">
                  {finishPreview.result.cpuCount}
                </strong>
              </div>
              <h2
                id="match-finish-title"
                className={`finish-outcome finish-outcome--${finishPreview.result.winner}`}
                data-testid="match-finish-outcome"
              >
                {getOutcomeLabel(finishPreview.result.winner)}
              </h2>
            </header>
            {finishPreview.rewards.criticalVictory ? <p className="small">Critical Victory</p> : null}
            <p className="small">
              Queue:{' '}
              {finishPreview.queue === 'ranked'
                ? 'Ranked'
                : finishPreview.queue === 'tower'
                  ? 'Tower'
                  : finishPreview.queue === 'tutorial'
                    ? 'Tutorial'
                    : 'Normal'}
            </p>

            <div className="stat-row">
              <span>Gold Earned</span>
              <strong>
                +{finishPreview.rewards.goldAwarded}
                {formatGoldBonusDetails(finishPreview.rewards)}
              </strong>
            </div>

            <div className="stat-row">
              <span>Opponent</span>
              <strong>
                CPU L{finishPreview.opponent.level} ({finishPreview.opponent.aiProfile})
              </strong>
            </div>

            {finishPreview.result.winner === 'player' && currentMatch.queue !== 'tower' && currentMatch.queue !== 'tutorial' ? (
              <div className="result-block">
                <h2>Card Fragment</h2>
                <p className="small">Choose 1 opponent card to recover 1 fragment (not a full card)</p>
                <div className="setup-selected-cards match-claim-grid" aria-label="Claim card selection">
                  {currentMatch.cpuDeck.map((cardId) => {
                    const card = getCard(cardId)
                    return (
                      <TriadCard
                        key={`claim-${cardId}`}
                        card={card}
                        context="setup"
                        className="setup-preview-card match-claim-card"
                        selected={selectedClaimCardId === cardId}
                        showNew={!profile.ownedCardIds.includes(cardId)}
                        newBadgeVariant="claim"
                        interactive
                        onClick={() => {
                          setSelectedClaimCardId(cardId)
                          setError(null)
                        }}
                        testId={`match-claim-card-${cardId}`}
                      />
                    )
                  })}
                </div>
                <p data-testid="match-fragment-selection-status">
                  {selectedClaimCardId
                    ? `Selected: ${selectedClaimCardId.toUpperCase()} - Current fragments: ${selectedClaimCardFragmentCount}/${selectedClaimCardFragmentCost}`
                    : 'Select one card to continue. Reward: 1 fragment (not a full card).'}
                </p>
              </div>
            ) : (
              <div className="result-block">
                <h2>Card Fragment</h2>
                <p>{currentMatch.queue === 'tower' ? 'Tower mode does not grant card fragments.' : 'No fragment gained this match.'}</p>
              </div>
            )}

            {finishPreview.rankedUpdate && finishPreview.rankedMode ? (
              <RankedLpRecap mode={finishPreview.rankedMode} update={finishPreview.rankedUpdate} animated context="modal" testIdPrefix="match-ranked" />
            ) : null}

            <div className="actions">
              {currentMatch.queue !== 'tower' && currentMatch.queue !== 'tutorial' ? (
                <button
                  type="button"
                  className="button"
                  onClick={handleRematch}
                  data-testid="restart-match-button"
                >
                  Rematch
                </button>
              ) : null}
              <button
                type="button"
                className="button button-primary"
                onClick={handleFinish}
                data-testid="finish-match-button"
                disabled={
                  currentMatch.queue !== 'tower' &&
                  currentMatch.queue !== 'tutorial' &&
                  finishPreview.result.winner === 'player' &&
                  !selectedClaimCardId
                }
              >
                {currentMatch.queue === 'tower'
                  ? finishPreview.result.winner === 'player'
                    ? 'Continue Ascension'
                    : 'End Run'
                  : currentMatch.queue === 'tutorial'
                    ? 'Retourner a Rules'
                    : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
