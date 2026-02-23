import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import { selectCpuMove } from '../../domain/match/ai'
import { applyMove, listLegalMoves, resolveMatchResult } from '../../domain/match/engine'
import { getAchievementDefinition } from '../../domain/progression/achievements'
import { applyMatchRewards } from '../../domain/progression/rewards'
import { applyRankRewards, type RankRewardGrant } from '../../domain/progression/ranks'
import type { CardId } from '../../domain/types'
import { PixiBoard } from '../components/PixiBoard'
import { RuleBadges } from '../components/RuleBadges'
import { TriadCard } from '../components/TriadCard'

function formatRankReward(grant: RankRewardGrant): string {
  const packRewards = Object.entries(grant.reward.packs)
    .filter(([, count]) => count && count > 0)
    .map(([rarity, count]) => `${count} ${rarity} pack${count === 1 ? '' : 's'}`)

  if (packRewards.length === 0) {
    return `${grant.rankName}: +${grant.reward.gold} gold`
  }

  return `${grant.rankName}: +${grant.reward.gold} gold + ${packRewards.join(', ')}`
}

function formatGoldBonusDetails(rewards: {
  bonusGoldFromDuplicate: number
  bonusGoldFromDifficulty: number
  bonusGoldFromAutoDeck: number
}): string {
  const parts: string[] = []
  if (rewards.bonusGoldFromDifficulty > 0) {
    parts.push(`+${rewards.bonusGoldFromDifficulty} difficulty`)
  }
  if (rewards.bonusGoldFromDuplicate > 0) {
    parts.push(`+${rewards.bonusGoldFromDuplicate} duplicate`)
  }
  if (rewards.bonusGoldFromAutoDeck > 0) {
    parts.push(`+${rewards.bonusGoldFromAutoDeck} auto deck`)
  }
  return parts.length > 0 ? ` (${parts.join(', ')})` : ''
}

export function MatchPage() {
  const navigate = useNavigate()
  const { profile, currentMatch, startMatch, updateCurrentMatch, finalizeCurrentMatch } = useGame()
  const [selectedCard, setSelectedCard] = useState<CardId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)

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
    const rankRewardPreview = applyRankRewards(progression.profile)

    return {
      result,
      rewards: {
        ...progression.rewards,
        rankRewards: rankRewardPreview.granted,
      },
      newlyOwnedCards: progression.newlyOwnedCards,
      opponent: currentMatch.opponent,
    }
  }, [currentMatch, profile, state])

  useEffect(() => {
    if (!currentMatch || !state || state.turn !== 'cpu' || state.status === 'finished') {
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
  }, [currentMatch, state, updateCurrentMatch])

  if (!currentMatch || !state) {
    return null
  }

  const handleCellClick = (cell: number) => {
    if (state.turn !== 'player' || state.status === 'finished') {
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
      startMatch(rematchDeck, rematchRules)
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
              Turn {state.turns + 1}: {state.turn === 'player' ? 'Player' : 'CPU'}
            </p>
            <p className="small" data-testid="match-opponent-badge">
              CPU L{currentMatch.opponent.level} • Score {currentMatch.opponent.deckScore}
            </p>
            <RuleBadges rules={state.rules} />
          </div>
          <PixiBoard
            board={board}
            highlightedCells={highlightedCells}
            interactive={state.turn === 'player' && state.status !== 'finished'}
            onCellClick={handleCellClick}
            turnActor={state.turn}
            status={state.status}
          />
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
                  disabled={state.turn !== 'player' || state.status === 'finished'}
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

            <div className="stat-row">
              <span>Player Cards</span>
              <strong>{finishPreview.result.playerCount}</strong>
            </div>
            <div className="stat-row">
              <span>CPU Cards</span>
              <strong>{finishPreview.result.cpuCount}</strong>
            </div>
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

            <div className="result-block">
              <h2>Rank Rewards</h2>
              {finishPreview.rewards.rankRewards.length > 0 ? (
                <ul>
                  {finishPreview.rewards.rankRewards.map((grant) => (
                    <li key={grant.rankId}>{formatRankReward(grant)}</li>
                  ))}
                </ul>
              ) : (
                <p>No rank rewards earned this match.</p>
              )}
            </div>

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
