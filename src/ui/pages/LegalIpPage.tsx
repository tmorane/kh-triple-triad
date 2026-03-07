import { Link } from 'react-router-dom'

const RIGHTS_OWNERS = 'Nintendo, Game Freak, Creatures et The Pokemon Company'

export function LegalIpPage() {
  return (
    <section className="panel legal-ip-panel">
      <h1>Mentions IP</h1>

      <article className="legal-ip-card" data-testid="legal-ip-rights-owner">
        <h2>Propriete intellectuelle</h2>
        <p>
          Les noms, personnages, visuels, marques et univers Pokemon appartiennent a <strong>{RIGHTS_OWNERS}</strong>.
        </p>
        <p>
          Ce projet est un fan game non officiel et non affilie. Aucune approbation, sponsorship ou partenariat n est revendique.
        </p>
      </article>

      <article className="legal-ip-card" data-testid="legal-ip-non-commercial">
        <h2>Usage non commercial</h2>
        <p>
          <strong>Aucune monetisation:</strong> pas de vente, pas de pub, pas de microtransactions, pas de paywall, pas de revente d assets.
        </p>
      </article>

      <article className="legal-ip-card" data-testid="legal-ip-takedown">
        <h2>Retrait sous 48h</h2>
        <p>
          En cas de demande d un ayant droit, le contenu concerne sera desactive ou retire sous <strong>48h</strong> maximum.
        </p>
      </article>

      <div className="actions">
        <Link className="button button-primary" to="/">
          Home
        </Link>
        <Link className="button" to="/setup">
          Go to Match Setup
        </Link>
      </div>
    </section>
  )
}
