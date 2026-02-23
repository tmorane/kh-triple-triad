import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import { selectCpuMove } from '../../domain/match/ai'
import { applyMove, listLegalMoves, resolveMatchResult } from '../../domain/match/engine'
import { getAchievementDefinition } from '../../domain/progression/achievements'
import { applyMatchRewards } from '../../domain/progression/rewards'
import { applyRankedMatchResult } from '../../domain/progression/ranked'
import type { Actor, CardId } from '../../domain/types'
import { playCriticalVictorySound } from '../audio/criticalVictorySound'
import { PixiBoard } from '../components/PixiBoard'
import { RuleBadges } from '../components/RuleBadges'
import { TriadCard } from '../components/TriadCard'

function formatGoldBonusDetails(rewards: {
  bonusGoldFromDuplicate: number
  bonusGoldFromDifficulty: number
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

export function MatchPage() {
  const navigate = useNavigate()
  const { profile, currentMatch, startMatch, updateCurrentMatch, finalizeCurrentMatch } = useGame()
  const [selectedCard, setSelectedCard] = useState<CardId | null>(null)
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
      return Array.from({ length: 9 }, () => null)
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

  const finishPreview = useMemo(() => {
    if (!currentMatch || !state || state.status !== 'finished') {
      return null
    }

    const result = resolveMatchResult(state)
    const progression = applyMatchRewards(
      profile,
      result,
      currentMatch.cpuDeck,
      currentMatch.seed + state.turns,
      currentMatch.opponent.level,
      currentMatch.rewardMultiplier,
    )
    const rankedUpdate =
      currentMatch.queue === 'ranked' ? applyRankedMatchResult(progression.profile.ranked, result.winner) : null

    return {
      queue: currentMatch.queue,
      result,
      rewards: progression.rewards,
      newlyOwnedCards: progression.newlyOwnedCards,
      opponent: currentMatch.opponent,
      rankedUpdate,
    }
  }, [currentMatch, profile, state])

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
  }, [matchSeed, matchStatus, state?.turn])

  const isStarterRollActive =
    !!currentMatch && !!state && state.status === 'active' && state.turns === 0 && !starterRevealComplete
  const isStarterRollSpinning = isStarterRollActive && !starterSpinSettled
  const displayedStarter: Actor = state?.turn ?? 'player'

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
        cell: cell as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
      })
      setSelectedCard(null)
      setError(null)
      updateCurrentMatch(nextState)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Move failed.'
      setError(message)
    }
  }

  const handleFinish = () => {
    setIsFinishing(true)
    finalizeCurrentMatch()
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
      finalizeCurrentMatch()
      startMatch(currentMatch.queue, rematchDeck, rematchRules)
      setSelectedCard(null)
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
    <section className="panel match-panel">
      <div className="match-arena">
        <aside className="match-lane match-lane--cpu" data-testid="match-lane-cpu">
          <h2>CPU Hand (Open)</h2>
          <div className="hand-row hand-row--cpu" aria-label="CPU hand">
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
          <div className="hand-row hand-row--player" aria-label="Player hand">
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
            <h2 id="match-finish-title">Match Finished</h2>
            <p className="lead">
              Winner: {finishPreview.result.winner === 'draw' ? 'Draw' : finishPreview.result.winner === 'player' ? 'Player' : 'CPU'}
            </p>
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

            <div className="result-block">
              <h2>Drops</h2>
              <p>
                {finishPreview.rewards.droppedCardId
                  ? finishPreview.rewards.duplicateConverted
                    ? `${finishPreview.rewards.droppedCardId.toUpperCase()} converted to gold.`
                    : `New card: ${finishPreview.rewards.droppedCardId.toUpperCase()}`
                  : 'No card drop this match.'}
              </p>
            </div>

            <div className="result-block">
              <h2>Achievements</h2>
              {finishPreview.rewards.newlyUnlockedAchievements.length > 0 ? (
                <ul>
                  {finishPreview.rewards.newlyUnlockedAchievements.map((id) => (
                    <li key={id}>{getAchievementDefinition(id).title}</li>
                  ))}
                </ul>
              ) : (
                <p>No new achievements.</p>
              )}
            </div>

            {finishPreview.rankedUpdate ? (
              <div className="result-block">
                <h2>Ranked LP</h2>
                <p>
                  {finishPreview.rankedUpdate.deltaLp >= 0 ? '+' : ''}
                  {finishPreview.rankedUpdate.deltaLp} LP
                  {' • '}
                  {finishPreview.rankedUpdate.next.tier.toUpperCase()}
                  {finishPreview.rankedUpdate.next.division ? ` ${finishPreview.rankedUpdate.next.division}` : ''}
                  {' • '}
                  {finishPreview.rankedUpdate.next.lp} LP
                </p>
              </div>
            ) : null}

            {finishPreview.newlyOwnedCards.length > 0 && (
              <div className="result-block">
                <h2>New Cards</h2>
                <p>{finishPreview.newlyOwnedCards.map((cardId) => cardId.toUpperCase()).join(', ')}</p>
              </div>
            )}

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
