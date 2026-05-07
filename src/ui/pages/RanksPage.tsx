import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOwnedCardsLadder, fetchPeakRankLadder, isGlobalLadderEnabled, type LadderEntry } from '../../app/cloud/cloudLadderStore'
import { PRIMARY_MATCH_MODE } from '../../app/matchUiConfig'
import { PROFILE_STORAGE_KEY } from '../../domain/progression/profile'
import { rankedTiers } from '../../domain/progression/ranked'
import { getRankEmblemSrc } from '../rankEmblems'

const LADDER_LIMIT = 10
const numberFormat = new Intl.NumberFormat('fr-FR')

const divisionLabelByTierType = {
  withDivisions: 'Divisions IV, III, II, I',
  apex: 'Rang sommet (sans divisions)',
} as const

const rankedRules = [
  'Série de victoires: +30 / +31 / +32 / +33 / +34 / +35 points',
  'Série de défaites: -15 / -16 / -17 / -18 / -19 / -20 points',
  'Égalité: 0 point',
  'Promotion à 100 points: BO3 (2 victoires pour monter)',
  'Matchs de BO3: aucun point gagné ou perdu',
  'Promotion réussie: ligue suivante +20 points',
  'Promotion ratée: même ligue, retour à 80 points',
  'À 0 point: 2 boucliers, la 3e défaite rétrograde',
  'Challenger: pas de rétrogradation vers Diamant',
  'Saison: 2 mois, reset -2 ligues',
  'Récompenses de ligue: 1 fois par ligue et par saison',
]

const tierNameById = {
  iron: 'Fer',
  bronze: 'Bronze',
  silver: 'Argent',
  gold: 'Or',
  platinum: 'Platine',
  diamond: 'Diamant',
  challenger: 'Challenger',
} as const

type LadderStatus = 'disabled' | 'loading' | 'ready' | 'empty' | 'error'

interface LadderState {
  status: LadderStatus
  rankEntries: LadderEntry[]
  ownedEntries: LadderEntry[]
}

const emptyLadderState: LadderState = {
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

function readStoredProfileRevision(): string {
  try {
    return window.localStorage.getItem(PROFILE_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function renderLadderRows(entries: LadderEntry[], emptyMessage: string, renderValue: (entry: LadderEntry) => string) {
  if (entries.length === 0) {
    return <li className="ranks-ladder-empty">{emptyMessage}</li>
  }

  return entries.map((entry, index) => (
    <li className="ranks-ladder-row" key={entry.userId}>
      <span className="ranks-ladder-position">#{index + 1}</span>
      <span className="ranks-ladder-name">{entry.playerName}</span>
      <span className="ranks-ladder-value">{renderValue(entry)}</span>
    </li>
  ))
}

export function RanksPage() {
  const ladderEnabled = isGlobalLadderEnabled()
  const storedProfileRevision = readStoredProfileRevision()
  const [ladderState, setLadderState] = useState<LadderState>(() => (
    ladderEnabled ? { ...emptyLadderState, status: 'loading' } : emptyLadderState
  ))

  useEffect(() => {
    if (!ladderEnabled) {
      return
    }

    let cancelled = false

    void Promise.all([
      fetchPeakRankLadder(PRIMARY_MATCH_MODE, LADDER_LIMIT),
      fetchOwnedCardsLadder(LADDER_LIMIT),
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
          setLadderState({ ...emptyLadderState, status: 'error' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [ladderEnabled, storedProfileRevision])

  return (
    <section className="panel ranks-panel">
      <div className="ranks-headline">
        <h1>Rangs</h1>
        <p className="small">Classement combat V1 (file classée uniquement)</p>
      </div>

      <p className="ranks-open-only-note" data-testid="ranks-open-only-note">
        La file classée utilise seulement la règle de visibilité (visible ou cachée).
      </p>

      <div className="ranks-grid" aria-label="Paliers de rang">
        {rankedTiers.map((tier) => (
          <article className="ranks-tier-card" data-testid={`ranks-tier-${tier.id}`} key={tier.id}>
            <img src={getRankEmblemSrc(tier.id)} alt={`Emblème du rang ${tierNameById[tier.id]}`} className="ranks-tier-emblem" />
            <div className="ranks-tier-copy">
              <h2>{tierNameById[tier.id]}</h2>
              <p>{tier.hasDivisions ? divisionLabelByTierType.withDivisions : divisionLabelByTierType.apex}</p>
            </div>
          </article>
        ))}
      </div>

      <section className="ranks-rules" data-testid="ranks-rules" aria-label="Résumé des règles classées">
        <h2>Règles de points</h2>
        <ul>
          {rankedRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="ranks-ladders" aria-label="Classements globaux" data-testid="ranks-ladders">
        <div className="ranks-ladders-head">
          <h2>Classements globaux</h2>
          <p className="small">
            Top {LADDER_LIMIT} · rang {PRIMARY_MATCH_MODE.toUpperCase()} et Pokédex
          </p>
        </div>

        {ladderState.status === 'loading' ? (
          <p className="small" data-testid="ranks-ladder-loading">
            Chargement des classements...
          </p>
        ) : null}
        {ladderState.status === 'disabled' ? (
          <p className="small" data-testid="ranks-ladder-disabled-note">
            Crée au moins un profil local ou active le cloud pour remplir les classements.
          </p>
        ) : null}
        {ladderState.status === 'error' ? (
          <p className="error" role="alert" data-testid="ranks-ladder-error">
            Impossible de charger les classements pour le moment.
          </p>
        ) : null}

        <div className="ranks-ladder-grid">
          <article className="ranks-ladder-card">
            <h3>Meilleur rang {PRIMARY_MATCH_MODE.toUpperCase()}</h3>
            <ol className="ranks-ladder-list" data-testid="ranks-rank-ladder">
              {renderLadderRows(
                ladderState.rankEntries,
                'Aucun rang publié pour le moment.',
                (entry) => formatDisplayRankLabel(entry.peakRankLabel),
              )}
            </ol>
          </article>

          <article className="ranks-ladder-card">
            <h3>Pokémon capturés</h3>
            <ol className="ranks-ladder-list" data-testid="ranks-owned-ladder">
              {renderLadderRows(
                ladderState.ownedEntries,
                'Aucune collection publiée pour le moment.',
                (entry) => formatOwnedPokemonCount(entry.ownedCardsCount),
              )}
            </ol>
          </article>
        </div>
      </section>

      <div className="actions">
        <Link className="button button-primary" to="/setup">
          Lancer un match
        </Link>
        <Link className="button" to="/home">
          Accueil
        </Link>
      </div>
    </section>
  )
}
