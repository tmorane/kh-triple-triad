import { Link } from 'react-router-dom'
import { rankedTiers } from '../../domain/progression/ranked'

const divisionLabelByTierType = {
  withDivisions: 'Divisions IV, III, II, I',
  apex: 'Apex tier (no divisions)',
} as const

const rankedRules = [
  'Win streak LP: +20 / +25 / +30 LP',
  'Loss streak LP: -20 / -25 / -30 LP',
  'Draw: 0 LP',
  'Promotion at 100 LP with carry',
  'Demotion shield: 3 losses after promotion',
]

export function RanksPage() {
  return (
    <section className="panel ranks-panel">
      <div className="ranks-headline">
        <h1>Ranks</h1>
        <p className="small">Combat ladder V1 (ranked queue only)</p>
      </div>

      <p className="ranks-open-only-note" data-testid="ranks-open-only-note">
        Ranked queue always uses Open only.
      </p>

      <div className="ranks-grid" aria-label="Rank tiers">
        {rankedTiers.map((tier) => (
          <article className="ranks-tier-card" data-testid={`ranks-tier-${tier.id}`} key={tier.id}>
            <img src={`/ranks/${tier.id}.svg`} alt={`${tier.name} rank emblem`} className="ranks-tier-emblem" />
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
