import type { CSSProperties } from 'react'
import { useState } from 'react'
import { useGame } from '../../app/useGame'
import { cardPool } from '../../domain/cards/cardPool'
import { achievementCatalog } from '../../domain/progression/achievements'

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

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function getProfileTitle(played: number, winRatePercent: number): string {
  if (played < 3) {
    return 'Rookie Duelist'
  }
  if (winRatePercent >= 70) {
    return 'Master Tactician'
  }
  if (winRatePercent >= 55) {
    return 'Seasoned Strategist'
  }
  if (winRatePercent >= 40) {
    return 'Rising Challenger'
  }
  return 'Field Learner'
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

export function HomePage() {
  const { profile, resetProfile } = useGame()
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

  const played = profile.stats.played
  const wins = profile.stats.won
  const losses = Math.max(played - wins, 0)
  const winRatePercent = played > 0 ? Math.round((wins / played) * 100) : 0
  const winRateLabel = played > 0 ? `${winRatePercent}%` : '---'
  const profileTitle = getProfileTitle(played, winRatePercent)
  const selectedDeck = profile.deckSlots.find((slot) => slot.id === profile.selectedDeckSlotId) ?? profile.deckSlots[0]
  const activeDeckCount = selectedDeck.cards.length
  const ownedCards = profile.ownedCardIds.length
  const totalCards = cardPool.length
  const unlockedAchievements = profile.achievements.length
  const totalAchievements = achievementCatalog.length
  const nextGoldTarget = GOLD_MILESTONES.find((milestone) => profile.gold < milestone) ?? null
  const panelStyle = { '--home-win-rate': `${winRatePercent}%` } as CSSProperties

  const metrics: ProfileMetric[] = [
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

      <div className="home-hero">
        <div className="home-identity">
          <div className="home-avatar" aria-hidden="true">
            <span>{getInitials(selectedDeck.name)}</span>
          </div>

          <div className="home-identity-copy">
            <h1>KH Triple Triad</h1>
            <p className="lead">{profileTitle}</p>

            <div className="home-status-bar">
              <span>Current Hub</span>
              <strong>Garden Console</strong>
              <span className="home-status-dot" aria-hidden="true" />
              <span>Deck Sync: Online</span>
            </div>
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
    </section>
  )
}
