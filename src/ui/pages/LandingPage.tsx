import { Link } from 'react-router-dom'

const previewCards = [
  { name: 'Pikachu', src: '/splashart/Pikachu.webp', value: '8' },
  { name: 'Dracaufeu', src: '/splashart/Dracaufeu.webp', value: 'A' },
  { name: 'Tortank', src: '/splashart/Tortank.webp', value: '7' },
  { name: 'Mewtwo', src: '/splashart/Mewtwo.webp', value: '9' },
]

const reasons = [
  {
    title: 'Une partie en deux minutes',
    text: 'Tu poses une carte, tu retournes une ligne, tu relances parce que tu sais exactement où tu as merdé.',
  },
  {
    title: 'Des decks qui ont du caractère',
    text: 'Types, synergies, combos, raretés: assez simple pour tester vite, assez profond pour optimiser.',
  },
  {
    title: 'Un vrai fil de progression',
    text: 'Packs, Pokédex, missions, rangs et récompenses gardent chaque duel utile.',
  },
]

const modes = [
  {
    title: '3x3 classique',
    text: 'Le format nerveux pour apprendre le rythme et punir les placements faibles.',
    src: '/modes/mode-3x3-normal-new.webp',
  },
  {
    title: '3x3 classé',
    text: 'Même grille, moins de pitié. Tu gagnes des LP ou tu découvres l’humilité.',
    src: '/modes/mode-3x3-ranked-new.webp',
  },
]

export function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav" aria-label="Navigation landing">
        <Link className="landing-brand" to="/">
          KH Triple Triad
        </Link>
        <nav className="landing-nav__links" aria-label="Navigation rapide">
          <Link to="/rules">Règles</Link>
          <Link to="/home">Console</Link>
          <Link className="landing-nav__cta" to="/setup">
            Tester
          </Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__media" aria-hidden="true">
            <div className="landing-board-preview">
              <div className="landing-board-preview__grid">
                {previewCards.map((card, index) => (
                  <article className={`landing-preview-card landing-preview-card--${index + 1}`} key={card.name}>
                    <img src={card.src} alt="" />
                    <strong>{card.value}</strong>
                    <span>{card.name}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="landing-hero__copy">
            <h1>KH Triple Triad</h1>
            <p>
              Le duel de cartes tactique qui se joue en deux minutes et se rejoue toute la soirée. Pose, retourne,
              collectionne, grimpe.
            </p>
            <div className="landing-hero__actions">
              <Link className="button button-primary landing-primary-action" to="/setup">
                Tester maintenant
              </Link>
              <Link className="button landing-secondary-action" to="/rules">
                Voir les règles
              </Link>
            </div>
          </div>
        </section>

        <section className="landing-reasons" aria-labelledby="landing-reasons-title">
          <div className="landing-section-head">
            <h2 id="landing-reasons-title">Pourquoi tu vas relancer une partie</h2>
            <p>Parce que le jeu comprend le meilleur piège: une défaite qui ressemble à une revanche facile.</p>
          </div>
          <div className="landing-reason-grid">
            {reasons.map((reason, index) => (
              <article className="landing-reason" key={reason.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{reason.title}</h3>
                <p>{reason.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-modes" aria-labelledby="landing-modes-title">
          <div className="landing-section-head">
            <h2 id="landing-modes-title">Choisis ton duel</h2>
            <p>Commence tranquille, puis va chercher le classé quand tu sens que le cerveau chauffe.</p>
          </div>
          <div className="landing-mode-grid">
            {modes.map((mode) => (
              <article className="landing-mode" key={mode.title}>
                <img src={mode.src} alt="" />
                <div>
                  <h3>{mode.title}</h3>
                  <p>{mode.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="landing-final-title">
          <h2 id="landing-final-title">Une grille, neuf cartes, zéro excuse.</h2>
          <Link className="button button-primary landing-primary-action" to="/setup">
            Lancer un test
          </Link>
        </section>
      </main>
    </div>
  )
}
