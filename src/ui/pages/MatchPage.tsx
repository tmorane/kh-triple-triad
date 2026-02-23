import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import { selectCpuMove } from '../../domain/match/ai'
import { applyMove, listLegalMoves, resolveMatchResult } from '../../domain/match/engine'
import { getModeSpec } from '../../domain/match/modeSpec'
import { applyMatchRewards } from '../../domain/progression/rewards'
import { applyRankedMatchResult } from '../../domain/progression/ranked'
import type { Actor, CardId } from '../../domain/types'
import { playCriticalVictorySound } from '../audio/criticalVictorySound'
import { PixiBoard } from '../components/PixiBoard'
import { RankedLpRecap } from '../components/RankedLpRecap'
import { RuleBadges } from '../components/RuleBadges'
import { TriadCard } from '../components/TriadCard'

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

type KeyboardDirection = 'up' | 'down' | 'left' | 'right'

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
  const criticalVictorySoundPlayedMatchKeyRef = useRef<string | null>(null)

  const state = currentMatch?.state ?? null

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

  const legalPlayerMoves = useMemo(() => {
    if (!state) {
      return []
    }

    return listLegalMoves(state).filter((move) => move.actor === 'player')
  }, [state])

  const highlightedCells = useMemo(() => {
    if (!state || !selectedCard || state.turn !== 'player' || state.status === 'finished') {
      return []
    }

    return legalPlayerMoves.filter((move) => move.cardId === selectedCard).map((move) => move.cell)
  }, [legalPlayerMoves, selectedCard, state])

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

  const finishPreview = useMemo(() => {
    if (!currentMatch || !state || state.status !== 'finished') {
      return null
    }

    const result = resolveMatchResult(state)
    const claimedCpuCardId = result.winner === 'player' ? (selectedClaimCardId ?? undefined) : undefined
    const progression = applyMatchRewards(
      profile,
      result,
      currentMatch.cpuDeck,
      currentMatch.seed + state.turns,
      currentMatch.opponent.level,
      currentMatch.rewardMultiplier,
      claimedCpuCardId,
    )
    const rankedUpdate =
      currentMatch.queue === 'ranked' ? applyRankedMatchResult(progression.profile.ranked, result.winner) : null

    return {
      queue: currentMatch.queue,
      result,
      rewards: progression.rewards,
      opponent: currentMatch.opponent,
      rankedUpdate,
    }
  }, [currentMatch, profile, selectedClaimCardId, state])

  const matchSeed = currentMatch?.seed ?? null
  const matchStatus = state?.status ?? null

  useEffect(() => {
    if (!finishPreview || !currentMatch || state?.status !== 'finished') {
      criticalVictorySoundPlayedMatchKeyRef.current = null
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
  }, [currentMatch, finishPreview, state?.status, state?.turns])

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

  useEffect(() => {
    if (!currentMatch || state?.status !== 'finished') {
      setSelectedClaimCardId(null)
    }
  }, [currentMatch, state?.status])

  useEffect(() => {
    if (!starterRevealComplete || !currentMatch || !state || state.turn !== 'cpu' || state.status === 'finished') {
      return
    }

    const timer = window.setTimeout(() => {
      try {
        const move = selectCpuMove(state, currentMatch.opponent.aiProfile)
        const nextState = applyMove(state, move)
        updateCurrentMatch(nextState)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'CPU turn failed.'
        setError(message)
      }
    }, 350)

    return () => {
      window.clearTimeout(timer)
    }
  }, [currentMatch, starterRevealComplete, state, updateCurrentMatch])

  if (!currentMatch || !state) {
    return null
  }

  const isFourByFourMatch = state.config.mode === '4x4'
  const isKeyboardControlEnabled = starterRevealComplete && state.status === 'active' && state.turn === 'player'

  useEffect(() => {
    if (!isKeyboardControlEnabled) {
      return
    }

    const topCardId = state.hands.player[0] ?? null
    if (topCardId === null) {
      if (selectedCard !== null) {
        setSelectedCard(null)
      }
      return
    }

    if (selectedCard !== null && state.hands.player.includes(selectedCard)) {
      return
    }

    setSelectedCard(topCardId)
  }, [isKeyboardControlEnabled, selectedCard, state.hands.player])

  const handleCellClick = (cell: number) => {
    if (!starterRevealComplete || state.turn !== 'player' || state.status === 'finished') {
      return
    }
    if (!selectedCard) {
      setError('Select a card first.')
      return
    }

    try {
      const nextState = applyMove(state, {
        actor: 'player',
        cardId: selectedCard,
        cell,
      })
      setSelectedCard(null)
      setKeyboardTargetCell(null)
      setError(null)
      updateCurrentMatch(nextState)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Move failed.'
      setError(message)
    }
  }

  useEffect(() => {
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
  }, [legalCellSetForSelectedCard, legalMovesForSelectedCard, selectedCard])

  useEffect(() => {
    if (!isKeyboardControlEnabled) {
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
          setSelectedCard(cardId)
          setError(null)
        }
        return
      }

      const direction = getKeyboardDirection(event.code)
      if (direction) {
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
    selectedCard,
    state,
  ])

  const focusedCell = isKeyboardControlEnabled && selectedCard ? keyboardTargetCell : null

  const handleFinish = () => {
    const isPlayerVictory = finishPreview?.result.winner === 'player'
    if (isPlayerVictory && !selectedClaimCardId) {
      setError('Choose one opponent card to claim before continuing.')
      return
    }

    setIsFinishing(true)
    finalizeCurrentMatch(selectedClaimCardId ?? undefined)
    navigate('/results')
  }

  const handleRematch = () => {
    if (!currentMatch) {
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
        <aside className="match-lane match-lane--cpu" data-testid="match-lane-cpu">
          <h2>CPU Hand (Open)</h2>
          <div className={`hand-row hand-row--cpu ${isFourByFourMatch ? 'hand-row--two-columns' : ''}`} aria-label="CPU hand">
            {state.hands.cpu.map((cardId) => {
              const card = getCard(cardId)
              return <TriadCard key={cardId} card={card} context="hand-cpu" />
            })}
          </div>
        </aside>

        <section className="match-board-stage" data-testid="match-board-stage">
          <div className="match-board-hud">
            <p className="small match-turn-indicator" data-testid="match-turn-indicator">
              {isStarterRollActive
                ? 'Determining first turn...'
                : `Turn ${state.turns + 1}: ${state.turn === 'player' ? 'Player' : 'CPU'}`}
            </p>
            {isKeyboardControlEnabled ? (
              <p className="small match-keyboard-help" data-testid="match-keyboard-help">
                Clavier: 1-8 carte • Flèches case • Entrée poser
                {selectedCard && focusedCell !== null ? ` • Cible ${focusedCell + 1}` : ''}
              </p>
            ) : null}
            <p className="small" data-testid="match-opponent-badge">
              CPU L{currentMatch.opponent.level} • Score {currentMatch.opponent.deckScore}
            </p>
            <RuleBadges rules={state.rules} />
          </div>
          <PixiBoard
            board={board}
            highlightedCells={highlightedCells}
            interactive={starterRevealComplete && state.turn === 'player' && state.status !== 'finished'}
            onCellClick={handleCellClick}
            turnActor={state.turn}
            status={state.status}
            focusedCell={focusedCell}
          />
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

        <aside className="match-lane match-lane--player" data-testid="match-lane-player">
          <h2>Your Hand</h2>
          <div
            className={`hand-row hand-row--player ${isFourByFourMatch ? 'hand-row--two-columns' : ''}`}
            aria-label="Player hand"
          >
            {state.hands.player.map((cardId) => {
              const card = getCard(cardId)
              return (
                <TriadCard
                  card={card}
                  context="hand-player"
                  key={cardId}
                  selected={selectedCard === cardId}
                  interactive
                  onClick={() => setSelectedCard(cardId)}
                  disabled={!starterRevealComplete || state.turn !== 'player' || state.status === 'finished'}
                  testId={`player-card-${cardId}`}
                />
              )
            })}
          </div>
        </aside>
      </div>

      {error && <p className="error">{error}</p>}

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
            <p className="small">Queue: {finishPreview.queue === 'ranked' ? 'Ranked' : 'Normal'}</p>

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

            {finishPreview.result.winner === 'player' ? (
              <div className="result-block">
                <h2>Claimed Card</h2>
                <p className="small">Choose 1 opponent card to claim</p>
                <div className="match-claim-grid" aria-label="Claim card selection">
                  {currentMatch.cpuDeck.map((cardId) => {
                    const card = getCard(cardId)
                    return (
                      <TriadCard
                        key={`claim-${cardId}`}
                        card={card}
                        context="setup"
                        className="match-claim-card"
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
                <p>{selectedClaimCardId ? `Selected: ${selectedClaimCardId.toUpperCase()}` : 'Select one card to continue.'}</p>
              </div>
            ) : (
              <div className="result-block">
                <h2>Claimed Card</h2>
                <p>No card claimed this match.</p>
              </div>
            )}

            {finishPreview.rankedUpdate ? (
              <RankedLpRecap update={finishPreview.rankedUpdate} animated context="modal" testIdPrefix="match-ranked" />
            ) : null}

            <div className="actions">
              <button
                type="button"
                className="button"
                onClick={handleRematch}
                data-testid="restart-match-button"
              >
                Rematch
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleFinish}
                data-testid="finish-match-button"
                disabled={finishPreview.result.winner === 'player' && !selectedClaimCardId}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
