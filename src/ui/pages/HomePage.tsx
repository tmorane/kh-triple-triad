import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchOwnedCardsLadder,
  fetchPeakRankLadder,
  isGlobalLadderEnabled,
  type LadderEntry,
} from '../../app/cloud/cloudLadderStore'
import { IS_4X4_UI_ENABLED } from '../../app/matchUiConfig'
import { useGame } from '../../app/useGame'
import { cardPool } from '../../domain/cards/cardPool'
import type { MissionId, RankedTierId } from '../../domain/types'
import { getRankEmblemSrc } from '../rankEmblems'

const GOLD_MILESTONES = [150, 200, 300, 450, 600, 800, 1000]
const numberFormat = new Intl.NumberFormat('en-US')

const tierNames: Record<RankedTierId, string> = {
  iron: 'Iron',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
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

interface HomeMissionCard {
  id: string
  missionId?: MissionId
  title: string
  progress: number
  target: number
  completed: boolean
  claimed: boolean
  claimable: boolean
}

const missionOrder: MissionId[] = ['m1_type_specialist', 'm2_combo_practitioner', 'm3_corner_tactician']

const missionTitles: Record<MissionId, string> = {
  m1_type_specialist: 'Win 5 Matches',
  m2_combo_practitioner: 'Combo Practitioner',
  m3_corner_tactician: 'Corner Tactician',
}

const bonusMissionTargets = {
  b1_win_streak: 5,
  b2_match_grinder: 25,
  b3_collection_hunter: cardPool.length,
} as const

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
  const { profile, currentMatch, claimMission } = useGame()
  const laddersEnabled = isGlobalLadderEnabled()
  const [isLoadingLadders, setIsLoadingLadders] = useState(laddersEnabled)
  const [ownedCardsLadder, setOwnedCardsLadder] = useState<LadderEntry[]>([])
  const [peakRankLadder, setPeakRankLadder] = useState<LadderEntry[]>([])
  const [ladderError, setLadderError] = useState<string | null>(null)
  const [profileArtAvailable, setProfileArtAvailable] = useState(true)

  const played = profile.stats.played
  const wins = profile.stats.won
  const winRatePercent = played > 0 ? Math.round((wins / played) * 100) : 0
  const winRateLabel = played > 0 ? `${winRatePercent}%` : '---'

  const selectedDeck = profile.deckSlots.find((slot) => slot.id === profile.selectedDeckSlotId) ?? profile.deckSlots[0]
  const playActionTarget = currentMatch ? '/match' : '/setup'
  const playActionLabel = currentMatch ? 'Continue' : 'Play'

  const ownedCards = profile.ownedCardIds.length
  const totalCards = cardPool.length
  const totalPacks = Object.values(profile.packInventoryByRarity).reduce((sum, quantity) => sum + quantity, 0)
  const nextGoldTarget = GOLD_MILESTONES.find((milestone) => profile.gold < milestone) ?? null
  const missions = missionOrder.map((missionId) => profile.missions[missionId])

  const ranked3x3 = profile.rankedByMode['3x3']
  const ranked4x4 = profile.rankedByMode['4x4']
  const rankedTierLabel3x3 = formatTierLabelExplicit(ranked3x3.tier, ranked3x3.division)
  const rankedTierLabel4x4 = formatTierLabelExplicit(ranked4x4.tier, ranked4x4.division)
  const rankedProgressPercent = IS_4X4_UI_ENABLED ? ranked4x4.lp : ranked3x3.lp
  const homePeakLadderMode = IS_4X4_UI_ENABLED ? '4x4' : '3x3'

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
        const [owned, peak] = await Promise.all([fetchOwnedCardsLadder(5), fetchPeakRankLadder(homePeakLadderMode, 5)])
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
  }, [homePeakLadderMode, laddersEnabled])

  const metrics: ProfileMetric[] = [
    {
      icon: '3',
      label: '3X3 Ranked',
      value: rankedTierLabel3x3,
      sub: `${ranked3x3.lp} LP`,
      progress: ranked3x3.lp,
      testId: 'home-ranked-tier-3x3',
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
      label: 'Pokédex',
      value: `${ownedCards}/${totalCards}`,
      sub: `${clampPercent(Math.round((ownedCards / totalCards) * 100))}% complete`,
      progress: clampPercent(Math.round((ownedCards / totalCards) * 100)),
      testId: 'home-collection-value',
    },
    ...(IS_4X4_UI_ENABLED
      ? [
          {
            icon: '4',
            label: '4X4 Ranked',
            value: rankedTierLabel4x4,
            sub: `${ranked4x4.lp} LP`,
            progress: ranked4x4.lp,
            testId: 'home-ranked-tier-4x4',
          },
        ]
      : []),
  ]

  const coreMissionCards: HomeMissionCard[] = missions.map((mission) => ({
    id: mission.id,
    missionId: mission.id,
    title: missionTitles[mission.id],
    progress: mission.progress,
    target: mission.target,
    completed: mission.completed,
    claimed: mission.claimed,
    claimable: true,
  }))
  const bonusMissionCards: HomeMissionCard[] = [
    {
      id: 'b1_win_streak',
      title: 'Win Streak',
      progress: Math.min(profile.stats.streak, bonusMissionTargets.b1_win_streak),
      target: bonusMissionTargets.b1_win_streak,
      completed: profile.stats.streak >= bonusMissionTargets.b1_win_streak,
      claimed: false,
      claimable: false,
    },
    {
      id: 'b2_match_grinder',
      title: 'Match Grinder',
      progress: Math.min(profile.stats.played, bonusMissionTargets.b2_match_grinder),
      target: bonusMissionTargets.b2_match_grinder,
      completed: profile.stats.played >= bonusMissionTargets.b2_match_grinder,
      claimed: false,
      claimable: false,
    },
    {
      id: 'b3_collection_hunter',
      title: 'Collection Hunter',
      progress: Math.min(ownedCards, bonusMissionTargets.b3_collection_hunter),
      target: bonusMissionTargets.b3_collection_hunter,
      completed: ownedCards >= bonusMissionTargets.b3_collection_hunter,
      claimed: false,
      claimable: false,
    },
  ]
  const displayMissions: HomeMissionCard[] = [...coreMissionCards, ...bonusMissionCards]
  const completedDisplayMissions = displayMissions.filter((mission) => mission.completed).length

  const missionFocusId =
    displayMissions
      .map((mission, index) => ({
        mission,
        index,
        ratio: mission.target > 0 ? mission.progress / mission.target : 0,
      }))
      .filter((entry) => !entry.mission.completed)
      .sort((left, right) => right.ratio - left.ratio || right.mission.progress - left.mission.progress || left.index - right.index)[0]
      ?.mission.id ?? displayMissions[0]?.id

  return (
    <section className="panel home-panel" style={panelStyle}>
      <div className="home-panel__glow" aria-hidden="true" />
      <p className="home-eyebrow">Player Profile</p>

      <div className="home-hero">
        <div className="home-hero-main home-section--profile">
          <div className="home-identity">
            <div className="home-avatar" aria-hidden="true">
              {profileArtAvailable ? (
                <img
                  src="/ui/home/season-current.png"
                  alt=""
                  data-testid="home-profile-art-image"
                  onError={() => {
                    setProfileArtAvailable(false)
                  }}
                />
              ) : (
                <span>{getInitials(selectedDeck.name)}</span>
              )}
            </div>

            <div className="home-identity-copy">
              <h1>{profile.playerName}</h1>
              <p className="lead" data-testid="home-ranked-tier-label-3x3">{`3X3 · ${rankedTierLabel3x3}`}</p>
              <p className="home-rank-line" data-testid="home-ranked-lp-3x3">
                {ranked3x3.lp} LP
              </p>
              {IS_4X4_UI_ENABLED ? (
                <>
                  <p className="lead" data-testid="home-ranked-tier-label-4x4">{`4X4 · ${rankedTierLabel4x4}`}</p>
                  <p className="home-rank-line" data-testid="home-ranked-lp-4x4">
                    {ranked4x4.lp} LP
                  </p>
                </>
              ) : null}
            </div>
          </div>

          <div className="home-hero-main__details">
            <article className="home-rank-progress" aria-label="Rank momentum">
              <p className="home-rank-progress__head">
                <span>Rank Momentum</span>
                <strong>{ranked3x3.lp}/100 LP</strong>
              </p>
              <div className="home-meter home-rank-progress__meter" aria-hidden="true">
                <span style={{ width: `${clampPercent(ranked3x3.lp)}%` }} />
              </div>
            </article>

            <div className="home-profile-pills" aria-label="Player highlights">
              <article className="home-profile-pill is-cyan">
                <p className="home-profile-pill__label">Best Streak</p>
                <p className="home-profile-pill__value">{profile.stats.bestStreak}</p>
              </article>
              <article className="home-profile-pill is-gold">
                <p className="home-profile-pill__label">Missions Done</p>
                <p className="home-profile-pill__value">
                  {completedDisplayMissions}/{displayMissions.length}
                </p>
              </article>
              <article className="home-profile-pill is-violet">
                <p className="home-profile-pill__label">Packs Ready</p>
                <p className="home-profile-pill__value">{totalPacks}</p>
              </article>
            </div>
          </div>
        </div>

        <aside className="home-hero-cta home-section--profile" data-testid="home-hero-cta">
          <Link className="button button-primary home-hero-cta__primary" to={playActionTarget} data-testid="home-quick-action-play">
            {playActionLabel}
          </Link>
          <div className="home-hero-cta__secondary" aria-label="Secondary quick actions">
            <Link className="button" to="/packs" data-testid="home-quick-action-packs">
              Open Packs
            </Link>
            <Link className="button" to="/decks" data-testid="home-quick-action-setup">
              Edit Deck
            </Link>
          </div>

          <div className="home-hero-insights">
            <aside className="home-winrate-card" aria-label="Win rate">
              <p className="home-winrate-label">Win Rate</p>
              <div className="home-winrate-ring">
                <span>{winRateLabel}</span>
              </div>
              <p className="home-winrate-caption">
                {wins} wins in {played} matches
              </p>
            </aside>

            <aside className="home-ranked-badge-card" data-testid="home-ranked-badge-card-3x3">
              <img
                src={getRankEmblemSrc(ranked3x3.tier)}
                alt={`${tierNames[ranked3x3.tier]} rank emblem 3x3`}
                className="home-ranked-badge"
                data-testid="home-ranked-badge-3x3"
              />
              <p className="home-ranked-badge-caption" data-testid="home-ranked-badge-label-3x3">{`3X3 · ${rankedTierLabel3x3}`}</p>
            </aside>
            {IS_4X4_UI_ENABLED ? (
              <aside className="home-ranked-badge-card" data-testid="home-ranked-badge-card-4x4">
                <img
                  src={getRankEmblemSrc(ranked4x4.tier)}
                  alt={`${tierNames[ranked4x4.tier]} rank emblem 4x4`}
                  className="home-ranked-badge"
                  data-testid="home-ranked-badge-4x4"
                />
                <p className="home-ranked-badge-caption" data-testid="home-ranked-badge-label-4x4">{`4X4 · ${rankedTierLabel4x4}`}</p>
              </aside>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="home-metrics-strip" data-testid="home-metrics-strip">
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

      <section className="home-missions-block home-section--missions" data-testid="home-missions-block">
        <div className="home-missions-head">
          <h2>Missions</h2>
          <Link className="button" to="/missions" data-testid="home-missions-link">
            View missions
          </Link>
        </div>
        <p className="small">
          {completedDisplayMissions}/{displayMissions.length} completed
        </p>
        <div className="home-missions-list">
          {displayMissions.map((mission) => {
            const progressPercent = clampPercent(Math.round((mission.progress / mission.target) * 100))
            const isFocused = mission.id === missionFocusId
            const missionStateLabel = mission.claimed ? 'Claimed' : mission.completed ? 'Ready to claim' : 'In progress'
            const showClaimAction = mission.claimable && mission.completed
            const claimLabel = mission.claimed ? 'New Mission' : 'Claim'
            return (
              <article
                key={mission.id}
                className={`home-mission-card ${isFocused ? 'home-mission-card--focus' : ''}`}
                data-testid={`home-mission-${mission.id}`}
              >
                <p className="home-mission-title">{mission.title}</p>
                <p className="small" data-testid={`home-mission-progress-${mission.id}`}>
                  {mission.progress}/{mission.target}
                </p>
                <div className="home-meter" aria-hidden="true">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
                <p
                  className={`small home-mission-status ${
                    mission.claimed ? 'is-claimed' : mission.completed ? 'is-complete' : isFocused ? 'is-focus' : 'is-progress'
                  }`}
                >
                  {missionStateLabel}
                </p>
                {showClaimAction ? (
                  <button
                    type="button"
                    className="button home-mission-claim"
                    data-testid={`home-mission-claim-${mission.id}`}
                    onClick={() => {
                      if (!mission.missionId || !claimMission) {
                        return
                      }
                      claimMission(mission.missionId)
                    }}
                  >
                    {claimLabel}
                  </button>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>

      <section className="ranks-ladders home-ladders-block home-section--ladders" aria-label="Global ladders on home">
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
