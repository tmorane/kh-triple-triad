import { Link, Navigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'

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
  const { lastMatchSummary } = useGame()

  if (!lastMatchSummary) {
    return <Navigate to="/" replace />
  }

  const { queue, result, rewards, opponent, rankedUpdate } = lastMatchSummary

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
      <p className="small">Queue: {queue === 'ranked' ? 'Ranked' : 'Normal'}</p>
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
        <h2>Claimed Card</h2>
        <p>
          {rewards.droppedCardId
            ? `Claimed card: ${rewards.droppedCardId.toUpperCase()}`
          : 'No card claimed this match.'}
        </p>
      </div>

      {rankedUpdate ? (
        <div className="result-block">
          <h2>Ranked LP</h2>
          <p>
            {rankedUpdate.deltaLp >= 0 ? '+' : ''}
            {rankedUpdate.deltaLp} LP
            {' • '}
            {rankedUpdate.next.tier.toUpperCase()}
            {rankedUpdate.next.division ? ` ${rankedUpdate.next.division}` : ''}
            {' • '}
            {rankedUpdate.next.lp} LP
          </p>
        </div>
      ) : null}

      <div className="actions">
        <Link className="button button-primary" to="/setup" data-testid="play-again-button">
          Play Again
        </Link>
        <Link className="button" to="/collection">
          Collection
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
