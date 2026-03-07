import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IS_4X4_UI_ENABLED } from '../../app/matchUiConfig'
import {
  fetchOwnedCardsLadder,
  fetchPeakRankLadder,
  isGlobalLadderEnabled,
  type LadderEntry,
} from '../../app/cloud/cloudLadderStore'
import { rankedTiers } from '../../domain/progression/ranked'
import { getRankEmblemSrc } from '../rankEmblems'

const divisionLabelByTierType = {
  withDivisions: 'Divisions IV, III, II, I',
  apex: 'Apex tier (no divisions)',
} as const

const rankedRules = [
  'Win streak LP: +60 / +65 / +70 LP',
  'Win bonus by division: IV +0, III +1, II +2, I +3 LP',
  'Win bonus at apex tier: Challenger +2 LP',
  'Loss streak LP: -20 / -25 / -30 LP',
  'Deck bonus by division: IV +0, III +2, II +4, I +6 score',
  'Deck bonus at apex tier: Challenger +6 score',
  'Draw: 0 LP',
  'Promotion at 100 LP with carry',
  'Demotion shield: 3 losses after promotion',
]

export function RanksPage() {
  const laddersEnabled = isGlobalLadderEnabled()
  const [isLoadingLadders, setIsLoadingLadders] = useState(laddersEnabled)
  const [ownedCardsLadder, setOwnedCardsLadder] = useState<LadderEntry[]>([])
  const [peakRankLadder3x3, setPeakRankLadder3x3] = useState<LadderEntry[]>([])
  const [peakRankLadder4x4, setPeakRankLadder4x4] = useState<LadderEntry[]>([])
  const [ladderError, setLadderError] = useState<string | null>(null)

  useEffect(() => {
    if (!laddersEnabled) {
      setIsLoadingLadders(false)
      setOwnedCardsLadder([])
      setPeakRankLadder3x3([])
      setPeakRankLadder4x4([])
      setLadderError(null)
      return
    }

    let mounted = true

    const loadLadders = async () => {
      setIsLoadingLadders(true)
      setLadderError(null)
      try {
        const [owned, peak3x3, peak4x4] = await Promise.all([
          fetchOwnedCardsLadder(50),
          fetchPeakRankLadder('3x3', 50),
          IS_4X4_UI_ENABLED ? fetchPeakRankLadder('4x4', 50) : Promise.resolve([] as LadderEntry[]),
        ])
        if (!mounted) {
          return
        }
        setOwnedCardsLadder(owned)
        setPeakRankLadder3x3(peak3x3)
        setPeakRankLadder4x4(peak4x4)
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

  return (
    <section className="panel ranks-panel">
      <div className="ranks-headline">
        <h1>Ranks</h1>
        <p className="small">Combat ladder V1 (ranked queue only)</p>
      </div>

      <p className="ranks-open-only-note" data-testid="ranks-open-only-note">
        Ranked queue uses visibility rule only (Open or Hidden).
      </p>

      <div className="ranks-grid" aria-label="Rank tiers">
        {rankedTiers.map((tier) => (
          <article className="ranks-tier-card" data-testid={`ranks-tier-${tier.id}`} key={tier.id}>
            <img src={getRankEmblemSrc(tier.id)} alt={`${tier.name} rank emblem`} className="ranks-tier-emblem" />
            <div className="ranks-tier-copy">
              <h2>{tier.name}</h2>
              <p>{tier.hasDivisions ? divisionLabelByTierType.withDivisions : divisionLabelByTierType.apex}</p>
            </div>
          </article>
        ))}
      </div>

      <section className="ranks-rules" data-testid="ranks-rules" aria-label="Ranked rules summary">
        <h2>LP Rules</h2>
        <ul>
          {rankedRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="ranks-ladders" aria-label="Global ladders">
        <div className="ranks-ladders-head">
          <h2>Global Ladders</h2>
          <p className="small">All players leaderboard</p>
        </div>

        {!laddersEnabled ? (
          <p className="small" data-testid="ranks-ladder-disabled-note">
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
            <article className="ranks-ladder-card" data-testid="ranks-owned-ladder">
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

            <article className="ranks-ladder-card" data-testid="ranks-peak-ladder-3x3">
              <h3>Highest Peak Rank 3X3</h3>
              {peakRankLadder3x3.length === 0 ? (
                <p className="small">No players yet.</p>
              ) : (
                <ol className="ranks-ladder-list">
                  {peakRankLadder3x3.map((entry, index) => (
                    <li key={entry.userId} className="ranks-ladder-row">
                      <span className="ranks-ladder-position">#{index + 1}</span>
                      <span className="ranks-ladder-name">{entry.playerName}</span>
                      <span className="ranks-ladder-value">{entry.peakRankLabel}</span>
                    </li>
                  ))}
                </ol>
              )}
            </article>
            {IS_4X4_UI_ENABLED ? (
              <article className="ranks-ladder-card" data-testid="ranks-peak-ladder-4x4">
                <h3>Highest Peak Rank 4X4</h3>
                {peakRankLadder4x4.length === 0 ? (
                  <p className="small">No players yet.</p>
                ) : (
                  <ol className="ranks-ladder-list">
                    {peakRankLadder4x4.map((entry, index) => (
                      <li key={entry.userId} className="ranks-ladder-row">
                        <span className="ranks-ladder-position">#{index + 1}</span>
                        <span className="ranks-ladder-name">{entry.playerName}</span>
                        <span className="ranks-ladder-value">{entry.peakRankLabel}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="actions">
        <Link className="button button-primary" to="/setup">
          Start Match
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
