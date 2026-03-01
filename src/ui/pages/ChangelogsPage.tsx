import { Link } from 'react-router-dom'
import { changelogEntries } from './changelogEntries'

export function ChangelogsPage() {
  return (
    <section className="panel changelogs-panel">
      <div className="changelogs-head">
        <h1>Changelogs</h1>
        <p className="small" data-testid="changelogs-release-count">
          {changelogEntries.length} versions publiees
        </p>
      </div>

      <p className="small">
        Pour chaque nouvelle version, ajoute une entree en haut de <code>src/ui/pages/changelogEntries.ts</code>.
      </p>

      <div className="changelog-list" aria-label="Historique des versions">
        {changelogEntries.map((entry) => (
          <article className="changelog-card" key={entry.version} data-testid={`changelog-release-${entry.version}`}>
            <header className="changelog-card__head">
              <h2>{entry.version}</h2>
              <p className="small">{entry.date}</p>
            </header>

            <section>
              <h3>Infos</h3>
              <ul>
                {entry.infos.map((item) => (
                  <li key={`${entry.version}-infos-${item}`}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3>Nouveautes</h3>
              <ul>
                {entry.nouveautes.map((item) => (
                  <li key={`${entry.version}-nouveautes-${item}`}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3>Changements</h3>
              <ul>
                {entry.changements.map((item) => (
                  <li key={`${entry.version}-changements-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          </article>
        ))}
      </div>

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
