import { Link, Navigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getAchievementDefinition } from '../../domain/progression/achievements'

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

export function ResultsPage() {
  const { lastMatchSummary } = useGame()

  if (!lastMatchSummary) {
    return <Navigate to="/" replace />
  }

  const { queue, result, rewards, newlyOwnedCards, opponent, rankedUpdate } = lastMatchSummary

  return (
    <section className="panel">
      <h1>Results</h1>
      <p className="lead">Winner: {result.winner === 'draw' ? 'Draw' : result.winner === 'player' ? 'Player' : 'CPU'}</p>
      {rewards.criticalVictory ? <p className="small">Critical Victory</p> : null}
      <p className="small">Queue: {queue === 'ranked' ? 'Ranked' : 'Normal'}</p>

      <div className="stat-row">
        <span>Player Cards</span>
        <strong>{result.playerCount}</strong>
      </div>
      <div className="stat-row">
        <span>CPU Cards</span>
        <strong>{result.cpuCount}</strong>
      </div>
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
        <h2>Drops</h2>
        <p>
          {rewards.droppedCardId
            ? rewards.duplicateConverted
              ? `${rewards.droppedCardId.toUpperCase()} converted to gold.`
              : `New card: ${rewards.droppedCardId.toUpperCase()}`
            : 'No card drop this match.'}
        </p>
      </div>

      <div className="result-block">
        <h2>Achievements</h2>
        {rewards.newlyUnlockedAchievements.length > 0 ? (
          <ul>
            {rewards.newlyUnlockedAchievements.map((id) => (
              <li key={id}>{getAchievementDefinition(id).title}</li>
            ))}
          </ul>
        ) : (
          <p>No new achievements.</p>
        )}
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

      {newlyOwnedCards.length > 0 && (
        <div className="result-block">
          <h2>New Cards</h2>
          <p>{newlyOwnedCards.map((cardId) => cardId.toUpperCase()).join(', ')}</p>
        </div>
      )}

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
