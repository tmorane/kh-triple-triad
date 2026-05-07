import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOwnedCardsLadder, fetchPeakRankLadder, isGlobalLadderEnabled, type LadderEntry } from '../../app/cloud/cloudLadderStore'
import { IS_4X4_UI_ENABLED, PRIMARY_MATCH_MODE } from '../../app/matchUiConfig'
import { useGame } from '../../app/useGame'
import { cardPool } from '../../domain/cards/cardPool'
import { deriveFirstRunOnboarding, deriveLongTermGoals } from '../../domain/progression/engagementLoop'
import { missionDefinitions, missionIds } from '../../domain/progression/missionCatalog'
import type { MissionId, RankedTierId } from '../../domain/types'
import { getRankEmblemSrc } from '../rankEmblems'
import { TrackedPokemonWidget } from '../components/TrackedPokemonWidget'

const GOLD_MILESTONES = [150, 200, 300, 450, 600, 800, 1000]
const HOME_LADDER_LIMIT = 3
const numberFormat = new Intl.NumberFormat('fr-FR')

const tierNames: Record<RankedTierId, string> = {
  iron: 'Fer',
  bronze: 'Bronze',
  silver: 'Argent',
  gold: 'Or',
  platinum: 'Platine',
  diamond: 'Diamant',
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

type LadderStatus = 'disabled' | 'loading' | 'ready' | 'empty' | 'error'

interface HomeLadderState {
  status: LadderStatus
  rankEntries: LadderEntry[]
  ownedEntries: LadderEntry[]
}

const emptyHomeLadderState: HomeLadderState = {
  status: 'disabled',
  rankEntries: [],
  ownedEntries: [],
}

const rankLabelTranslation: Record<string, string> = {
  Iron: 'Fer',
  Bronze: 'Bronze',
  Silver: 'Argent',
  Gold: 'Or',
  Platinum: 'Platine',
  Diamond: 'Diamant',
  Challenger: 'Challenger',
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

function formatDisplayRankLabel(label: string): string {
  const [tier, ...rest] = label.split(' ')
  if (!tier) {
    return label
  }

  return [rankLabelTranslation[tier] ?? tier, ...rest].join(' ')
}

function formatOwnedPokemonCount(count: number): string {
  return `${numberFormat.format(count)} Pokémon`
}

function renderHomeLadderRows(entries: LadderEntry[], emptyMessage: string, renderValue: (entry: LadderEntry) => string) {
  if (entries.length === 0) {
    return <li className="home-ladder-empty">{emptyMessage}</li>
  }

  return entries.map((entry, index) => (
    <li className="home-ladder-row" key={entry.userId}>
      <span className="home-ladder-position">#{index + 1}</span>
      <span className="home-ladder-name">{entry.playerName}</span>
      <span className="home-ladder-value">{renderValue(entry)}</span>
    </li>
  ))
}

export function HomePage() {
  const { profile, currentMatch, claimMission } = useGame()
  const [profileArtAvailable, setProfileArtAvailable] = useState(true)
  const ladderEnabled = isGlobalLadderEnabled()
  const [ladderState, setLadderState] = useState<HomeLadderState>(() => (
    ladderEnabled ? { ...emptyHomeLadderState, status: 'loading' } : emptyHomeLadderState
  ))

  const played = profile.stats.played
  const wins = profile.stats.won
  const winRatePercent = played > 0 ? Math.round((wins / played) * 100) : 0
  const winRateLabel = played > 0 ? `${winRatePercent}%` : '---'

  const selectedDeck = profile.deckSlots.find((slot) => slot.id === profile.selectedDeckSlotId) ?? profile.deckSlots[0]
  const playActionTarget = currentMatch ? '/match' : '/setup'
  const playActionLabel = currentMatch ? 'Continuer' : 'Jouer'

  const ownedCards = profile.ownedCardIds.length
  const totalCards = cardPool.length
  const totalPacks = Object.values(profile.packInventoryByRarity).reduce((sum, quantity) => sum + quantity, 0)
  const nextGoldTarget = GOLD_MILESTONES.find((milestone) => profile.gold < milestone) ?? null
  const missions = missionIds.map((missionId) => profile.missions[missionId])

  const ranked3x3 = profile.rankedByMode['3x3']
  const ranked4x4 = profile.rankedByMode['4x4']
  const rankedTierLabel3x3 = formatTierLabelExplicit(ranked3x3.tier, ranked3x3.division)
  const rankedTierLabel4x4 = formatTierLabelExplicit(ranked4x4.tier, ranked4x4.division)
  const rankedProgressPercent = IS_4X4_UI_ENABLED ? ranked4x4.lp : ranked3x3.lp
  const onboarding = deriveFirstRunOnboarding(profile)
  const longTermGoals = deriveLongTermGoals(profile)
  const localLadderRefreshKey = [
    profile.playerName,
    profile.ownedCardIds.length,
    ranked3x3.tier,
    ranked3x3.division,
    ranked3x3.lp,
    ranked4x4.tier,
    ranked4x4.division,
    ranked4x4.lp,
  ].join('|')

  useEffect(() => {
    if (!ladderEnabled) {
      return
    }

    let cancelled = false

    void Promise.all([
      fetchPeakRankLadder(PRIMARY_MATCH_MODE, HOME_LADDER_LIMIT),
      fetchOwnedCardsLadder(HOME_LADDER_LIMIT),
    ])
      .then(([rankEntries, ownedEntries]) => {
        if (cancelled) {
          return
        }

        setLadderState({
          status: rankEntries.length > 0 || ownedEntries.length > 0 ? 'ready' : 'empty',
          rankEntries,
          ownedEntries,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setLadderState({ ...emptyHomeLadderState, status: 'error' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [ladderEnabled, localLadderRefreshKey])

  const panelStyle = {
    '--home-win-rate': `${winRatePercent}%`,
    '--home-rank-progress': `${rankedProgressPercent}%`,
  } as CSSProperties

  const metrics: ProfileMetric[] = [
    {
      icon: '3',
      label: 'Classé 3X3',
      value: rankedTierLabel3x3,
      sub: `${ranked3x3.lp} LP`,
      progress: ranked3x3.lp,
      testId: 'home-ranked-tier-3x3',
    },
    {
      icon: 'G',
      label: "Réserve d'or",
      value: numberFormat.format(profile.gold),
      sub: nextGoldTarget ? `${numberFormat.format(nextGoldTarget - profile.gold)} avant le prochain palier` : 'Palier max atteint',
      progress: nextGoldTarget ? clampPercent(Math.round((profile.gold / nextGoldTarget) * 100)) : 100,
      testId: 'gold-value',
    },
    {
      icon: 'C',
      label: 'Pokédex',
      value: `${ownedCards}/${totalCards}`,
      sub: `${clampPercent(Math.round((ownedCards / totalCards) * 100))}% complété`,
      progress: clampPercent(Math.round((ownedCards / totalCards) * 100)),
      testId: 'home-collection-value',
    },
    ...(IS_4X4_UI_ENABLED
      ? [
          {
            icon: '4',
            label: 'Classé 4X4',
            value: rankedTierLabel4x4,
            sub: `${ranked4x4.lp} LP`,
            progress: ranked4x4.lp,
            testId: 'home-ranked-tier-4x4',
          },
        ]
      : []),
  ]

  const displayMissions: HomeMissionCard[] = missions.map((mission) => ({
    id: mission.id,
    missionId: mission.id,
    title: missionDefinitions[mission.id].title,
    progress: mission.progress,
    target: mission.target,
    completed: mission.completed,
    claimed: mission.claimed,
    claimable: true,
  }))
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
      <div className="home-anime-backdrop" aria-hidden="true" />
      <div className="home-anime-grid" aria-hidden="true" />
      <div className="home-anime-halo" aria-hidden="true" />
      <div className="home-panel__glow" aria-hidden="true" />
      <p className="home-eyebrow">Centre Dresseur</p>

      <div className="home-hero">
        <div className="home-hero-main home-section--profile">
          <div className="home-identity">
            <div className="home-avatar" aria-hidden="true">
              {profileArtAvailable ? (
                <img
                  src="/ui/home/season-current.webp"
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
            <article className="home-rank-progress" aria-label="Dynamique de rang">
              <p className="home-rank-progress__head">
                <span>Dynamique de rang</span>
                <strong>{ranked3x3.lp}/100 LP</strong>
              </p>
              <div className="home-meter home-rank-progress__meter" aria-hidden="true">
                <span style={{ width: `${clampPercent(ranked3x3.lp)}%` }} />
              </div>
            </article>

            <div className="home-profile-pills" aria-label="Temps forts du joueur">
              <article className="home-profile-pill is-cyan">
                <p className="home-profile-pill__label">Meilleure série</p>
                <p className="home-profile-pill__value">{profile.stats.bestStreak}</p>
              </article>
              <article className="home-profile-pill is-gold">
                <p className="home-profile-pill__label">Missions terminées</p>
                <p className="home-profile-pill__value">
                  {completedDisplayMissions}/{displayMissions.length}
                </p>
              </article>
              <article className="home-profile-pill is-violet">
                <p className="home-profile-pill__label">Packs prêts</p>
                <p className="home-profile-pill__value">{totalPacks}</p>
              </article>
            </div>
          </div>
        </div>

        <aside className="home-hero-cta home-section--profile" data-testid="home-hero-cta">
          <Link className="button button-primary home-hero-cta__primary" to={playActionTarget} data-testid="home-quick-action-play">
            {playActionLabel}
          </Link>
          <TrackedPokemonWidget testIdPrefix="home-tracked" className="home-hero-tracked" />
          <div className="home-hero-cta__secondary" aria-label="Actions rapides secondaires">
            <Link className="button" to="/packs" data-testid="home-quick-action-packs">
              Ouvrir les packs
            </Link>
            <Link className="button" to="/decks" data-testid="home-quick-action-setup">
              Modifier le deck
            </Link>
          </div>

          <section className="home-ladders-block" data-testid="home-ladders-block" aria-label="Classements">
            <div className="home-ladders-head">
              <h2>Classements</h2>
              <Link className="home-ladders-link" to="/ranks">
                Top complet
              </Link>
            </div>
            {ladderState.status === 'loading' ? (
              <p className="small" data-testid="home-ladder-loading">
                Chargement des classements...
              </p>
            ) : null}
            {ladderState.status === 'error' ? (
              <p className="error" role="alert" data-testid="home-ladder-error">
                Ladder indisponible.
              </p>
            ) : null}
            <div className="home-ladders-grid">
              <article className="home-ladder-card">
                <h3>Rang {PRIMARY_MATCH_MODE.toUpperCase()}</h3>
                <ol className="home-ladder-list" data-testid="home-rank-ladder">
                  {renderHomeLadderRows(
                    ladderState.rankEntries,
                    'Aucun rang publié.',
                    (entry) => formatDisplayRankLabel(entry.peakRankLabel),
                  )}
                </ol>
              </article>
              <article className="home-ladder-card">
                <h3>Captures</h3>
                <ol className="home-ladder-list" data-testid="home-owned-ladder">
                  {renderHomeLadderRows(
                    ladderState.ownedEntries,
                    'Aucune collection publiée.',
                    (entry) => formatOwnedPokemonCount(entry.ownedCardsCount),
                  )}
                </ol>
              </article>
            </div>
          </section>

          <div className="home-hero-insights">
            <aside className="home-winrate-card" aria-label="Taux de victoire">
              <p className="home-winrate-label">Taux de victoire</p>
              <div className="home-winrate-ring">
                <span>{winRateLabel}</span>
              </div>
              <p className="home-winrate-caption">
                {wins} victoire{wins === 1 ? '' : 's'} en {played} match{played === 1 ? '' : 's'}
              </p>
            </aside>

            <aside className="home-ranked-badge-card" data-testid="home-ranked-badge-card-3x3">
              <img
                src={getRankEmblemSrc(ranked3x3.tier)}
                alt={`Emblème du rang ${tierNames[ranked3x3.tier]} 3x3`}
                className="home-ranked-badge"
                data-testid="home-ranked-badge-3x3"
              />
              <p className="home-ranked-badge-caption" data-testid="home-ranked-badge-label-3x3">{`3X3 · ${rankedTierLabel3x3}`}</p>
            </aside>
            {IS_4X4_UI_ENABLED ? (
              <aside className="home-ranked-badge-card" data-testid="home-ranked-badge-card-4x4">
                <img
                  src={getRankEmblemSrc(ranked4x4.tier)}
                  alt={`Emblème du rang ${tierNames[ranked4x4.tier]} 4x4`}
                  className="home-ranked-badge"
                  data-testid="home-ranked-badge-4x4"
                />
                <p className="home-ranked-badge-caption" data-testid="home-ranked-badge-label-4x4">{`4X4 · ${rankedTierLabel4x4}`}</p>
              </aside>
            ) : null}
          </div>
        </aside>
      </div>

      {onboarding.visible ? (
        <section className="home-onboarding home-section--profile" data-testid="home-onboarding">
          <div className="home-onboarding__copy">
            <p className="home-eyebrow">Première session</p>
            <h2>{onboarding.title}</h2>
            <p className="small">{onboarding.description}</p>
            <Link className="button button-primary" to={onboarding.primaryAction.to} data-testid="home-onboarding-primary">
              {onboarding.primaryAction.title}
            </Link>
          </div>
          <div className="home-onboarding__steps" aria-label="Étapes de démarrage">
            {onboarding.steps.map((step) => (
              <article className={`home-onboarding-step is-${step.status}`} key={step.id} data-testid={`home-onboarding-step-${step.id}`}>
                <p className="home-onboarding-step__status">
                  {step.status === 'completed' ? 'Terminé' : step.status === 'current' ? 'Maintenant' : 'Bientôt'}
                </p>
                <h3>{step.title}</h3>
                <p className="small">{step.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
            Voir les missions
          </Link>
        </div>
        <p className="small">
          {completedDisplayMissions}/{displayMissions.length} terminées
        </p>
        <div className="home-missions-list">
          {displayMissions.map((mission) => {
            const progressPercent = clampPercent(Math.round((mission.progress / mission.target) * 100))
            const isFocused = mission.id === missionFocusId
            const missionStateLabel = mission.claimed ? 'Réclamée' : mission.completed ? 'Prête à récupérer' : 'En cours'
            const showClaimAction = mission.claimable && mission.completed
            const claimLabel = mission.claimed ? 'Nouvelle mission' : 'Récupérer'
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

      <section className="home-goals-block home-section--ladders" data-testid="home-long-term-goals" aria-label="Objectifs longue durée">
        <div className="home-missions-head">
          <h2>Objectifs longue durée</h2>
          <p className="small">Ce qui donne envie de relancer une partie demain.</p>
        </div>
        <div className="home-goals-grid">
          {longTermGoals.map((goal) => {
            const progress = goal.target > 0 ? clampPercent(Math.round((goal.current / goal.target) * 100)) : 0
            return (
              <Link className="home-goal-card" to={goal.to} key={goal.id} data-testid={`home-long-term-goal-${goal.id}`}>
                <p className="home-mission-title">{goal.title}</p>
                <p className="small">{goal.description}</p>
                <p className="home-metric-sub">
                  {numberFormat.format(goal.current)}/{numberFormat.format(goal.target)}
                </p>
                <div className="home-meter" aria-hidden="true">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

    </section>
  )
}
