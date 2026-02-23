import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchOwnedCardsLadder,
  fetchPeakRankLadder,
  isGlobalLadderEnabled,
  type LadderEntry,
} from '../../app/cloud/cloudLadderStore'
import { useGame } from '../../app/useGame'
import { cardPool } from '../../domain/cards/cardPool'
import type { MissionId, RankedTierId } from '../../domain/types'

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

const missionOrder: MissionId[] = ['m1_type_specialist', 'm2_combo_practitioner', 'm3_corner_tactician']

const missionTitles: Record<MissionId, string> = {
  m1_type_specialist: 'Type Specialist',
  m2_combo_practitioner: 'Combo Practitioner',
  m3_corner_tactician: 'Corner Tactician',
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

function parseDivisionNumber(division: string | null): number | null {
  if (division === 'IV') {
    return 4
  }
  if (division === 'III') {
    return 3
  }
  if (division === 'II') {
    return 2
  }
  if (division === 'I') {
    return 1
  }
  return null
}

function formatTierLabelExplicit(tier: RankedTierId, division: string | null): string {
  const label = formatTierLabel(tier, division)
  const divisionNumber = parseDivisionNumber(division)
  if (divisionNumber === null) {
    return label
  }
  return `${label} (Division ${divisionNumber})`
}

export function HomePage() {
  const { profile, currentMatch } = useGame()
  const laddersEnabled = isGlobalLadderEnabled()
  const [isLoadingLadders, setIsLoadingLadders] = useState(laddersEnabled)
  const [ownedCardsLadder, setOwnedCardsLadder] = useState<LadderEntry[]>([])
  const [peakRankLadder, setPeakRankLadder] = useState<LadderEntry[]>([])
  const [ladderError, setLadderError] = useState<string | null>(null)

  const played = profile.stats.played
  const wins = profile.stats.won
  const winRatePercent = played > 0 ? Math.round((wins / played) * 100) : 0
  const winRateLabel = played > 0 ? `${winRatePercent}%` : '---'

  const selectedDeck = profile.deckSlots.find((slot) => slot.id === profile.selectedDeckSlotId) ?? profile.deckSlots[0]
  const playActionTarget = currentMatch ? '/match' : '/setup'
  const playActionLabel = currentMatch ? 'Continue' : 'Play'

  const ownedCards = profile.ownedCardIds.length
  const totalCards = cardPool.length
  const nextGoldTarget = GOLD_MILESTONES.find((milestone) => profile.gold < milestone) ?? null
  const missions = missionOrder.map((missionId) => profile.missions[missionId])
  const completedMissions = missions.filter((mission) => mission.completed).length

  const ranked = profile.ranked
  const rankedTierLabel = formatTierLabelExplicit(ranked.tier, ranked.division)
  const rankedProgressPercent = ranked.lp

  const panelStyle = {
    '--home-win-rate': `${winRatePercent}%`,
    '--home-rank-progress': `${rankedProgressPercent}%`,
  } as CSSProperties

  useEffect(() => {
    if (!laddersEnabled) {
      setIsLoadingLadders(false)
      setOwnedCardsLadder([])
      setPeakRankLadder([])
      setLadderError(null)
      return
    }

    let mounted = true

    const loadLadders = async () => {
      setIsLoadingLadders(true)
      setLadderError(null)
      try {
        const [owned, peak] = await Promise.all([fetchOwnedCardsLadder(5), fetchPeakRankLadder(5)])
        if (!mounted) {
          return
        }
        setOwnedCardsLadder(owned)
        setPeakRankLadder(peak)
      } catch (error) {
        if (!mounted) {
          return
        }
        setLadderError(error instanceof Error ? error.message : 'Unable to load ladders.')
      } finally {
        if (mounted) {
          setIsLoadingLadders(false)
        }
      }
    }

    void loadLadders()

    return () => {
      mounted = false
    }
  }, [laddersEnabled])

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
      testId: 'home-collection-value',
    },
  ]

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
        <Link className="button" to="/decks" data-testid="home-quick-action-setup">
          Edit Deck
        </Link>
      </nav>

      <div className="home-hero">
        <div className="home-identity">
          <div className="home-avatar" aria-hidden="true">
            <span>{getInitials(selectedDeck.name)}</span>
          </div>

          <div className="home-identity-copy">
            <h1>{profile.playerName}</h1>
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
            <p className="home-ranked-badge-caption" data-testid="home-ranked-badge-label">{rankedTierLabel}</p>
          </aside>
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

      <section className="home-missions-block" data-testid="home-missions-block">
        <div className="home-missions-head">
          <h2>Missions</h2>
          <Link className="button" to="/missions" data-testid="home-missions-link">
            View missions
          </Link>
        </div>
        <p className="small">
          {completedMissions}/{missions.length} completed
        </p>
        <div className="home-missions-list">
          {missions.map((mission) => {
            const progressPercent = clampPercent(Math.round((mission.progress / mission.target) * 100))
            return (
              <article key={mission.id} className="home-mission-card" data-testid={`home-mission-${mission.id}`}>
                <p className="home-mission-title">{missionTitles[mission.id]}</p>
                <p className="small" data-testid={`home-mission-progress-${mission.id}`}>
                  {mission.progress}/{mission.target}
                </p>
                <div className="home-meter" aria-hidden="true">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="small">{mission.claimed ? 'Claimed' : mission.completed ? 'Completed' : 'In progress'}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="ranks-ladders home-ladders-block" aria-label="Global ladders on home">
        <div className="ranks-ladders-head">
          <h2>Global Ladders</h2>
          <p className="small">Top 5 players</p>
        </div>

        {!laddersEnabled ? (
          <p className="small" data-testid="home-ladder-disabled-note">
            Global ladders are unavailable until cloud auth is configured.
          </p>
        ) : null}

        {laddersEnabled && isLoadingLadders ? <p className="small">Loading global ladders...</p> : null}

        {laddersEnabled && ladderError ? (
          <p className="error" role="alert">
            {ladderError}
          </p>
        ) : null}

        {laddersEnabled && !isLoadingLadders && !ladderError ? (
          <div className="ranks-ladder-grid">
            <article className="ranks-ladder-card" data-testid="home-owned-ladder">
              <h3>Most Owned Cards</h3>
              {ownedCardsLadder.length === 0 ? (
                <p className="small">No players yet.</p>
              ) : (
                <ol className="ranks-ladder-list">
                  {ownedCardsLadder.map((entry, index) => (
                    <li key={entry.userId} className="ranks-ladder-row">
                      <span className="ranks-ladder-position">#{index + 1}</span>
                      <span className="ranks-ladder-name">{entry.playerName}</span>
                      <span className="ranks-ladder-value">{entry.ownedCardsCount} cards</span>
                    </li>
                  ))}
                </ol>
              )}
            </article>

            <article className="ranks-ladder-card" data-testid="home-peak-ladder">
              <h3>Highest Peak Rank</h3>
              {peakRankLadder.length === 0 ? (
                <p className="small">No players yet.</p>
              ) : (
                <ol className="ranks-ladder-list">
                  {peakRankLadder.map((entry, index) => (
                    <li key={entry.userId} className="ranks-ladder-row">
                      <span className="ranks-ladder-position">#{index + 1}</span>
                      <span className="ranks-ladder-name">{entry.playerName}</span>
                      <span className="ranks-ladder-value">{entry.peakRankLabel}</span>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          </div>
        ) : null}
      </section>
    </section>
  )
}
