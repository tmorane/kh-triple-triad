import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { cardPool } from '../../domain/cards/cardPool'
import { hasExactlyFiveUniqueCards } from '../../domain/cards/decks'
import { achievementCatalog } from '../../domain/progression/achievements'
import { computeRankState, rankRewardCatalog, rankTiers, type RankReward, type RankRewardGrant } from '../../domain/progression/ranks'
import { getPackPrice } from '../../domain/progression/shop'

const GOLD_MILESTONES = [150, 200, 300, 450, 600, 800, 1000]
const numberFormat = new Intl.NumberFormat('en-US')

interface ProfileMetric {
  icon: string
  label: string
  value: string
  sub: string
  progress?: number
  testId?: string
}

interface NextBestAction {
  title: string
  description: string
  ctaLabel: string
  to: '/setup' | '/match' | '/packs' | '/shop'
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function getInitials(deckName: string): string {
  const letters = deckName
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')

  return letters || 'TT'
}

function formatRewardLine(grant: RankRewardGrant): string {
  return `${grant.rankName}: ${formatRankRewardText(grant.reward)}`
}

function formatRankRewardText(reward: RankReward): string {
  const packRewards = Object.entries(reward.packs)
    .filter(([, count]) => count && count > 0)
    .map(([rarity, count]) => `${count} ${rarity} pack${count === 1 ? '' : 's'}`)

  if (packRewards.length === 0) {
    return `+${reward.gold} gold`
  }

  return `+${reward.gold} gold + ${packRewards.join(', ')}`
}

function computeNextBestAction(input: {
  hasActiveMatch: boolean
  totalOwnedPacks: number
  isSelectedDeckReady: boolean
  gold: number
}): NextBestAction {
  if (input.hasActiveMatch) {
    return {
      title: 'Continue match',
      description: 'Your duel is still active. Jump back in and finish it.',
      ctaLabel: 'Continue',
      to: '/match',
    }
  }

  if (input.totalOwnedPacks > 0) {
    return {
      title: 'Open packs',
      description: `You have ${input.totalOwnedPacks} pack${input.totalOwnedPacks === 1 ? '' : 's'} ready to reveal.`,
      ctaLabel: 'Open Packs',
      to: '/packs',
    }
  }

  if (!input.isSelectedDeckReady) {
    return {
      title: 'Finish deck',
      description: 'Select exactly five cards in your active deck before starting a duel.',
      ctaLabel: 'Edit Deck',
      to: '/setup',
    }
  }

  if (input.gold >= getPackPrice('common')) {
    return {
      title: 'Buy common pack',
      description: 'Spend 60 gold for new cards and stronger deck options.',
      ctaLabel: 'Go to Shop',
      to: '/shop',
    }
  }

  return {
    title: 'Start a duel',
    description: 'You are ready to play. Launch a new match now.',
    ctaLabel: 'Play',
    to: '/setup',
  }
}

export function HomePage() {
  const { profile, currentMatch, resetProfile, recentRankRewards, clearRecentRankRewards } = useGame()
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [isRankCatalogOpen, setIsRankCatalogOpen] = useState(false)

  useEffect(() => {
    if (!isRankCatalogOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRankCatalogOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRankCatalogOpen])

  const played = profile.stats.played
  const wins = profile.stats.won
  const losses = Math.max(played - wins, 0)
  const winRatePercent = played > 0 ? Math.round((wins / played) * 100) : 0
  const winRateLabel = played > 0 ? `${winRatePercent}%` : '---'

  const rankState = computeRankState(profile)
  const rankProgressPercent = clampPercent(Math.round(rankState.progressToNext * 100))
  const rankProgressLabel = rankState.nextRank
    ? `${rankProgressPercent}% to ${rankState.nextRank.id} ${rankState.nextRank.name}`
    : 'Maximum rank reached'

  const selectedDeck = profile.deckSlots.find((slot) => slot.id === profile.selectedDeckSlotId) ?? profile.deckSlots[0]
  const totalOwnedPacks = Object.values(profile.packInventoryByRarity).reduce((sum, count) => sum + count, 0)
  const isSelectedDeckReady = hasExactlyFiveUniqueCards(selectedDeck.cards)
  const launchAction = computeNextBestAction({
    hasActiveMatch: Boolean(currentMatch),
    totalOwnedPacks,
    isSelectedDeckReady,
    gold: profile.gold,
  })
  const playActionTarget = currentMatch ? '/match' : '/setup'
  const playActionLabel = currentMatch ? 'Continue' : 'Play'
  const activeDeckCount = selectedDeck.cards.length
  const ownedCards = profile.ownedCardIds.length
  const totalCards = cardPool.length
  const unlockedAchievements = profile.achievements.length
  const totalAchievements = achievementCatalog.length
  const nextGoldTarget = GOLD_MILESTONES.find((milestone) => profile.gold < milestone) ?? null
  const panelStyle = {
    '--home-win-rate': `${winRatePercent}%`,
    '--home-rank-progress': `${rankProgressPercent}%`,
  } as CSSProperties

  const metrics: ProfileMetric[] = [
    {
      icon: rankState.currentRank.id,
      label: 'Current Rank',
      value: rankState.currentRank.name,
      sub: rankProgressLabel,
      progress: rankProgressPercent,
    },
    {
      icon: 'G',
      label: 'Gold Reserve',
      value: numberFormat.format(profile.gold),
      sub: nextGoldTarget ? `${numberFormat.format(nextGoldTarget - profile.gold)} to next tier` : 'Top treasury tier reached',
      progress: nextGoldTarget ? clampPercent(Math.round((profile.gold / nextGoldTarget) * 100)) : 100,
      testId: 'gold-value',
    },
    {
      icon: 'C',
      label: 'Card Collection',
      value: `${ownedCards}/${totalCards}`,
      sub: `${clampPercent(Math.round((ownedCards / totalCards) * 100))}% complete`,
      progress: clampPercent(Math.round((ownedCards / totalCards) * 100)),
    },
    {
      icon: 'A',
      label: 'Achievements',
      value: `${unlockedAchievements}/${totalAchievements}`,
      sub: `${clampPercent(Math.round((unlockedAchievements / totalAchievements) * 100))}% unlocked`,
      progress: clampPercent(Math.round((unlockedAchievements / totalAchievements) * 100)),
    },
    {
      icon: 'D',
      label: selectedDeck.name,
      value: `${activeDeckCount}/5`,
      sub: 'Active deck slots filled',
      progress: clampPercent(Math.round((activeDeckCount / 5) * 100)),
    },
    {
      icon: 'S',
      label: 'Current Streak',
      value: `${profile.stats.streak}`,
      sub: `Best streak: ${profile.stats.bestStreak}`,
    },
    {
      icon: 'R',
      label: 'Battle Record',
      value: `${wins}W / ${losses}L`,
      sub: `${played} matches played`,
    },
  ]

  return (
    <section className="panel home-panel" style={panelStyle}>
      <div className="home-panel__glow" aria-hidden="true" />
      <p className="home-eyebrow">Player Profile</p>

      {recentRankRewards.length > 0 ? (
        <section className="home-rank-rewards-banner" data-testid="home-rank-rewards-banner" aria-live="polite">
          <div>
            <p className="home-rank-rewards-title">Rank rewards earned</p>
            <ul>
              {recentRankRewards.map((grant) => (
                <li key={grant.rankId}>{formatRewardLine(grant)}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className="button"
            data-testid="home-rank-rewards-dismiss"
            onClick={clearRecentRankRewards}
          >
            Dismiss
          </button>
        </section>
      ) : null}

      <section className="home-next-action-card" data-testid="home-next-action-card">
        <p className="home-next-action-kicker">Next best action</p>
        <h2 data-testid="home-next-action-title">{launchAction.title}</h2>
        <p className="small" data-testid="home-next-action-description">
          {launchAction.description}
        </p>
        <Link className="button button-primary" to={launchAction.to} data-testid="home-next-action-cta">
          {launchAction.ctaLabel}
        </Link>
      </section>

      <nav className="home-quick-actions" aria-label="Quick actions">
        <Link className="button button-primary" to={playActionTarget} data-testid="home-quick-action-play">
          {playActionLabel}
        </Link>
        <Link className="button" to="/packs" data-testid="home-quick-action-packs">
          Open Packs
        </Link>
        <Link className="button" to="/setup" data-testid="home-quick-action-setup">
          Edit Deck
        </Link>
      </nav>

      <div className="home-hero">
        <div className="home-identity">
          <div className="home-avatar" aria-hidden="true">
            <span>{getInitials(selectedDeck.name)}</span>
          </div>

          <div className="home-identity-copy">
            <h1>KH Triple Triad</h1>
            <button
              type="button"
              className="home-rank-trigger"
              data-testid="home-rank-trigger"
              aria-haspopup="dialog"
              aria-expanded={isRankCatalogOpen}
              aria-controls="home-rank-modal"
              onClick={() => setIsRankCatalogOpen(true)}
            >
              <p className="lead">{rankState.currentRank.name}</p>
              <p className="home-rank-line">
                {rankState.currentRank.id} rank • score {numberFormat.format(rankState.score)}
              </p>
            </button>
          </div>
        </div>

        <div className="home-hero-aside">
          <aside className="home-winrate-card" aria-label="Win rate">
            <p className="home-winrate-label">Win Rate</p>
            <div className="home-winrate-ring">
              <span>{winRateLabel}</span>
            </div>
            <p className="home-winrate-caption">
              {wins} wins in {played} matches
            </p>
          </aside>

          <button
            type="button"
            className="home-reset-trigger"
            data-testid="home-reset-trigger"
            onClick={() => setIsResetConfirmOpen(true)}
          >
            Reset Profile Data
          </button>
        </div>
      </div>

      <div className="home-metrics-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="home-metric-card">
            <p className="home-metric-label">
              <span className="home-metric-icon" aria-hidden="true">
                {metric.icon}
              </span>
              {metric.label}
            </p>
            <p className="home-metric-value" data-testid={metric.testId}>
              {metric.value}
            </p>
            <p className="home-metric-sub">{metric.sub}</p>
            {metric.progress !== undefined ? (
              <div className="home-meter" aria-hidden="true">
                <span style={{ width: `${metric.progress}%` }} />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {isResetConfirmOpen ? (
        <section className="home-reset-confirmation" aria-live="polite">
          <p className="small">This resets your game profile data. This action cannot be undone.</p>
          <div className="home-reset-confirmation__actions">
            <button
              type="button"
              className="button button-danger"
              data-testid="home-reset-confirm"
              onClick={() => {
                resetProfile()
                setIsResetConfirmOpen(false)
              }}
            >
              Confirmer reset
            </button>
            <button
              type="button"
              className="button"
              data-testid="home-reset-cancel"
              onClick={() => setIsResetConfirmOpen(false)}
            >
              Annuler
            </button>
          </div>
        </section>
      ) : null}

      {isRankCatalogOpen ? (
        <div
          className="home-rank-modal-backdrop"
          role="presentation"
          data-testid="home-rank-modal-backdrop"
          onClick={() => setIsRankCatalogOpen(false)}
        >
          <section
            className="home-rank-modal"
            id="home-rank-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-rank-modal-title"
            data-testid="home-rank-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="home-rank-modal-head">
              <div>
                <h2 id="home-rank-modal-title">Rank Progression</h2>
                <p className="small">All grades and one-time rewards.</p>
              </div>
              <button
                type="button"
                className="button"
                data-testid="home-rank-modal-close"
                onClick={() => setIsRankCatalogOpen(false)}
              >
                Close
              </button>
            </div>

            <ul className="home-rank-modal-list">
              {rankTiers.map((tier) => {
                const reward = rankRewardCatalog[tier.id]
                let statusLabel = 'Locked'
                let statusClassName = 'locked'

                if (rankState.score >= tier.minScore) {
                  statusLabel = 'Reached'
                  statusClassName = 'reached'
                } else if (tier.id === rankState.currentRank.id) {
                  statusLabel = 'In progress'
                  statusClassName = 'progress'
                }

                return (
                  <li key={tier.id} className="home-rank-modal-row" data-testid={`home-rank-modal-row-${tier.id}`}>
                    <div className="home-rank-modal-rank">
                      <p className="home-rank-modal-rank-id">{tier.id}</p>
                      <p className="home-rank-modal-rank-name">{tier.name}</p>
                    </div>
                    <p className="home-rank-modal-reward" data-testid={`home-rank-modal-reward-${tier.id}`}>
                      {formatRankRewardText(reward)}
                    </p>
                    <p
                      className={`home-rank-modal-status home-rank-modal-status--${statusClassName}`}
                      data-testid={`home-rank-modal-status-${tier.id}`}
                    >
                      {statusLabel}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      ) : null}
    </section>
  )
}
