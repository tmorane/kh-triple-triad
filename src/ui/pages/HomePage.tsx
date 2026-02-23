import type { CSSProperties } from 'react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { cardPool } from '../../domain/cards/cardPool'
import { achievementCatalog } from '../../domain/progression/achievements'
import type { RankedTierId } from '../../domain/types'

const GOLD_MILESTONES = [150, 200, 300, 450, 600, 800, 1000]
const numberFormat = new Intl.NumberFormat('en-US')

const tierNames: Record<RankedTierId, string> = {
  iron: 'Iron',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  emerald: 'Emerald',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
  challenger: 'Challenger',
}

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

function getInitials(deckName: string): string {
  const letters = deckName
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')

  return letters || 'TT'
}

function formatTierLabel(tier: RankedTierId, division: string | null): string {
  const tierLabel = tierNames[tier]
  if (division) {
    return `${tierLabel} ${division}`
  }
  return tierLabel
}

export function HomePage() {
  const { profile, currentMatch, renamePlayer, resetProfile } = useGame()
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [playerNameDraft, setPlayerNameDraft] = useState(profile.playerName)
  const [isEditingPlayerName, setIsEditingPlayerName] = useState(false)
  const [playerNameError, setPlayerNameError] = useState<string | null>(null)
  const playerNameInputRef = useRef<HTMLInputElement | null>(null)

  const played = profile.stats.played
  const wins = profile.stats.won
  const losses = Math.max(played - wins, 0)
  const winRatePercent = played > 0 ? Math.round((wins / played) * 100) : 0
  const winRateLabel = played > 0 ? `${winRatePercent}%` : '---'

  const selectedDeck = profile.deckSlots.find((slot) => slot.id === profile.selectedDeckSlotId) ?? profile.deckSlots[0]
  const playActionTarget = currentMatch ? '/match' : '/setup'
  const playActionLabel = currentMatch ? 'Continue' : 'Play'

  const activeDeckCount = selectedDeck.cards.length
  const ownedCards = profile.ownedCardIds.length
  const totalCards = cardPool.length
  const unlockedAchievements = profile.achievements.length
  const totalAchievements = achievementCatalog.length
  const nextGoldTarget = GOLD_MILESTONES.find((milestone) => profile.gold < milestone) ?? null

  const ranked = profile.ranked
  const rankedTierLabel = formatTierLabel(ranked.tier, ranked.division)
  const rankedRecordLabel = `${ranked.wins}W ${ranked.losses}L ${ranked.draws}D`
  const rankedProgressPercent = ranked.lp

  const panelStyle = {
    '--home-win-rate': `${winRatePercent}%`,
    '--home-rank-progress': `${rankedProgressPercent}%`,
  } as CSSProperties

  const metrics: ProfileMetric[] = [
    {
      icon: 'R',
      label: 'Ranked Tier',
      value: rankedTierLabel,
      sub: `${ranked.lp} LP`,
      progress: rankedProgressPercent,
      testId: 'home-ranked-tier',
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
      icon: 'B',
      label: 'Ranked Record',
      value: rankedRecordLabel,
      sub: `${ranked.matchesPlayed} ranked matches`,
      testId: 'home-ranked-record',
    },
    {
      icon: 'M',
      label: 'Battle Record',
      value: `${wins}W / ${losses}L`,
      sub: `${played} matches played`,
    },
  ]

  const startPlayerNameEdit = () => {
    setPlayerNameDraft(profile.playerName)
    setPlayerNameError(null)
    setIsEditingPlayerName(true)
  }

  const cancelPlayerNameEdit = () => {
    setPlayerNameDraft(profile.playerName)
    setPlayerNameError(null)
    setIsEditingPlayerName(false)
  }

  const savePlayerName = () => {
    const result = renamePlayer(playerNameDraft)
    if (!result.valid) {
      setPlayerNameError(result.reason ?? 'Invalid player name.')
      requestAnimationFrame(() => {
        playerNameInputRef.current?.focus()
      })
      return
    }

    setPlayerNameError(null)
    setIsEditingPlayerName(false)
  }

  return (
    <section className="panel home-panel" style={panelStyle}>
      <div className="home-panel__glow" aria-hidden="true" />
      <p className="home-eyebrow">Player Profile</p>

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
            <h1>
              {isEditingPlayerName ? (
                <input
                  id="home-player-name-input"
                  ref={playerNameInputRef}
                  className="home-player-name-input"
                  type="text"
                  value={playerNameDraft}
                  aria-label="Player Name"
                  onChange={(event) => setPlayerNameDraft(event.target.value)}
                  onBlur={savePlayerName}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      savePlayerName()
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault()
                      cancelPlayerNameEdit()
                    }
                  }}
                  data-testid="home-player-name-input"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="home-player-name-trigger"
                  data-testid="home-player-name-trigger"
                  onClick={startPlayerNameEdit}
                >
                  {profile.playerName}
                </button>
              )}
            </h1>
            {playerNameError ? (
              <p className="error" role="alert">
                {playerNameError}
              </p>
            ) : null}
            <p className="lead" data-testid="home-ranked-tier-label">{rankedTierLabel}</p>
            <p className="home-rank-line" data-testid="home-ranked-lp">
              {ranked.lp} LP
            </p>
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

          <aside className="home-ranked-badge-card" data-testid="home-ranked-badge-card">
            <img
              src={`/ranks/${ranked.tier}.svg`}
              alt={`${tierNames[ranked.tier]} rank emblem`}
              className="home-ranked-badge"
              data-testid="home-ranked-badge"
            />
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
