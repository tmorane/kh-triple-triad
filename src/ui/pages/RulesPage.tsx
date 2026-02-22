import { Link } from 'react-router-dom'

export function RulesPage() {
  return (
    <section className="panel">
      <h1>Rules</h1>
      <ul className="rule-copy">
        <li>
          <strong>Open:</strong> Both players can see each other's hands.
        </li>
        <li>
          <strong>Same:</strong> If your placed card matches two or more adjacent enemy sides exactly, those cards
          flip. Combo flips then continue with normal capture rules.
        </li>
        <li>
          <strong>Plus:</strong> If your placed card and adjacent enemy sides form equal sums on two or more sides,
          those cards flip. Combo flips then continue with normal capture rules.
        </li>
      </ul>

      <div className="actions">
        <Link className="button button-primary" to="/setup">
          Go to Match Setup
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
