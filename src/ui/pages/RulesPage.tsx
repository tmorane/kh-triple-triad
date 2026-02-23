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

      <section className="rule-faq" data-testid="rules-faq">
        <h2>FAQ - Synergies & Missions</h2>
        <dl className="rule-faq-list">
          <div>
            <dt>What does primary synergy do?</dt>
            <dd>
              <strong>R1 Avant-garde (Obscur):</strong> On your first move only, your placed card gets <code>+1</code> on all 4
              sides.
            </dd>
            <dd>
              <strong>R2 Coin Expert (Psy):</strong> If you place in a corner, you get <code>+1</code> on the active sides of that
              corner.
            </dd>
            <dd>
              <strong>R7 Combo Bounty (Combat):</strong> Each Same/Plus trigger gives <code>+3 gold</code> (cap <code>+12</code> per
              match).
            </dd>
            <dd>
              <strong>R8 Victoire Propre (Nature):</strong> If you win by <code>2+</code> points, you gain <code>+10 gold</code>.
            </dd>
          </div>

          <div>
            <dt>What does secondary synergy do?</dt>
            <dd>
              No gameplay impact on flips/captures. It only affects progression/economy.
            </dd>
            <dd>
              <strong>R10 Mission Link:</strong> On player victory with secondary active, missions gain <code>+1</code> bonus progress.
            </dd>
            <dd>
              You also gain <code>+5 gold</code> once per winning match.
            </dd>
            <dd>
              Secondary is only available for <code>Obscur</code>, <code>Psy</code>, and <code>Combat</code>.
            </dd>
          </div>
        </dl>
      </section>

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
