import { Link } from 'react-router-dom'

const featureLinks = [
  { label: 'Mode histoire', to: '/story' },
  { label: 'Duel 3x3', to: '/setup' },
  { label: 'Pokédex', to: '/pokedex' },
  { label: 'Boosters', to: '/packs' },
]

export function LandingPage() {
  return (
    <div className="landing-page">
      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <span className="landing-kicker">Tout ce qui est déjà dans le jeu</span>
            <h1>PokeTriad</h1>
            <p>
              Lance une partie, avance dans l’histoire, complète ton Pokédex et ouvre des boosters pour renforcer ton
              deck. Tout est pensé pour enchaîner vite: jouer, récupérer de nouvelles cartes, puis retenter mieux.
            </p>
            <div className="landing-hero__actions">
              <Link className="button button-primary landing-primary-action" to="/setup">
                Lancer une partie
              </Link>
              <Link className="button landing-secondary-action" to="/story">
                Explorer l’histoire
              </Link>
            </div>
          </div>

          <div className="landing-hero__media">
            <figure className="landing-ingame-preview">
              <img src="/ui/landing/ingame-board-preview.png" alt="Partie PokeTriad en cours sur un plateau 3x3" />
            </figure>
          </div>
        </section>

        <section className="landing-demo-strip" aria-label="Modules disponibles">
          {featureLinks.map((feature) => (
            <Link key={feature.to} to={feature.to}>
              {feature.label}
            </Link>
          ))}
        </section>

        <section className="landing-showcase" aria-labelledby="landing-showcase-title">
          <div className="landing-section-head">
            <span className="landing-kicker">Le jeu, pas le blabla</span>
            <h2 id="landing-showcase-title">Chaque bloc ouvre une vraie partie de l’app</h2>
            <p>Le but est simple: donner envie de cliquer parce qu’on comprend immédiatement ce qu’il y a à tester.</p>
          </div>

          <div className="landing-showcase-grid">
            <article className="landing-demo-panel landing-demo-panel--story">
              <div className="landing-demo-panel__copy">
                <span className="landing-demo-panel__eyebrow">Mode histoire</span>
                <h3>Une route, des dresseurs, des duels à enchaîner</h3>
                <p>
                  Tu avances sur les cartes de la Gen 1, tu croises des adversaires, puis le duel prend le relais. C’est
                  le fil rouge du jeu, pas un menu décoratif.
                </p>
                <Link className="landing-inline-link" to="/story">
                  Ouvrir le mode histoire
                </Link>
              </div>
              <div className="landing-story-demo" aria-hidden="true">
                <img src="/story/gen1/pallet-town.png" alt="" />
                <img src="/story/gen1/route-1.png" alt="" />
              </div>
            </article>

            <article className="landing-demo-panel landing-demo-panel--battle">
              <div className="landing-demo-panel__copy">
                <span className="landing-demo-panel__eyebrow">Ingame</span>
                <h3>Le coeur du jeu: lire la grille et retourner la table</h3>
                <p>
                  Cinq cartes, un plateau 3x3, des valeurs sur chaque côté. Tu gagnes rarement parce que ta carte est
                  plus forte; tu gagnes parce qu’elle est posée au bon endroit.
                </p>
                <Link className="landing-inline-link" to="/setup">
                  Lancer un duel
                </Link>
              </div>
              <div className="landing-mode-demo" aria-hidden="true">
                <img src="/modes/mode-3x3-normal-new.webp" alt="" />
                <img src="/modes/mode-3x3-ranked-new.webp" alt="" />
              </div>
            </article>

            <article className="landing-demo-panel landing-demo-panel--pokedex">
              <div className="landing-demo-panel__copy">
                <span className="landing-demo-panel__eyebrow">Pokédex</span>
                <h3>La collection sert vraiment tes decks</h3>
                <p>
                  Les cartes ne sont pas là pour remplir une vitrine. Tu compares les raretés, les éléments et les
                  valeurs avant de construire un deck qui tient en duel.
                </p>
                <Link className="landing-inline-link" to="/pokedex">
                  Voir le Pokédex
                </Link>
              </div>
              <div className="landing-pokedex-demo" aria-hidden="true">
                <div>
                  <strong>251</strong>
                  <span>cartes</span>
                </div>
                <div>
                  <strong>5</strong>
                  <span>raretés</span>
                </div>
                <img src="/packs/legendary-focus-pack.svg" alt="" />
              </div>
            </article>

            <article className="landing-demo-panel landing-demo-panel--packs">
              <div className="landing-demo-panel__copy">
                <span className="landing-demo-panel__eyebrow">Boosters</span>
                <h3>Ouvre des packs, améliore ta main, recommence plus malin</h3>
                <p>
                  Les boosters alimentent la collection et changent tes options de deck. Rare, épique, légendaire: la
                  boucle est lisible, rapide, et elle pousse à relancer.
                </p>
                <Link className="landing-inline-link" to="/packs">
                  Ouvrir les boosters
                </Link>
              </div>
              <div className="landing-pack-demo" aria-hidden="true">
                <img src="/packs/rare-pack.svg" alt="" />
                <img src="/packs/epic-pack.svg" alt="" />
                <img src="/packs/legendary-pack.svg" alt="" />
              </div>
            </article>
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="landing-final-title">
          <h2 id="landing-final-title">La meilleure façon de comprendre, c’est de jouer. Lance un duel, puis reviens ouvrir un booster.</h2>
          <div className="landing-hero__actions">
            <Link className="button button-primary landing-primary-action" to="/setup">
              Jouer maintenant
            </Link>
            <Link className="button landing-secondary-action" to="/pokedex">
              Parcourir les cartes
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
