import { Link } from 'react-router-dom'

export function PrivacyPage() {
  return (
    <section className="panel privacy-policy-panel">
      <h1>Politique de Confidentialite</h1>

      <article className="privacy-policy-card" data-testid="privacy-local-data">
        <h2>Donnees locales</h2>
        <p>
          Le jeu fonctionne sans compte. Aucune adresse email ni mot de passe ne sont demandes dans cette version.
        </p>
      </article>

      <article className="privacy-policy-card" data-testid="privacy-profile-data">
        <h2>Donnees de progression</h2>
        <p>
          Le profil (or, cartes, decks, succes, rangs et options) est enregistre localement dans ton navigateur.
        </p>
      </article>

      <article className="privacy-policy-card" data-testid="privacy-third-parties">
        <h2>Services tiers</h2>
        <p>
          Les outils de generation d images sont reserves au developpement et ne font pas partie de l experience joueur.
        </p>
      </article>

      <article className="privacy-policy-card" data-testid="privacy-rights">
        <h2>Suppression et export</h2>
        <p>
          Tu peux reinitialiser le profil local depuis la page Compte. La suppression efface les donnees de jeu stockees dans ce
          navigateur.
        </p>
      </article>

      <div className="actions">
        <Link className="button button-primary" to="/account">
          Ouvrir le compte
        </Link>
        <Link className="button" to="/legal">
          Mentions IP
        </Link>
      </div>
    </section>
  )
}
