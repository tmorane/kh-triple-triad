import { Link, Navigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getAchievementDefinition } from '../../domain/progression/achievements'
import type { RankRewardGrant } from '../../domain/progression/ranks'

function formatRankReward(grant: RankRewardGrant): string {
  const packRewards = Object.entries(grant.reward.packs)
    .filter(([, count]) => count && count > 0)
    .map(([rarity, count]) => `${count} ${rarity} pack${count === 1 ? '' : 's'}`)

  if (packRewards.length === 0) {
    return `${grant.rankName}: +${grant.reward.gold} gold`
  }

  return `${grant.rankName}: +${grant.reward.gold} gold + ${packRewards.join(', ')}`
}

export function ResultsPage() {
  const { lastMatchSummary } = useGame()

  if (!lastMatchSummary) {
    return <Navigate to="/" replace />
  }

  const { result, rewards, newlyOwnedCards } = lastMatchSummary

  return (
    <section className="panel">
      <h1>Results</h1>
      <p className="lead">Winner: {result.winner === 'draw' ? 'Draw' : result.winner === 'player' ? 'Player' : 'CPU'}</p>

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
          {rewards.bonusGoldFromDuplicate > 0 ? ` (+${rewards.bonusGoldFromDuplicate} duplicate)` : ''}
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

      <div className="result-block">
        <h2>Rank Rewards</h2>
        {rewards.rankRewards.length > 0 ? (
          <ul>
            {rewards.rankRewards.map((grant) => (
              <li key={grant.rankId}>{formatRankReward(grant)}</li>
            ))}
          </ul>
        ) : (
          <p>No rank rewards earned this match.</p>
        )}
      </div>

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
