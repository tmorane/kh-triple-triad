import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCardFragmentCost } from '../../domain/progression/fragments'
import type { CardId } from '../../domain/types'
import { RankedLpRecap } from '../components/RankedLpRecap'

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

function getOutcomeLabel(winner: 'player' | 'cpu' | 'draw'): 'WIN' | 'LOSE' | 'DRAW' {
  if (winner === 'player') {
    return 'WIN'
  }
  if (winner === 'cpu') {
    return 'LOSE'
  }
  return 'DRAW'
}

export function ResultsPage() {
  const navigate = useNavigate()
  const { profile, lastMatchSummary, towerRun, selectTowerReward, continueTowerRun } = useGame()
  const [towerError, setTowerError] = useState<string | null>(null)
  const [swapOutCardId, setSwapOutCardId] = useState<CardId | null>(towerRun?.deck[0] ?? null)

  if (!lastMatchSummary) {
    return <Navigate to="/" replace />
  }

  const { queue, result, rewards, opponent, rankedMode, rankedUpdate, tower } = lastMatchSummary
  const isTowerQueue = queue === 'tower' && tower
  const pendingReward = tower?.pendingReward ?? null
  const effectiveSwapOutCardId =
    swapOutCardId && (towerRun?.deck ?? []).includes(swapOutCardId) ? swapOutCardId : (towerRun?.deck[0] ?? null)

  const handleTowerChoice = (choiceId: string) => {
    if (!tower || !pendingReward || !selectTowerReward) {
      return
    }

    try {
      if (pendingReward.kind === 'swap') {
        selectTowerReward(choiceId, effectiveSwapOutCardId ?? undefined)
      } else {
        selectTowerReward(choiceId)
      }
      setTowerError(null)
    } catch (error) {
      setTowerError(error instanceof Error ? error.message : 'Unable to select tower reward.')
    }
  }

  const handleTowerNextFloor = () => {
    if (!continueTowerRun) {
      return
    }

    try {
      continueTowerRun()
      setTowerError(null)
      navigate('/match')
    } catch (error) {
      setTowerError(error instanceof Error ? error.message : 'Unable to continue tower run.')
    }
  }

  return (
    <section className="panel">
      <header className="finish-score-header">
        <div className="finish-score finish-score--player">
          <span className="finish-score__label">YOU</span>
          <strong className="finish-score__value" data-testid="results-player-score">
            {result.playerCount}
          </strong>
        </div>
        <div className="finish-score finish-score--cpu">
          <span className="finish-score__label">CPU</span>
          <strong className="finish-score__value" data-testid="results-cpu-score">
            {result.cpuCount}
          </strong>
        </div>
        <h1 className={`finish-outcome finish-outcome--${result.winner}`} data-testid="results-outcome">
          {getOutcomeLabel(result.winner)}
        </h1>
      </header>
      {rewards.criticalVictory ? <p className="small">Critical Victory</p> : null}
      <p className="small">Queue: {queue === 'ranked' ? 'Ranked' : queue === 'tower' ? 'Tower' : queue === 'tutorial' ? 'Tutorial' : 'Normal'}</p>
      <div className="stat-row">
        <span>Gold Earned</span>
        <strong>
          +{rewards.goldAwarded}
          {formatGoldBonusDetails(rewards)}
        </strong>
      </div>
      <div className="stat-row">
        <span>Opponent</span>
        <strong>
          CPU L{opponent.level} ({opponent.aiProfile})
        </strong>
      </div>

      <div className="result-block">
        <h2>Card Fragment</h2>
        <p>
          {queue === 'tower'
            ? 'Tower mode does not grant card fragments.'
            : queue === 'tutorial'
              ? 'Tutorial mode does not grant card fragments.'
            : rewards.droppedCardId
              ? `You recovered 1 card fragment: ${rewards.droppedCardId.toUpperCase()}.`
              : 'No fragment gained this match.'}
        </p>
        {queue !== 'tower' && queue !== 'tutorial' && rewards.droppedCardId ? (
          <p className="small" data-testid="results-fragment-total">
            Fragment progress: {profile.cardFragmentsById[rewards.droppedCardId] ?? 0}/{getCardFragmentCost(rewards.droppedCardId)}
          </p>
        ) : null}
      </div>

      {isTowerQueue ? (
        <div className="result-block" data-testid="results-tower-summary">
          <h2>Tower Progress</h2>
          <p className="small" data-testid="results-tower-floor">
            Floor {tower.floor} · Checkpoint {tower.checkpointFloor}
          </p>
          <p className="small" data-testid="results-tower-status">
            {tower.status === 'continue' ? 'Run active' : tower.status === 'cleared' ? 'Tower cleared' : 'Run failed'}
          </p>

          {pendingReward ? (
            <div className="result-block" data-testid="results-tower-reward-offer">
              <h2>{pendingReward.kind === 'relic' ? 'Choose a Relic' : 'Choose a Swap'}</h2>

              {pendingReward.kind === 'swap' ? (
                <div className="result-block">
                  <p className="small">Select a card to replace</p>
                  <div className="actions">
                    {(towerRun?.deck ?? []).map((cardId) => (
                      <button
                        key={`swap-out-${cardId}`}
                        type="button"
                        className={`button ${effectiveSwapOutCardId === cardId ? 'button-primary' : ''}`}
                        onClick={() => setSwapOutCardId(cardId)}
                        data-testid={`results-tower-swap-out-${cardId}`}
                      >
                        {cardId.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="actions">
                {pendingReward.kind === 'relic'
                  ? pendingReward.choices.map((choice) => (
                      <button
                        key={`tower-choice-${choice.id}`}
                        type="button"
                        className="button"
                        onClick={() => handleTowerChoice(choice.id)}
                        data-testid={`results-tower-choice-${choice.id}`}
                      >
                        {choice.title}
                      </button>
                    ))
                  : pendingReward.choices.map((choice) => (
                      <button
                        key={`tower-choice-${choice.cardId}`}
                        type="button"
                        className="button"
                        onClick={() => handleTowerChoice(choice.cardId)}
                        data-testid={`results-tower-choice-${choice.cardId}`}
                      >
                        {choice.title} ({choice.cardId.toUpperCase()})
                      </button>
                    ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {towerError ? <p className="error">{towerError}</p> : null}

      {rankedUpdate && rankedMode ? (
        <RankedLpRecap mode={rankedMode} update={rankedUpdate} animated={false} context="results" testIdPrefix="results-ranked" />
      ) : null}

      <div className="actions">
        {isTowerQueue && tower.status === 'continue' && !tower.pendingReward ? (
          <button type="button" className="button button-primary" onClick={handleTowerNextFloor} data-testid="results-tower-next-floor">
            Next Floor
          </button>
        ) : (
          <Link className="button button-primary" to="/setup" data-testid="play-again-button">
            Play Again
          </Link>
        )}
        <Link className="button" to="/pokedex">
          Pokédex
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
