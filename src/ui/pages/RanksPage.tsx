import { Link } from 'react-router-dom'
import { rankedTiers } from '../../domain/progression/ranked'
import { getRankEmblemSrc } from '../rankEmblems'

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

export function RanksPage() {
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

      <div className="actions">
        <Link className="button button-primary" to="/setup">
          Lancer un match
        </Link>
        <Link className="button" to="/">
          Accueil
        </Link>
      </div>
    </section>
  )
}
